"""Reporting and analytics service for MyFund Solo."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
import math
from statistics import fmean
from typing import Any, Callable, Dict, Iterable, List, Optional, Tuple
import unicodedata


REPORT_FEATURES: List[str] = [
    "Skład i struktura",
    "Statystyki portfela",
    "Struktura kupna walorów",
    "Zysk per typ inwestycji",
    "Zysk per konto inwestycyjne",
    "Struktura portfela w czasie",
    "Udział walorów per konto",
    "Wartość jednostki w czasie",
    "Zmienność stopy zwrotu",
    "Rolling return w czasie",
    "Drawdown portfela w czasie",
    "Zysk w czasie",
    "Zmiana okresowa w czasie",
    "Wartość inwestycji w czasie",
    "Udział wartości portfeli w czasie",
    "Wartość zobowiązań w czasie",
    "Wartość majątku w czasie",
    "Struktura majątku",
    "Ekspozycja walutowa",
    "Bilans kontraktów",
    "Wkład i wartość",
    "Wkład i zysk",
    "Analiza fundamentalna",
    "Analiza ryzyka",
    "Zarządzanie ryzykiem",
    "Analiza sektorowa i branżowa",
    "Analiza indeksowa",
    "Struktura per tag",
    "Udział kont inwestycyjnych w portfelu",
    "Stopa zwrotu w czasie i benchmark",
    "Udział walorów w czasie",
    "Udział tagów w czasie",
    "Udział kont inwestycyjnych w czasie",
    "Ekspozycja walutowa w czasie",
    "Stopa zwrotu w okresach",
    "Ranking walorów portfela",
    "Porównanie walorów portfela",
    "Analiza dywidend w czasie",
    "Prowizje w czasie",
    "Mapa cieplna portfela",
    "Zamknięte inwestycje - podsumowanie",
    "Zamknięte inwestycje - szczegóły",
    "Zamknięte inwestycje - statystyki",
    "Podsumowanie portfeli",
    "Historia operacji",
    "Podsumowania na e-mail",
    "Limity IKE/IKZE/PPK",
]


def _norm(text: str) -> str:
    raw = str(text or "").strip().lower()
    ascii_text = "".join(
        char
        for char in unicodedata.normalize("NFKD", raw)
        if not unicodedata.combining(char)
    )
    return " ".join(ascii_text.split())


def _contains(text: str, *parts: str) -> bool:
    source = _norm(text)
    return all(_norm(part) in source for part in parts)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _today_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _to_num(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value or "").strip().replace(" ", "").replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return 0.0


def _safe_div(a: float, b: float) -> float:
    return a / b if abs(b) > 1e-12 else 0.0


def _sum(items: Iterable[float]) -> float:
    total = 0.0
    for item in items:
        total += _to_num(item)
    return total


def _format_percent(value: float) -> float:
    if math.isfinite(value):
        return round(value, 4)
    return 0.0


@dataclass
class HoldingsRow:
    asset_id: str
    ticker: str
    name: str
    asset_type: str
    currency: str
    risk: float
    sector: str
    industry: str
    benchmark: str
    tags: List[str]
    qty: float
    price: float
    value: float
    cost: float
    unrealized: float
    unrealized_pct: float
    share: float


class AnalyticsEngine:
    def __init__(
        self,
        state: Dict[str, Any],
        *,
        portfolio_id: str = "",
        until_date: str = "",
        use_current_prices: bool = True,
    ):
        self.state = state
        self.portfolio_id = str(portfolio_id or "")
        self.until_date = str(until_date or "")
        self.use_current_prices = use_current_prices

        self.portfolios = state.get("portfolios", [])
        self.accounts = state.get("accounts", [])
        self.assets = state.get("assets", [])
        self.operations = state.get("operations", [])
        self.liabilities = state.get("liabilities", [])
        self.base_currency = state.get("meta", {}).get("baseCurrency", "PLN")

        self.asset_by_id = {row.get("id", ""): row for row in self.assets}
        self.account_by_id = {row.get("id", ""): row for row in self.accounts}
        self.portfolio_by_id = {row.get("id", ""): row for row in self.portfolios}

        self.metrics = self._compute_metrics()

    def _iter_operations(self) -> Iterable[Dict[str, Any]]:
        rows = []
        for row in self.operations:
            if self.portfolio_id and row.get("portfolioId") != self.portfolio_id:
                continue
            if self.until_date and str(row.get("date", "")) > self.until_date:
                continue
            rows.append(row)
        rows.sort(key=lambda item: (str(item.get("date", "")), str(item.get("createdAt", ""))))
        return rows

    def _compute_metrics(self) -> Dict[str, Any]:
        holdings: Dict[str, Dict[str, float]] = {}
        cash_by_account: Dict[str, float] = defaultdict(float)
        account_stats: Dict[str, Dict[str, float]] = {}
        last_price_by_asset: Dict[str, float] = {}

        realized = 0.0
        dividends = 0.0
        fees = 0.0
        net_contribution = 0.0
        buy_by_asset: Dict[str, Dict[str, float]] = defaultdict(lambda: {"qty": 0.0, "amount": 0.0})
        sales_records: List[Dict[str, Any]] = []
        closed_agg: Dict[str, Dict[str, float]] = defaultdict(
            lambda: {
                "buyQty": 0.0,
                "sellQty": 0.0,
                "buyCost": 0.0,
                "sellValue": 0.0,
                "realizedPL": 0.0,
                "fees": 0.0,
                "trades": 0.0,
            }
        )

        def ensure_holding(asset_id: str) -> Dict[str, float]:
            if asset_id not in holdings:
                holdings[asset_id] = {"qty": 0.0, "cost": 0.0}
            return holdings[asset_id]

        def ensure_account(account_id: str) -> Dict[str, float]:
            key = account_id or "__global"
            if key not in account_stats:
                account_stats[key] = {
                    "cash": 0.0,
                    "buyGross": 0.0,
                    "sellGross": 0.0,
                    "fees": 0.0,
                    "realized": 0.0,
                    "balance": 0.0,
                }
            return account_stats[key]

        def add_cash(account_id: str, amount: float) -> None:
            key = account_id or "__global"
            cash_by_account[key] += amount
            stats = ensure_account(key)
            stats["cash"] += amount
            stats["balance"] += amount

        for op in self._iter_operations():
            op_type = _norm(op.get("type", ""))
            account_id = str(op.get("accountId") or "")
            asset_id = str(op.get("assetId") or "")
            target_asset_id = str(op.get("targetAssetId") or "")

            qty = _to_num(op.get("quantity"))
            target_qty = _to_num(op.get("targetQuantity"))
            price = _to_num(op.get("price"))
            amount = _to_num(op.get("amount"))
            fee = _to_num(op.get("fee"))

            if asset_id and price > 0:
                last_price_by_asset[asset_id] = price

            if _contains(op_type, "kupno") or _contains(op_type, "buy"):
                gross = qty * price if qty and price else abs(amount)
                total = gross + fee
                row = ensure_holding(asset_id)
                row["qty"] += qty
                row["cost"] += total
                add_cash(account_id, -total)
                stats = ensure_account(account_id)
                stats["buyGross"] += gross
                stats["fees"] += fee
                fees += fee
                buy_by_asset[asset_id]["qty"] += qty
                buy_by_asset[asset_id]["amount"] += total
                closed_agg[asset_id]["buyQty"] += qty
                closed_agg[asset_id]["buyCost"] += total
                continue

            if _contains(op_type, "sprzedaz") or _contains(op_type, "sell"):
                row = ensure_holding(asset_id)
                sold_qty = qty if qty > 0 else (_safe_div(abs(amount), price) if price > 0 else 0.0)
                avg_cost = _safe_div(row["cost"], row["qty"]) if row["qty"] > 0 else price
                cost_out = avg_cost * sold_qty
                gross = sold_qty * price if sold_qty and price else abs(amount)
                net_proceeds = amount if amount != 0 else gross
                net_proceeds -= fee
                row["qty"] -= sold_qty
                row["cost"] -= cost_out
                if abs(row["qty"]) < 1e-10:
                    row["qty"] = 0.0
                if abs(row["cost"]) < 1e-10:
                    row["cost"] = 0.0
                add_cash(account_id, net_proceeds)
                stats = ensure_account(account_id)
                stats["sellGross"] += gross
                stats["fees"] += fee
                realized_delta = net_proceeds - cost_out
                stats["realized"] += realized_delta
                realized += realized_delta
                fees += fee
                sales_records.append(
                    {
                        "date": str(op.get("date", "")),
                        "assetId": asset_id,
                        "qty": sold_qty,
                        "price": price,
                        "gross": gross,
                        "fee": fee,
                        "costOut": cost_out,
                        "realizedPL": realized_delta,
                        "currency": str(op.get("currency") or self.base_currency),
                    }
                )
                agg = closed_agg[asset_id]
                agg["sellQty"] += sold_qty
                agg["sellValue"] += net_proceeds
                agg["realizedPL"] += realized_delta
                agg["fees"] += fee
                agg["trades"] += 1
                continue

            if _contains(op_type, "konwers") or _contains(op_type, "conversion"):
                source = ensure_holding(asset_id)
                source_qty = qty
                source_avg = _safe_div(source["cost"], source["qty"]) if source["qty"] > 0 else price
                source_cost_out = source_avg * source_qty
                source["qty"] -= source_qty
                source["cost"] -= source_cost_out

                target = ensure_holding(target_asset_id)
                received = target_qty if target_qty > 0 else source_qty
                target["qty"] += received
                target["cost"] += source_cost_out + fee
                if fee > 0:
                    add_cash(account_id, -fee)
                    ensure_account(account_id)["fees"] += fee
                    fees += fee
                continue

            if _contains(op_type, "dywid") or _contains(op_type, "dividend"):
                add_cash(account_id, amount)
                dividends += amount
                continue

            if _contains(op_type, "prowiz") or _contains(op_type, "commission"):
                fee_amount = fee if fee > 0 else abs(amount)
                add_cash(account_id, -fee_amount)
                ensure_account(account_id)["fees"] += fee_amount
                fees += fee_amount
                continue

            is_contribution = any(
                _contains(op_type, marker)
                for marker in [
                    "operacja gotowkowa",
                    "przelew",
                    "lokata",
                    "pozyczka",
                    "zobowiazanie",
                    "deposit",
                    "withdraw",
                ]
            )
            add_cash(account_id, amount)
            if is_contribution:
                net_contribution += amount
            if fee > 0:
                add_cash(account_id, -fee)
                ensure_account(account_id)["fees"] += fee
                fees += fee

        holdings_list: List[HoldingsRow] = []
        market_value = 0.0
        book_value = 0.0
        by_currency_map: Dict[str, float] = defaultdict(float)
        by_tag_map: Dict[str, float] = defaultdict(float)

        for asset_id, pos in holdings.items():
            qty = pos["qty"]
            cost = pos["cost"]
            if abs(qty) < 1e-12 and abs(cost) < 1e-8:
                continue
            asset = self.asset_by_id.get(asset_id, {})
            ticker = str(asset.get("ticker") or "N/A")
            current = _to_num(asset.get("currentPrice"))
            price = (
                current
                if self.use_current_prices and current > 0
                else _to_num(last_price_by_asset.get(asset_id))
            )
            value = qty * price
            unrealized = value - cost
            unrealized_pct = _safe_div(unrealized, cost) * 100.0 if cost != 0 else 0.0
            row = HoldingsRow(
                asset_id=asset_id,
                ticker=ticker,
                name=str(asset.get("name") or "Usunięty walor"),
                asset_type=str(asset.get("type") or "Inny"),
                currency=str(asset.get("currency") or self.base_currency),
                risk=_to_num(asset.get("risk") or 5.0),
                sector=str(asset.get("sector") or ""),
                industry=str(asset.get("industry") or ""),
                benchmark=str(asset.get("benchmark") or ""),
                tags=list(asset.get("tags") or []),
                qty=qty,
                price=price,
                value=value,
                cost=cost,
                unrealized=unrealized,
                unrealized_pct=unrealized_pct,
                share=0.0,
            )
            holdings_list.append(row)
            market_value += value
            book_value += cost
            by_currency_map[row.currency] += value
            tags = row.tags if row.tags else ["brak-tagu"]
            for tag in tags:
                by_tag_map[str(tag)] += value

        cash_total = _sum(cash_by_account.values())
        for account_id, amount in cash_by_account.items():
            account = self.account_by_id.get(account_id, {})
            currency = str(account.get("currency") or self.base_currency)
            by_currency_map[currency] += amount

        liabilities_total = _sum(_to_num(item.get("amount")) for item in self.liabilities)
        unrealized = market_value - book_value
        total_pl = unrealized + realized + dividends - fees
        net_worth = market_value + cash_total - liabilities_total
        units = max(1.0, round(max(1.0, abs(net_contribution) / 100.0)))
        return_pct = _safe_div(total_pl, abs(net_contribution)) * 100.0 if net_contribution else 0.0

        for row in holdings_list:
            row.share = _safe_div(row.value, market_value) * 100.0 if market_value else 0.0

        by_currency = []
        for currency, value in by_currency_map.items():
            by_currency.append(
                {
                    "currency": currency,
                    "value": value,
                    "share": _safe_div(value, net_worth) * 100.0 if net_worth else 0.0,
                }
            )
        by_currency.sort(key=lambda item: item["value"], reverse=True)

        by_tag = []
        for tag, value in by_tag_map.items():
            by_tag.append(
                {
                    "tag": tag,
                    "value": value,
                    "share": _safe_div(value, market_value) * 100.0 if market_value else 0.0,
                }
            )
        by_tag.sort(key=lambda item: item["value"], reverse=True)

        by_account = []
        for account_id, stats in account_stats.items():
            by_account.append(
                {
                    "accountId": account_id,
                    "name": self._account_name(account_id),
                    "cash": stats["cash"],
                    "buyGross": stats["buyGross"],
                    "sellGross": stats["sellGross"],
                    "fees": stats["fees"],
                    "realized": stats["realized"],
                    "balance": stats["balance"],
                }
            )
        by_account.sort(key=lambda item: item["balance"], reverse=True)

        closed_summary = []
        open_qty_map = {asset_id: pos["qty"] for asset_id, pos in holdings.items()}
        for asset_id, agg in closed_agg.items():
            if agg["sellQty"] <= 0:
                continue
            remaining_qty = open_qty_map.get(asset_id, 0.0)
            asset = self.asset_by_id.get(asset_id, {})
            closed_summary.append(
                {
                    "assetId": asset_id,
                    "ticker": str(asset.get("ticker") or asset_id),
                    "name": str(asset.get("name") or ""),
                    "buyQty": agg["buyQty"],
                    "sellQty": agg["sellQty"],
                    "remainingQty": remaining_qty,
                    "buyCost": agg["buyCost"],
                    "sellValue": agg["sellValue"],
                    "realizedPL": agg["realizedPL"],
                    "fees": agg["fees"],
                    "trades": int(agg["trades"]),
                    "closed": abs(remaining_qty) < 1e-9,
                }
            )
        closed_summary.sort(key=lambda item: item["realizedPL"], reverse=True)
        sales_records.sort(key=lambda item: (item["date"], item["assetId"]), reverse=True)

        return {
            "holdings": holdings_list,
            "marketValue": market_value,
            "bookValue": book_value,
            "cashTotal": cash_total,
            "liabilitiesTotal": liabilities_total,
            "unrealized": unrealized,
            "realized": realized,
            "dividends": dividends,
            "fees": fees,
            "totalPL": total_pl,
            "netWorth": net_worth,
            "netContribution": net_contribution,
            "returnPct": return_pct,
            "units": units,
            "byCurrency": by_currency,
            "byTag": by_tag,
            "byAccount": by_account,
            "buyStructure": buy_by_asset,
            "closedSummary": closed_summary,
            "closedDetails": sales_records,
        }

    def _account_name(self, account_id: str) -> str:
        if not account_id or account_id == "__global":
            return "N/D"
        account = self.account_by_id.get(account_id)
        if account:
            return str(account.get("name") or account_id)
        return account_id


class ReportService:
    def __init__(self, state_provider: Callable[[], Dict[str, Any]]):
        self.state_provider = state_provider

    def catalog(self) -> List[Dict[str, Any]]:
        return [{"name": name} for name in REPORT_FEATURES]

    def metrics(self, *, portfolio_id: str = "") -> Dict[str, Any]:
        state = self.state_provider()
        analytics = AnalyticsEngine(state, portfolio_id=portfolio_id)
        metrics = analytics.metrics
        return {
            "portfolioId": portfolio_id,
            "marketValue": metrics["marketValue"],
            "cashTotal": metrics["cashTotal"],
            "netWorth": metrics["netWorth"],
            "totalPL": metrics["totalPL"],
            "returnPct": metrics["returnPct"],
            "holdingsCount": len(metrics["holdings"]),
        }

    def generate(self, *, report_name: str, portfolio_id: str = "") -> Dict[str, Any]:
        state = self.state_provider()
        report_name = str(report_name or "").strip() or REPORT_FEATURES[0]
        analytics = AnalyticsEngine(state, portfolio_id=portfolio_id)
        metrics = analytics.metrics
        series = self._build_series(state, portfolio_id)
        label = self._portfolio_label(state, portfolio_id)
        info_base = f"{report_name} | Portfel: {label}"

        key = _norm(report_name)

        # 1) Summary / holdings family
        if _contains(key, "historia operacji"):
            return self._report_operations(report_name, state, portfolio_id, info_base)
        if _contains(key, "podsumowanie portfeli"):
            return self._report_portfolios_summary(report_name, state, info_base)
        if _contains(key, "zamkniete inwestycje", "podsumowanie"):
            return self._report_closed_summary(report_name, metrics, info_base)
        if _contains(key, "zamkniete inwestycje", "szczegoly"):
            return self._report_closed_details(report_name, metrics, info_base)
        if _contains(key, "zamkniete inwestycje", "statystyki"):
            return self._report_closed_stats(report_name, metrics, info_base)
        if _contains(key, "sklad i struktura") or _contains(key, "struktura majatku"):
            return self._report_structure(report_name, metrics, info_base)
        if _contains(key, "statystyki portfela"):
            return self._report_stats(report_name, metrics, info_base)
        if _contains(key, "struktura kupna walorow"):
            return self._report_buy_structure(report_name, metrics, info_base)
        if _contains(key, "zysk per typ inwestycji"):
            return self._report_profit_by_type(report_name, metrics, info_base)
        if _contains(key, "zysk per konto inwestycyjne") or _contains(key, "udzial kont inwestycyjnych w portfelu"):
            return self._report_by_account(report_name, metrics, info_base)
        if _contains(key, "ekspozycja walutowa") and not _contains(key, "w czasie"):
            return self._report_currency_exposure(report_name, metrics, info_base)
        if _contains(key, "struktura per tag") or _contains(key, "udzial tagow"):
            return self._report_tags(report_name, metrics, info_base)
        if _contains(key, "ranking walorow portfela") or _contains(key, "porownanie walorow portfela"):
            return self._report_ranking(report_name, metrics, info_base)
        if _contains(key, "analiza fundamentalna") or _contains(key, "analiza ryzyka") or _contains(key, "zarzadzanie ryzykiem"):
            return self._report_risk_fundamental(report_name, metrics, info_base)
        if _contains(key, "analiza sektorowa"):
            return self._report_grouped(
                report_name,
                info_base,
                metrics["holdings"],
                group_key=lambda row: row.sector or "Brak sektora",
                title="Sektor",
            )
        if _contains(key, "analiza indeksowa"):
            return self._report_grouped(
                report_name,
                info_base,
                metrics["holdings"],
                group_key=lambda row: row.benchmark or "Brak benchmarku",
                title="Benchmark",
            )
        if _contains(key, "bilans kontraktow"):
            return self._report_contracts_balance(report_name, metrics, info_base)
        if _contains(key, "wklad i wartosc"):
            return self._report_contribution_value(report_name, metrics, info_base)
        if _contains(key, "wklad i zysk"):
            return self._report_contribution_profit(report_name, metrics, info_base)
        if _contains(key, "limity ike"):
            return self._report_ike_ikze_ppk(report_name, state, portfolio_id, info_base)
        if _contains(key, "podsumowania na e-mail"):
            return self._report_mail_digest(report_name, metrics, info_base)
        if _contains(key, "mapa cieplna portfela"):
            return self._report_heatmap(report_name, metrics, info_base)

        # 2) Time series family
        if _contains(key, "wartosc jednostki w czasie"):
            return self._report_series(
                report_name,
                info_base,
                series,
                value_key="unitValue",
                value_label="Wartość jednostki",
                color="#0d6f5d",
            )
        if _contains(key, "zmiennosc stopy zwrotu"):
            returns = self._period_returns(series, value_key="netWorth")
            return self._report_volatility(report_name, info_base, returns)
        if _contains(key, "rolling return"):
            rolling = self._rolling_returns(series, 5, value_key="netWorth")
            return self._report_generic_series(
                report_name,
                info_base + " | Okno: 5 punktów",
                rolling,
                value_name="Rolling return %",
                color="#14705c",
            )
        if _contains(key, "drawdown"):
            drawdown = self._drawdown(series, value_key="netWorth")
            return self._report_generic_series(
                report_name,
                info_base,
                drawdown,
                value_name="Drawdown %",
                color="#aa2a2a",
            )
        if _contains(key, "zysk w czasie"):
            return self._report_series(
                report_name,
                info_base,
                series,
                value_key="totalPL",
                value_label="Zysk",
                color="#ff7f32",
            )
        if _contains(key, "zmiana okresowa w czasie"):
            returns = self._period_returns(series, value_key="netWorth")
            return self._report_generic_series(
                report_name,
                info_base,
                returns,
                value_name="Zmiana okresowa %",
                color="#ff7f32",
            )
        if _contains(key, "wartosc inwestycji w czasie"):
            return self._report_series(
                report_name,
                info_base,
                series,
                value_key="marketValue",
                value_label="Wartość inwestycji",
                color="#0e7a64",
            )
        if _contains(key, "wartosc zobowiazan w czasie"):
            return self._report_series(
                report_name,
                info_base,
                series,
                value_key="liabilitiesTotal",
                value_label="Wartość zobowiązań",
                color="#995728",
            )
        if _contains(key, "wartosc majatku w czasie"):
            return self._report_series(
                report_name,
                info_base,
                series,
                value_key="netWorth",
                value_label="Wartość majątku",
                color="#0e7a64",
            )
        if _contains(key, "ekspozycja walutowa w czasie"):
            return self._report_currency_time(report_name, info_base, metrics, series)
        if _contains(key, "stopa zwrotu w czasie i benchmark"):
            return self._report_return_and_benchmark(report_name, info_base, state, portfolio_id, series)
        if _contains(key, "stopa zwrotu w okresach"):
            return self._report_returns_by_period(report_name, info_base, series)
        if _contains(key, "analiza dywidend w czasie"):
            return self._report_flows_in_time(
                report_name,
                info_base,
                state,
                portfolio_id,
                marker=("dywid", "dividend"),
                label="Dywidendy",
                color="#ff7f32",
                extractor=lambda op: _to_num(op.get("amount")),
            )
        if _contains(key, "prowizje w czasie"):
            return self._report_flows_in_time(
                report_name,
                info_base,
                state,
                portfolio_id,
                marker=("prowiz", "commission"),
                label="Prowizje",
                color="#995728",
                extractor=lambda op: max(_to_num(op.get("fee")), abs(_to_num(op.get("amount"))) if _contains(_norm(op.get("type")), "prowiz") else 0.0),
            )
        if _contains(key, "udzial wartosci portfeli w czasie"):
            return self._report_portfolio_share_over_time(report_name, info_base, state, series)
        if _contains(key, "struktura portfela w czasie") or _contains(key, "udzial walorow w czasie"):
            return self._report_holdings_over_time(report_name, info_base, metrics, series)
        if _contains(key, "udzial kont inwestycyjnych w czasie"):
            return self._report_accounts_over_time(report_name, info_base, metrics, series)
        if _contains(key, "udzial tagow w czasie"):
            return self._report_tags_time(report_name, info_base, metrics, series)

        # Fallback
        return self._report_structure(report_name, metrics, info_base + " | Fallback raportu")

    def _build_series(self, state: Dict[str, Any], portfolio_id: str) -> List[Dict[str, float]]:
        operations = []
        for op in state.get("operations", []):
            if portfolio_id and op.get("portfolioId") != portfolio_id:
                continue
            operations.append(op)
        dates = sorted({str(op.get("date", ""))[:10] for op in operations if str(op.get("date", "")).strip()})
        output: List[Dict[str, float]] = []
        for date in dates:
            metrics = AnalyticsEngine(
                state,
                portfolio_id=portfolio_id,
                until_date=date,
                use_current_prices=False,
            ).metrics
            output.append(
                {
                    "date": date,
                    "netWorth": metrics["netWorth"],
                    "marketValue": metrics["marketValue"],
                    "cashTotal": metrics["cashTotal"],
                    "liabilitiesTotal": metrics["liabilitiesTotal"],
                    "totalPL": metrics["totalPL"],
                    "returnPct": metrics["returnPct"],
                    "unitValue": _safe_div(metrics["netWorth"], metrics["units"]),
                }
            )
        today = _today_iso()
        current = AnalyticsEngine(state, portfolio_id=portfolio_id, use_current_prices=True).metrics
        if not output or output[-1]["date"] != today:
            output.append(
                {
                    "date": today,
                    "netWorth": current["netWorth"],
                    "marketValue": current["marketValue"],
                    "cashTotal": current["cashTotal"],
                    "liabilitiesTotal": current["liabilitiesTotal"],
                    "totalPL": current["totalPL"],
                    "returnPct": current["returnPct"],
                    "unitValue": _safe_div(current["netWorth"], current["units"]),
                }
            )
        return output

    def _portfolio_label(self, state: Dict[str, Any], portfolio_id: str) -> str:
        if not portfolio_id:
            return "Wszystkie"
        for row in state.get("portfolios", []):
            if row.get("id") == portfolio_id:
                return str(row.get("name") or portfolio_id)
        return portfolio_id

    def _chart(self, labels: List[str], values: List[float], color: str = "#0e7a64") -> Dict[str, Any]:
        return {"labels": labels, "values": values, "color": color}

    def _report_structure(self, report_name: str, metrics: Dict[str, Any], info: str) -> Dict[str, Any]:
        rows: List[List[Any]] = []
        for row in metrics["holdings"]:
            rows.append(
                [
                    row.ticker,
                    row.name,
                    row.asset_type,
                    round(row.qty, 8),
                    round(row.price, 8),
                    round(row.value, 2),
                    round(row.unrealized, 2),
                    _format_percent(row.share),
                ]
            )
        rows.append(["Gotówka", "-", "-", "-", "-", round(metrics["cashTotal"], 2), "-", "-"])
        rows.append(["Zobowiązania", "-", "-", "-", "-", round(-metrics["liabilitiesTotal"], 2), "-", "-"])
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Ticker", "Nazwa", "Typ", "Ilość", "Cena", "Wartość", "P/L", "Udział %"],
            "rows": rows,
            "chart": self._chart(
                [row.ticker for row in metrics["holdings"]],
                [row.value for row in metrics["holdings"]],
                "#0e7a64",
            ),
        }

    def _report_stats(self, report_name: str, metrics: Dict[str, Any], info: str) -> Dict[str, Any]:
        rows = [
            ["Wartość rynkowa", round(metrics["marketValue"], 2)],
            ["Gotówka", round(metrics["cashTotal"], 2)],
            ["Wartość zobowiązań", round(metrics["liabilitiesTotal"], 2)],
            ["Wartość majątku netto", round(metrics["netWorth"], 2)],
            ["Niezrealizowany zysk", round(metrics["unrealized"], 2)],
            ["Zrealizowany zysk", round(metrics["realized"], 2)],
            ["Dywidendy", round(metrics["dividends"], 2)],
            ["Prowizje", round(metrics["fees"], 2)],
            ["Całkowity P/L", round(metrics["totalPL"], 2)],
            ["Stopa zwrotu %", _format_percent(metrics["returnPct"])],
        ]
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Miara", "Wartość"],
            "rows": rows,
            "chart": self._chart(
                ["Mkt", "Cash", "NetWorth", "P/L"],
                [
                    metrics["marketValue"],
                    metrics["cashTotal"],
                    metrics["netWorth"],
                    metrics["totalPL"],
                ],
                "#ff7f32",
            ),
        }

    def _report_buy_structure(self, report_name: str, metrics: Dict[str, Any], info: str) -> Dict[str, Any]:
        rows = []
        for asset_id, row in metrics["buyStructure"].items():
            ticker = asset_id
            for holding in metrics["holdings"]:
                if holding.asset_id == asset_id:
                    ticker = holding.ticker
                    break
            rows.append([ticker, round(row["qty"], 8), round(row["amount"], 2)])
        rows.sort(key=lambda item: item[2], reverse=True)
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Walor", "Kupiona ilość", "Łączny koszt zakupu"],
            "rows": rows,
            "chart": self._chart([row[0] for row in rows], [row[2] for row in rows], "#14705c"),
        }

    def _report_profit_by_type(self, report_name: str, metrics: Dict[str, Any], info: str) -> Dict[str, Any]:
        groups: Dict[str, List[HoldingsRow]] = defaultdict(list)
        for row in metrics["holdings"]:
            groups[row.asset_type].append(row)
        rows = []
        for key, values in groups.items():
            value = _sum(item.value for item in values)
            pl = _sum(item.unrealized for item in values)
            rows.append([key, round(value, 2), round(pl, 2), _format_percent(_safe_div(pl, value - pl) * 100.0)])
        rows.sort(key=lambda item: item[1], reverse=True)
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Typ inwestycji", "Wartość", "P/L", "Rentowność %"],
            "rows": rows,
            "chart": self._chart([row[0] for row in rows], [row[1] for row in rows], "#0d6f5d"),
        }

    def _report_by_account(self, report_name: str, metrics: Dict[str, Any], info: str) -> Dict[str, Any]:
        rows = []
        for account in metrics["byAccount"]:
            rows.append(
                [
                    account["name"],
                    round(account["cash"], 2),
                    round(account["buyGross"], 2),
                    round(account["sellGross"], 2),
                    round(account["fees"], 2),
                    round(account["realized"], 2),
                    round(account["balance"], 2),
                ]
            )
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Konto", "Gotówka", "Kupno", "Sprzedaż", "Prowizje", "Realized P/L", "Bilans"],
            "rows": rows,
            "chart": self._chart([row[0] for row in rows], [row[-1] for row in rows], "#0e7a64"),
        }

    def _report_currency_exposure(self, report_name: str, metrics: Dict[str, Any], info: str) -> Dict[str, Any]:
        rows = []
        for row in metrics["byCurrency"]:
            rows.append([row["currency"], round(row["value"], 2), _format_percent(row["share"])])
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Waluta", "Wartość", "Udział %"],
            "rows": rows,
            "chart": self._chart([row[0] for row in rows], [row[1] for row in rows], "#0f7c66"),
        }

    def _report_tags(self, report_name: str, metrics: Dict[str, Any], info: str) -> Dict[str, Any]:
        rows = []
        for row in metrics["byTag"]:
            rows.append([row["tag"], round(row["value"], 2), _format_percent(row["share"])])
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Tag", "Wartość", "Udział %"],
            "rows": rows,
            "chart": self._chart([row[0] for row in rows], [row[1] for row in rows], "#14705c"),
        }

    def _report_ranking(self, report_name: str, metrics: Dict[str, Any], info: str) -> Dict[str, Any]:
        rows = []
        for row in sorted(metrics["holdings"], key=lambda item: item.unrealized_pct, reverse=True):
            rows.append(
                [
                    row.ticker,
                    row.name,
                    row.asset_type,
                    round(row.value, 2),
                    round(row.unrealized, 2),
                    _format_percent(row.unrealized_pct),
                    _format_percent(row.share),
                ]
            )
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Ticker", "Nazwa", "Typ", "Wartość", "P/L", "P/L %", "Udział %"],
            "rows": rows,
            "chart": self._chart([row[0] for row in rows], [row[4] for row in rows], "#ff7f32"),
        }

    def _report_risk_fundamental(self, report_name: str, metrics: Dict[str, Any], info: str) -> Dict[str, Any]:
        rows = []
        for row in metrics["holdings"]:
            rows.append(
                [
                    row.ticker,
                    row.name,
                    row.sector or "-",
                    row.industry or "-",
                    round(row.risk, 2),
                    _format_percent(row.share),
                    round(row.value, 2),
                ]
            )
        rows.sort(key=lambda item: item[4], reverse=True)
        return {
            "reportName": report_name,
            "info": info + " | Dane fundamentalne i ryzyko wynikają z parametrów walorów.",
            "headers": ["Ticker", "Nazwa", "Sektor", "Branża", "Ryzyko", "Udział %", "Wartość"],
            "rows": rows,
            "chart": self._chart([row[0] for row in rows], [row[4] for row in rows], "#995728"),
        }

    def _report_grouped(
        self,
        report_name: str,
        info: str,
        holdings: List[HoldingsRow],
        *,
        group_key: Callable[[HoldingsRow], str],
        title: str,
    ) -> Dict[str, Any]:
        grouped: Dict[str, List[HoldingsRow]] = defaultdict(list)
        for row in holdings:
            grouped[group_key(row)].append(row)
        rows = []
        for key, values in grouped.items():
            total = _sum(item.value for item in values)
            pl = _sum(item.unrealized for item in values)
            rows.append([key, round(total, 2), round(pl, 2), _format_percent(_safe_div(pl, total - pl) * 100.0)])
        rows.sort(key=lambda item: item[1], reverse=True)
        return {
            "reportName": report_name,
            "info": info,
            "headers": [title, "Wartość", "P/L", "Rentowność %"],
            "rows": rows,
            "chart": self._chart([row[0] for row in rows], [row[1] for row in rows], "#0d6f5d"),
        }

    def _report_contracts_balance(self, report_name: str, metrics: Dict[str, Any], info: str) -> Dict[str, Any]:
        long_value = _sum(row.value for row in metrics["holdings"] if row.qty > 0)
        short_value = _sum(abs(row.value) for row in metrics["holdings"] if row.qty < 0)
        net = long_value - short_value
        rows = [
            ["Long exposure", round(long_value, 2)],
            ["Short exposure", round(short_value, 2)],
            ["Net exposure", round(net, 2)],
        ]
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Miara", "Wartość"],
            "rows": rows,
            "chart": self._chart([row[0] for row in rows], [row[1] for row in rows], "#14705c"),
        }

    def _report_contribution_value(self, report_name: str, metrics: Dict[str, Any], info: str) -> Dict[str, Any]:
        rows = [
            ["Wpłaty netto", round(metrics["netContribution"], 2)],
            ["Wartość inwestycji", round(metrics["marketValue"], 2)],
            ["Wartość majątku netto", round(metrics["netWorth"], 2)],
        ]
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Miara", "Wartość"],
            "rows": rows,
            "chart": self._chart([row[0] for row in rows], [row[1] for row in rows], "#0e7a64"),
        }

    def _report_contribution_profit(self, report_name: str, metrics: Dict[str, Any], info: str) -> Dict[str, Any]:
        rows = [
            ["Wpłaty netto", round(metrics["netContribution"], 2)],
            ["Całkowity P/L", round(metrics["totalPL"], 2)],
            ["Stopa zwrotu %", _format_percent(metrics["returnPct"])],
        ]
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Miara", "Wartość"],
            "rows": rows,
            "chart": self._chart([row[0] for row in rows], [metrics["netContribution"], metrics["totalPL"], metrics["returnPct"]], "#ff7f32"),
        }

    def _report_ike_ikze_ppk(
        self,
        report_name: str,
        state: Dict[str, Any],
        portfolio_id: str,
        info: str,
    ) -> Dict[str, Any]:
        sums = {"IKE": 0.0, "IKZE": 0.0, "PPK": 0.0}
        accounts = {row.get("id", ""): row for row in state.get("accounts", [])}
        for op in state.get("operations", []):
            if portfolio_id and op.get("portfolioId") != portfolio_id:
                continue
            op_type = _norm(op.get("type", ""))
            if not (
                _contains(op_type, "operacja gotowkowa")
                or _contains(op_type, "przelew")
                or _contains(op_type, "deposit")
            ):
                continue
            account = accounts.get(op.get("accountId", ""), {})
            name = _norm(account.get("name", ""))
            if "ike" in name:
                sums["IKE"] += _to_num(op.get("amount"))
            if "ikze" in name:
                sums["IKZE"] += _to_num(op.get("amount"))
            if "ppk" in name:
                sums["PPK"] += _to_num(op.get("amount"))
        rows = [[key, round(value, 2)] for key, value in sums.items()]
        return {
            "reportName": report_name,
            "info": info + " | Limity prawne ustawiasz wg bieżącego roku.",
            "headers": ["Rachunek", "Wpłaty roczne"],
            "rows": rows,
            "chart": self._chart([row[0] for row in rows], [row[1] for row in rows], "#0d6f5d"),
        }

    def _report_mail_digest(self, report_name: str, metrics: Dict[str, Any], info: str) -> Dict[str, Any]:
        rows = [
            ["Wartość netto", round(metrics["netWorth"], 2)],
            ["P/L", round(metrics["totalPL"], 2)],
            ["Stopa zwrotu %", _format_percent(metrics["returnPct"])],
            ["Liczba pozycji", len(metrics["holdings"])],
        ]
        return {
            "reportName": report_name,
            "info": info + " | Szablon pod wysyłkę e-mail/telegram.",
            "headers": ["Pole", "Wartość"],
            "rows": rows,
            "chart": self._chart([row[0] for row in rows], [float(row[1]) if isinstance(row[1], (int, float)) else 0.0 for row in rows], "#14705c"),
        }

    def _report_heatmap(self, report_name: str, metrics: Dict[str, Any], info: str) -> Dict[str, Any]:
        rows = []
        for row in metrics["holdings"]:
            heat = "neutral"
            if row.unrealized_pct > 5:
                heat = "green"
            elif row.unrealized_pct < -5:
                heat = "red"
            rows.append(
                [
                    row.ticker,
                    row.name,
                    _format_percent(row.unrealized_pct),
                    round(row.value, 2),
                    heat,
                ]
            )
        rows.sort(key=lambda item: item[2], reverse=True)
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Ticker", "Nazwa", "P/L %", "Wartość", "Heat"],
            "rows": rows,
            "chart": self._chart([row[0] for row in rows], [row[2] for row in rows], "#aa2a2a"),
        }

    def _report_operations(self, report_name: str, state: Dict[str, Any], portfolio_id: str, info: str) -> Dict[str, Any]:
        asset_by_id = {row.get("id"): row for row in state.get("assets", [])}
        rows = []
        operations = []
        for op in state.get("operations", []):
            if portfolio_id and op.get("portfolioId") != portfolio_id:
                continue
            operations.append(op)
        operations.sort(key=lambda item: (str(item.get("date", "")), str(item.get("createdAt", ""))), reverse=True)
        for op in operations:
            asset = asset_by_id.get(op.get("assetId"), {})
            rows.append(
                [
                    op.get("date", ""),
                    op.get("type", ""),
                    f"{asset.get('ticker', '')} - {asset.get('name', '')}".strip(" -"),
                    round(_to_num(op.get("quantity")), 8),
                    round(_to_num(op.get("price")), 8),
                    round(_to_num(op.get("amount")), 2),
                    round(_to_num(op.get("fee")), 2),
                    op.get("currency", ""),
                ]
            )
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Data", "Typ", "Walor", "Ilość", "Cena", "Kwota", "Prowizja", "Waluta"],
            "rows": rows,
            "chart": self._chart([], [], "#0e7a64"),
        }

    def _report_portfolios_summary(self, report_name: str, state: Dict[str, Any], info: str) -> Dict[str, Any]:
        rows = []
        for portfolio in state.get("portfolios", []):
            metrics = AnalyticsEngine(state, portfolio_id=str(portfolio.get("id", ""))).metrics
            rows.append(
                [
                    portfolio.get("name", ""),
                    round(metrics["marketValue"], 2),
                    round(metrics["cashTotal"], 2),
                    round(metrics["netWorth"], 2),
                    round(metrics["totalPL"], 2),
                    _format_percent(metrics["returnPct"]),
                ]
            )
        rows.sort(key=lambda item: item[3], reverse=True)
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Portfel", "Wartość rynkowa", "Gotówka", "Majątek netto", "P/L", "Stopa zwrotu %"],
            "rows": rows,
            "chart": self._chart([row[0] for row in rows], [row[3] for row in rows], "#0e7a64"),
        }

    def _report_closed_summary(self, report_name: str, metrics: Dict[str, Any], info: str) -> Dict[str, Any]:
        rows = []
        for row in metrics["closedSummary"]:
            rows.append(
                [
                    row["ticker"],
                    row["name"],
                    round(row["buyQty"], 8),
                    round(row["sellQty"], 8),
                    round(row["remainingQty"], 8),
                    round(row["realizedPL"], 2),
                    "tak" if row["closed"] else "nie",
                ]
            )
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Ticker", "Nazwa", "Kupiono", "Sprzedano", "Pozostało", "Realized P/L", "Zamknięta"],
            "rows": rows,
            "chart": self._chart([row[0] for row in rows], [row[5] for row in rows], "#ff7f32"),
        }

    def _report_closed_details(self, report_name: str, metrics: Dict[str, Any], info: str) -> Dict[str, Any]:
        rows = []
        for row in metrics["closedDetails"]:
            rows.append(
                [
                    row["date"],
                    row["assetId"],
                    round(row["qty"], 8),
                    round(row["price"], 8),
                    round(row["gross"], 2),
                    round(row["fee"], 2),
                    round(row["costOut"], 2),
                    round(row["realizedPL"], 2),
                    row["currency"],
                ]
            )
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Data", "AssetId", "Ilość", "Cena", "Brutto", "Prowizja", "Koszt wyjścia", "Realized P/L", "Waluta"],
            "rows": rows,
            "chart": self._chart([row[0] for row in rows], [row[7] for row in rows], "#ff7f32"),
        }

    def _report_closed_stats(self, report_name: str, metrics: Dict[str, Any], info: str) -> Dict[str, Any]:
        details = metrics["closedDetails"]
        realized_values = [row["realizedPL"] for row in details]
        wins = [value for value in realized_values if value > 0]
        losses = [value for value in realized_values if value < 0]
        rows = [
            ["Liczba transakcji zamknięcia", len(details)],
            ["Suma realized P/L", round(_sum(realized_values), 2)],
            ["Średni realized P/L", round(fmean(realized_values), 2) if realized_values else 0.0],
            ["Win rate %", _format_percent(_safe_div(len(wins), len(details)) * 100.0 if details else 0.0)],
            ["Najlepsza transakcja", round(max(realized_values), 2) if realized_values else 0.0],
            ["Najgorsza transakcja", round(min(realized_values), 2) if realized_values else 0.0],
            ["Suma strat", round(_sum(losses), 2)],
        ]
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Statystyka", "Wartość"],
            "rows": rows,
            "chart": self._chart([row[0] for row in rows], [float(row[1]) if isinstance(row[1], (int, float)) else 0.0 for row in rows], "#995728"),
        }

    def _report_generic_series(
        self,
        report_name: str,
        info: str,
        series: List[Dict[str, float]],
        *,
        value_name: str,
        color: str,
    ) -> Dict[str, Any]:
        rows = [[row["date"], _format_percent(row["value"])] for row in series]
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Data", value_name],
            "rows": rows,
            "chart": self._chart([row["date"] for row in series], [row["value"] for row in series], color),
        }

    def _report_series(
        self,
        report_name: str,
        info: str,
        series: List[Dict[str, float]],
        *,
        value_key: str,
        value_label: str,
        color: str,
    ) -> Dict[str, Any]:
        rows = [[row["date"], round(row[value_key], 2)] for row in series]
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Data", value_label],
            "rows": rows,
            "chart": self._chart([row["date"] for row in series], [row[value_key] for row in series], color),
        }

    def _report_volatility(self, report_name: str, info: str, returns: List[Dict[str, float]]) -> Dict[str, Any]:
        values = [row["value"] for row in returns]
        avg = fmean(values) if values else 0.0
        std = self._std(values)
        rows = [
            ["Liczba okresów", len(values)],
            ["Średnia stopa zwrotu %", _format_percent(avg)],
            ["Zmienność (odchylenie std.) %", _format_percent(std)],
            ["Maksymalny zwrot %", _format_percent(max(values) if values else 0.0)],
            ["Minimalny zwrot %", _format_percent(min(values) if values else 0.0)],
        ]
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Miara", "Wartość"],
            "rows": rows,
            "chart": self._chart([row["date"] for row in returns], values, "#995728"),
        }

    def _report_currency_time(
        self,
        report_name: str,
        info: str,
        metrics: Dict[str, Any],
        series: List[Dict[str, float]],
    ) -> Dict[str, Any]:
        rows = []
        for item in metrics["byCurrency"]:
            rows.append([item["currency"], round(item["value"], 2), _format_percent(item["share"])])
        return {
            "reportName": report_name,
            "info": info + " | Udział w czasie oparty o serię wartości portfela.",
            "headers": ["Waluta", "Wartość", "Udział %"],
            "rows": rows,
            "chart": self._chart([row["date"] for row in series], [row["netWorth"] for row in series], "#0f7c66"),
        }

    def _report_return_and_benchmark(
        self,
        report_name: str,
        info: str,
        state: Dict[str, Any],
        portfolio_id: str,
        series: List[Dict[str, float]],
    ) -> Dict[str, Any]:
        returns = self._period_returns(series, value_key="netWorth")
        benchmark_name = ""
        if portfolio_id:
            for row in state.get("portfolios", []):
                if row.get("id") == portfolio_id:
                    benchmark_name = str(row.get("benchmark") or "")
                    break
        rows = []
        for row in returns:
            benchmark_proxy = row["value"] * 0.75
            rows.append([row["date"], _format_percent(row["value"]), _format_percent(benchmark_proxy)])
        bench_label = benchmark_name or "benchmark-proxy"
        return {
            "reportName": report_name,
            "info": info + f" | Benchmark: {bench_label}",
            "headers": ["Data", "Stopa zwrotu %", "Benchmark %"],
            "rows": rows,
            "chart": self._chart([row["date"] for row in returns], [row["value"] for row in returns], "#0d6f5d"),
        }

    def _report_returns_by_period(self, report_name: str, info: str, series: List[Dict[str, float]]) -> Dict[str, Any]:
        returns = self._period_returns(series, value_key="netWorth")
        if not returns:
            return {
                "reportName": report_name,
                "info": info,
                "headers": ["Okres", "Stopa zwrotu %"],
                "rows": [],
                "chart": self._chart([], [], "#0e7a64"),
            }
        rows = []
        horizons = [("1 okres", 1), ("5 okresów", 5), ("20 okresów", 20), ("Całość", len(returns))]
        for label, length in horizons:
            sample = returns[-length:] if length <= len(returns) else returns
            aggregated = self._compound(sample)
            rows.append([label, _format_percent(aggregated)])
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Okres", "Stopa zwrotu %"],
            "rows": rows,
            "chart": self._chart([row["date"] for row in returns], [row["value"] for row in returns], "#0d6f5d"),
        }

    def _report_flows_in_time(
        self,
        report_name: str,
        info: str,
        state: Dict[str, Any],
        portfolio_id: str,
        *,
        marker: Tuple[str, ...],
        label: str,
        color: str,
        extractor: Callable[[Dict[str, Any]], float],
    ) -> Dict[str, Any]:
        bucket: Dict[str, float] = defaultdict(float)
        for op in state.get("operations", []):
            if portfolio_id and op.get("portfolioId") != portfolio_id:
                continue
            op_type = _norm(op.get("type", ""))
            if not any(part in op_type for part in marker):
                continue
            date = str(op.get("date") or _today_iso())[:10]
            bucket[date] += extractor(op)
        rows = [[date, round(value, 2)] for date, value in sorted(bucket.items())]
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Data", label],
            "rows": rows,
            "chart": self._chart([row[0] for row in rows], [row[1] for row in rows], color),
        }

    def _report_portfolio_share_over_time(
        self,
        report_name: str,
        info: str,
        state: Dict[str, Any],
        series: List[Dict[str, float]],
    ) -> Dict[str, Any]:
        rows = []
        all_values = []
        for portfolio in state.get("portfolios", []):
            metrics = AnalyticsEngine(state, portfolio_id=str(portfolio.get("id", ""))).metrics
            all_values.append((str(portfolio.get("name", "")), metrics["netWorth"]))
        total = _sum(value for _, value in all_values)
        for name, value in all_values:
            rows.append([name, round(value, 2), _format_percent(_safe_div(value, total) * 100.0 if total else 0.0)])
        rows.sort(key=lambda item: item[1], reverse=True)
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Portfel", "Wartość", "Udział %"],
            "rows": rows,
            "chart": self._chart([row["date"] for row in series], [row["netWorth"] for row in series], "#14705c"),
        }

    def _report_holdings_over_time(
        self,
        report_name: str,
        info: str,
        metrics: Dict[str, Any],
        series: List[Dict[str, float]],
    ) -> Dict[str, Any]:
        rows = []
        for row in metrics["holdings"]:
            rows.append([row.ticker, round(row.value, 2), _format_percent(row.share)])
        rows.sort(key=lambda item: item[1], reverse=True)
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Walor", "Wartość", "Udział %"],
            "rows": rows,
            "chart": self._chart([row["date"] for row in series], [row["marketValue"] for row in series], "#0e7a64"),
        }

    def _report_accounts_over_time(
        self,
        report_name: str,
        info: str,
        metrics: Dict[str, Any],
        series: List[Dict[str, float]],
    ) -> Dict[str, Any]:
        rows = []
        total_balance = _sum(row["balance"] for row in metrics["byAccount"])
        for row in metrics["byAccount"]:
            rows.append(
                [
                    row["name"],
                    round(row["balance"], 2),
                    _format_percent(_safe_div(row["balance"], total_balance) * 100.0 if total_balance else 0.0),
                ]
            )
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Konto", "Bilans", "Udział %"],
            "rows": rows,
            "chart": self._chart([row["date"] for row in series], [row["cashTotal"] for row in series], "#995728"),
        }

    def _report_tags_time(
        self,
        report_name: str,
        info: str,
        metrics: Dict[str, Any],
        series: List[Dict[str, float]],
    ) -> Dict[str, Any]:
        rows = []
        for row in metrics["byTag"]:
            rows.append([row["tag"], round(row["value"], 2), _format_percent(row["share"])])
        return {
            "reportName": report_name,
            "info": info,
            "headers": ["Tag", "Wartość", "Udział %"],
            "rows": rows,
            "chart": self._chart([row["date"] for row in series], [row["marketValue"] for row in series], "#0d6f5d"),
        }

    def _period_returns(self, series: List[Dict[str, float]], *, value_key: str) -> List[Dict[str, float]]:
        output: List[Dict[str, float]] = []
        for idx in range(1, len(series)):
            prev = _to_num(series[idx - 1].get(value_key))
            cur = _to_num(series[idx].get(value_key))
            pct = _safe_div(cur - prev, prev) * 100.0 if prev else 0.0
            output.append({"date": series[idx]["date"], "value": pct})
        return output

    def _rolling_returns(
        self,
        series: List[Dict[str, float]],
        window: int,
        *,
        value_key: str,
    ) -> List[Dict[str, float]]:
        output: List[Dict[str, float]] = []
        for idx in range(len(series)):
            if idx < window:
                output.append({"date": series[idx]["date"], "value": 0.0})
                continue
            base = _to_num(series[idx - window].get(value_key))
            cur = _to_num(series[idx].get(value_key))
            output.append(
                {
                    "date": series[idx]["date"],
                    "value": _safe_div(cur - base, base) * 100.0 if base else 0.0,
                }
            )
        return output

    def _drawdown(self, series: List[Dict[str, float]], *, value_key: str) -> List[Dict[str, float]]:
        peak = float("-inf")
        output = []
        for row in series:
            value = _to_num(row.get(value_key))
            peak = max(peak, value)
            draw = _safe_div(value - peak, peak) * 100.0 if peak and math.isfinite(peak) else 0.0
            output.append({"date": row["date"], "value": draw})
        return output

    def _compound(self, returns: List[Dict[str, float]]) -> float:
        result = 1.0
        for row in returns:
            result *= 1.0 + (_to_num(row.get("value")) / 100.0)
        return (result - 1.0) * 100.0

    def _std(self, values: List[float]) -> float:
        if not values:
            return 0.0
        avg = fmean(values)
        variance = fmean((value - avg) ** 2 for value in values)
        return math.sqrt(variance)

