"""Expert tools service: scanner, signals, calendar, recommendations, alert workflows."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Tuple

from .database import Database
from .reports import AnalyticsEngine
from .utils import norm, now_iso, parse_date, to_int, to_num


def _today() -> date:
    return datetime.now(timezone.utc).date()


def _today_iso() -> str:
    return _today().isoformat()


def _next_occurrence(base: date, frequency: str, *, today: date | None = None) -> date:
    cursor = base
    now = today or _today()
    frequency = norm(frequency, strip_accents=True)
    while cursor < now:
        if "week" in frequency or "tydz" in frequency:
            cursor += timedelta(days=7)
        elif "quarter" in frequency or "kwart" in frequency:
            cursor += timedelta(days=91)
        else:
            cursor += timedelta(days=30)
    return cursor


@dataclass
class ScannerFilters:
    min_score: float = 0.0
    max_risk: float = 10.0
    sector: str = ""
    min_price: float = 0.0
    portfolio_id: str = ""

    @classmethod
    def from_payload(cls, payload: Dict[str, Any]) -> "ScannerFilters":
        return cls(
            min_score=to_num(payload.get("minScore")),
            max_risk=max(1.0, min(10.0, to_num(payload.get("maxRisk")) or 10.0)),
            sector=str(payload.get("sector") or "").strip(),
            min_price=max(0.0, to_num(payload.get("minPrice"))),
            portfolio_id=str(payload.get("portfolioId") or "").strip(),
        )


class ExpertToolsService:
    def __init__(self, database: Database):
        self.database = database

    def scanner(self, filters_payload: Dict[str, Any] | None = None) -> Dict[str, Any]:
        filters = ScannerFilters.from_payload(filters_payload or {})
        state = self.database.get_state()
        metrics = AnalyticsEngine(state, portfolio_id=filters.portfolio_id).metrics
        quotes = self.database.get_quotes([item.get("ticker", "") for item in state.get("assets", [])])
        quote_map = {str(item["ticker"]).upper(): item for item in quotes}
        holdings_map = {row.asset_id: row for row in metrics["holdings"]}

        items = []
        for asset in state.get("assets", []):
            ticker = str(asset.get("ticker", "")).upper()
            if not ticker:
                continue
            quote = quote_map.get(ticker)
            price = to_num(quote["price"] if quote else asset.get("currentPrice"))
            risk = to_num(asset.get("risk") or 5)
            sector = str(asset.get("sector") or "")
            tags = [str(tag) for tag in asset.get("tags") or []]
            holding = holdings_map.get(asset.get("id", ""))
            value = to_num(holding.value if holding else 0.0)
            share = to_num(holding.share if holding else 0.0)
            unrealized_pct = to_num(holding.unrealized_pct if holding else 0.0)

            score = self._scanner_score(
                price=price,
                risk=risk,
                share=share,
                unrealized_pct=unrealized_pct,
            )
            signal = self._scanner_signal(score=score, risk=risk, unrealized_pct=unrealized_pct, share=share)

            if score < filters.min_score:
                continue
            if risk > filters.max_risk:
                continue
            if filters.sector and norm(filters.sector, strip_accents=True) not in norm(
                sector, strip_accents=True
            ):
                continue
            if price < filters.min_price:
                continue

            items.append(
                {
                    "ticker": ticker,
                    "name": str(asset.get("name") or ""),
                    "type": str(asset.get("type") or ""),
                    "price": price,
                    "currency": str((quote or {}).get("currency") or asset.get("currency") or state["meta"]["baseCurrency"]),
                    "risk": risk,
                    "sector": sector or "-",
                    "industry": str(asset.get("industry") or "-"),
                    "share": share,
                    "positionValue": value,
                    "unrealizedPct": unrealized_pct,
                    "score": score,
                    "signal": signal["signal"],
                    "signalReason": signal["reason"],
                }
            )
        items.sort(key=lambda row: row["score"], reverse=True)
        return {
            "filters": {
                "minScore": filters.min_score,
                "maxRisk": filters.max_risk,
                "sector": filters.sector,
                "minPrice": filters.min_price,
                "portfolioId": filters.portfolio_id,
            },
            "items": items,
            "generatedAt": now_iso(),
        }

    def signals(self, *, portfolio_id: str = "") -> Dict[str, Any]:
        state = self.database.get_state()
        metrics = AnalyticsEngine(state, portfolio_id=portfolio_id).metrics
        rows = []
        for holding in metrics["holdings"]:
            signal, confidence, reason = self._signal_for_holding(holding)
            rows.append(
                {
                    "ticker": holding.ticker,
                    "name": holding.name,
                    "signal": signal,
                    "confidence": confidence,
                    "reason": reason,
                    "risk": holding.risk,
                    "share": holding.share,
                    "unrealizedPct": holding.unrealized_pct,
                    "positionValue": holding.value,
                }
            )
        rows.sort(key=lambda row: (row["signal"], -row["confidence"]))
        return {"portfolioId": portfolio_id, "signals": rows, "generatedAt": now_iso()}

    def calendar(self, *, days: int = 60, portfolio_id: str = "") -> Dict[str, Any]:
        state = self.database.get_state()
        days = max(1, min(365, to_int(days, 60)))
        today = _today()
        end = today + timedelta(days=days)

        events: List[Dict[str, Any]] = []

        # Liabilities due dates
        for liability in state.get("liabilities", []):
            due_raw = str(liability.get("dueDate") or "")
            if not due_raw:
                continue
            due = parse_date(due_raw, default=today)
            if due < today or due > end:
                continue
            days_left = (due - today).days
            events.append(
                {
                    "date": due.isoformat(),
                    "type": "Zobowiązanie",
                    "title": f"Termin: {liability.get('name', 'Zobowiązanie')}",
                    "priority": "Wysoki" if days_left <= 7 else "Średni",
                    "source": "liabilities",
                    "details": f"Kwota {round(to_num(liability.get('amount')), 2)} {liability.get('currency', '')}",
                }
            )

        # Recurring operations next occurrence
        for recurring in state.get("recurringOps", []):
            if portfolio_id and recurring.get("portfolioId") != portfolio_id:
                continue
            start = parse_date(recurring.get("startDate"), default=today)
            next_date = _next_occurrence(start, str(recurring.get("frequency") or "monthly"), today=today)
            if next_date < today or next_date > end:
                continue
            events.append(
                {
                    "date": next_date.isoformat(),
                    "type": "Operacja cykliczna",
                    "title": f"{recurring.get('name', 'Operacja')} ({recurring.get('type', '')})",
                    "priority": "Średni",
                    "source": "recurring",
                    "details": f"Kwota {round(to_num(recurring.get('amount')), 2)}",
                }
            )

        # Synthetic company calendar for held equities (quarterly placeholders)
        metrics = AnalyticsEngine(state, portfolio_id=portfolio_id).metrics
        for holding in metrics["holdings"]:
            if norm(holding.asset_type, strip_accents=True) not in {"akcja", "etf", "fundusz", "inny"}:
                continue
            for offset, label in [(15, "Raport okresowy"), (45, "Dywidenda (szacunek)")]:
                event_date = today + timedelta(days=offset)
                if event_date > end:
                    continue
                events.append(
                    {
                        "date": event_date.isoformat(),
                        "type": "Kalendarium spółek",
                        "title": f"{holding.ticker}: {label}",
                        "priority": "Niski" if label.startswith("Raport") else "Średni",
                        "source": "synthetic",
                        "details": "Wydarzenie wygenerowane automatycznie na bazie pozycji.",
                    }
                )

        events.sort(key=lambda row: (row["date"], row["priority"]))
        return {"portfolioId": portfolio_id, "days": days, "events": events, "generatedAt": now_iso()}

    def recommendations(self, *, portfolio_id: str = "") -> Dict[str, Any]:
        state = self.database.get_state()
        metrics = AnalyticsEngine(state, portfolio_id=portfolio_id).metrics
        rows: List[Dict[str, Any]] = []

        if not metrics["holdings"]:
            rows.append(
                {
                    "category": "Portfel",
                    "priority": "Wysoki",
                    "title": "Brak aktywnych pozycji",
                    "action": "Dodaj pierwsze pozycje lub importuj historię brokera.",
                    "impact": "Bez pozycji raporty ryzyka i sygnały AT są ograniczone.",
                }
            )

        if metrics["holdings"]:
            top = sorted(metrics["holdings"], key=lambda row: row.share, reverse=True)[0]
            if top.share > 35:
                rows.append(
                    {
                        "category": "Dywersyfikacja",
                        "priority": "Wysoki",
                        "title": f"Koncentracja na {top.ticker} ({top.share:.1f}%)",
                        "action": "Rozważ obniżenie udziału do <25% i przeniesienie części środków.",
                        "impact": "Zmniejszenie ryzyka pojedynczej pozycji.",
                    }
                )

        cash_ratio = (metrics["cashTotal"] / metrics["netWorth"] * 100.0) if metrics["netWorth"] else 0.0
        if cash_ratio > 30:
            rows.append(
                {
                    "category": "Alokacja",
                    "priority": "Średni",
                    "title": f"Wysoki udział gotówki ({cash_ratio:.1f}%)",
                    "action": "Rozważ stopniowe inwestowanie gotówki w kilku transzach.",
                    "impact": "Lepsze wykorzystanie kapitału i redukcja cash drag.",
                }
            )

        liabilities_ratio = (
            metrics["liabilitiesTotal"] / metrics["netWorth"] * 100.0 if metrics["netWorth"] else 0.0
        )
        if liabilities_ratio > 40:
            rows.append(
                {
                    "category": "Dźwignia",
                    "priority": "Wysoki",
                    "title": f"Wysokie zobowiązania względem majątku ({liabilities_ratio:.1f}%)",
                    "action": "Rozważ redukcję zadłużenia lub zwiększenie bufora gotówkowego.",
                    "impact": "Niższe ryzyko płynności i obsługi zobowiązań.",
                }
            )

        avg_risk = (
            sum(row.risk * row.share for row in metrics["holdings"]) / 100.0 if metrics["holdings"] else 0.0
        )
        if avg_risk >= 7:
            rows.append(
                {
                    "category": "Ryzyko",
                    "priority": "Średni",
                    "title": f"Podwyższone ryzyko portfela (avg {avg_risk:.2f}/10)",
                    "action": "Przesuń część pozycji do niższego ryzyka lub hedguj ekspozycję.",
                    "impact": "Mniejsza zmienność i drawdown.",
                }
            )

        if metrics["holdings"] and not state.get("alerts"):
            rows.append(
                {
                    "category": "Workflow",
                    "priority": "Średni",
                    "title": "Brak aktywnych alertów cenowych",
                    "action": "Dodaj alerty dla głównych pozycji i uruchamiaj workflow alertów.",
                    "impact": "Szybsza reakcja na zdarzenia rynkowe.",
                }
            )

        if not rows:
            rows.append(
                {
                    "category": "Status",
                    "priority": "Niski",
                    "title": "Brak krytycznych rekomendacji",
                    "action": "Kontynuuj monitoring i regularny przegląd struktury portfela.",
                    "impact": "Utrzymanie obecnej jakości zarządzania.",
                }
            )

        return {"portfolioId": portfolio_id, "recommendations": rows, "generatedAt": now_iso()}

    def run_alert_workflow(self, *, portfolio_id: str = "") -> Dict[str, Any]:
        state = self.database.get_state()
        assets = {row.get("id", ""): row for row in state.get("assets", [])}
        quotes = self.database.get_quotes([row.get("ticker", "") for row in state.get("assets", [])])
        quote_map = {str(row.get("ticker", "")).upper(): row for row in quotes}

        triggered = []
        waiting = []
        actions = []
        updated = False
        for alert in state.get("alerts", []):
            asset = assets.get(alert.get("assetId", ""))
            if not asset:
                continue
            ticker = str(asset.get("ticker", "")).upper()
            quote = quote_map.get(ticker, {})
            price = to_num(quote.get("price") if quote else asset.get("currentPrice"))
            target = to_num(alert.get("targetPrice"))
            direction = str(alert.get("direction") or "gte").lower()

            hit = price >= target if direction == "gte" else price <= target
            row = {
                "alertId": alert.get("id", ""),
                "ticker": ticker,
                "assetName": str(asset.get("name") or ""),
                "direction": direction,
                "targetPrice": target,
                "currentPrice": price,
                "currency": str(quote.get("currency") or asset.get("currency") or state["meta"]["baseCurrency"]),
                "status": "TRIGGERED" if hit else "WAITING",
                "checkedAt": now_iso(),
            }
            if hit:
                alert["lastTriggerAt"] = row["checkedAt"]
                updated = True
                triggered.append(row)
                actions.append(self._alert_action_from_row(row))
                self.database.log_alert_event(
                    alert_id=row["alertId"],
                    asset_id=str(asset.get("id") or ""),
                    ticker=ticker,
                    direction=direction,
                    target_price=target,
                    current_price=price,
                    status="TRIGGERED",
                    message=row["status"],
                    event_time=row["checkedAt"],
                )
            else:
                waiting.append(row)

        if updated:
            self.database.replace_state(state)

        return {
            "portfolioId": portfolio_id,
            "summary": {
                "totalAlerts": len(state.get("alerts", [])),
                "triggered": len(triggered),
                "waiting": len(waiting),
            },
            "triggered": triggered,
            "waiting": waiting,
            "actions": actions,
            "history": self.database.list_alert_events(limit=50),
            "generatedAt": now_iso(),
        }

    def alert_history(self, *, limit: int = 100) -> Dict[str, Any]:
        return {"history": self.database.list_alert_events(limit=max(1, min(limit, 500)))}

    def _scanner_score(self, *, price: float, risk: float, share: float, unrealized_pct: float) -> float:
        quality = max(0.0, 10.0 - risk) * 6.5
        momentum = max(-20.0, min(20.0, unrealized_pct)) * 2.0 + 40.0
        diversification_penalty = max(0.0, share - 20.0) * 1.2
        liquidity = min(20.0, max(0.0, price / 10.0))
        score = quality + momentum + liquidity - diversification_penalty
        return max(0.0, round(score, 2))

    def _scanner_signal(self, *, score: float, risk: float, unrealized_pct: float, share: float) -> Dict[str, str]:
        if share > 35.0:
            return {"signal": "REBALANCE", "reason": "Pozycja dominuje w portfelu."}
        if unrealized_pct <= -8.0:
            return {"signal": "RISK_OFF", "reason": "Znaczna strata niezrealizowana."}
        if risk >= 8.0 and score < 50.0:
            return {"signal": "REDUCE", "reason": "Wysokie ryzyko przy słabym score."}
        if score >= 75.0:
            return {"signal": "ACCUMULATE", "reason": "Mocny score i akceptowalny profil ryzyka."}
        return {"signal": "HOLD", "reason": "Brak silnego sygnału do zmiany."}

    def _signal_for_holding(self, holding) -> Tuple[str, float, str]:
        if holding.share > 35.0:
            return ("REBALANCE", 0.87, "Pozycja przekracza 35% portfela.")
        if holding.unrealized_pct <= -12.0:
            return ("CUT_LOSS", 0.9, "Strata przekroczyła -12%.")
        if holding.unrealized_pct >= 18.0 and holding.risk >= 6:
            return ("TAKE_PROFIT", 0.82, "Wysoki zysk na aktywie o podwyższonym ryzyku.")
        if holding.risk >= 8 and holding.share >= 15:
            return ("REDUCE_RISK", 0.78, "Duży udział waloru o wysokim ryzyku.")
        if -3.0 <= holding.unrealized_pct <= 4.0 and holding.risk <= 5:
            return ("ACCUMULATE", 0.65, "Niska zmienność i umiarkowane ryzyko.")
        return ("HOLD", 0.55, "Brak kryteriów dla silniejszego sygnału.")

    def _alert_action_from_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        direction = row["direction"]
        ticker = row["ticker"]
        current = row["currentPrice"]
        target = row["targetPrice"]
        if direction == "gte":
            title = f"{ticker}: poziom górny osiągnięty"
            action = "Rozważ realizację części zysku lub podniesienie trailing stop."
            priority = "Wysoki"
        else:
            title = f"{ticker}: poziom dolny osiągnięty"
            action = "Sprawdź setup obronny, redukcję pozycji lub plan dokupienia."
            priority = "Wysoki"
        delta_pct = ((current - target) / target * 100.0) if target else 0.0
        return {
            "title": title,
            "priority": priority,
            "action": action,
            "deltaPct": round(delta_pct, 2),
        }
