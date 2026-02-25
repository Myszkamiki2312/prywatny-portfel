"""Advanced parity tools: candles, TradingView, ESPI, Catalyst, taxes, forum, options, model portfolio."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timezone
import csv
import html
import io
import json
import math
import re
import ssl
from typing import Any, Dict, Iterable, List
import urllib.error
import urllib.parse
import urllib.request

from .database import Database
from .quotes import QuoteService
from .reports import AnalyticsEngine
from .state_model import make_id, now_iso, normalize_date, to_num


def _norm(value: Any) -> str:
    return " ".join(str(value or "").strip().lower().split())


def _to_num(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value or "").strip().replace(" ", "").replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return 0.0


def _to_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _today() -> date:
    return datetime.now(timezone.utc).date()


def _date_to_iso(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", text):
        return text
    if re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", text):
        day, month, year = text.split(".")
        return f"{year}-{month}-{day}"
    try:
        return normalize_date(text)
    except Exception:  # noqa: BLE001
        return ""


def _std(values: List[float]) -> float:
    if not values:
        return 0.0
    avg = sum(values) / len(values)
    var = sum((value - avg) ** 2 for value in values) / len(values)
    return math.sqrt(var)


def _max_drawdown(closes: List[float]) -> float:
    peak = float("-inf")
    worst = 0.0
    for close in closes:
        peak = max(peak, close)
        if peak <= 0:
            continue
        dd = (close - peak) / peak * 100.0
        worst = min(worst, dd)
    return worst


def _sma(values: List[float], period: int) -> float:
    if not values:
        return 0.0
    if len(values) < period:
        return sum(values) / len(values)
    sample = values[-period:]
    return sum(sample) / len(sample)


def _ema(values: List[float], period: int) -> float:
    if not values:
        return 0.0
    alpha = 2.0 / (period + 1.0)
    ema = values[0]
    for value in values[1:]:
        ema = alpha * value + (1.0 - alpha) * ema
    return ema


def _rsi(values: List[float], period: int = 14) -> float:
    if len(values) < 2:
        return 50.0
    deltas = [values[idx] - values[idx - 1] for idx in range(1, len(values))]
    gains = [max(delta, 0.0) for delta in deltas]
    losses = [max(-delta, 0.0) for delta in deltas]
    if len(deltas) < period:
        period = max(1, len(deltas))
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1.0 + rs))


def _macd(values: List[float]) -> Dict[str, float]:
    if not values:
        return {"macd": 0.0, "signal": 0.0, "hist": 0.0}
    ema12 = _ema(values, 12)
    ema26 = _ema(values, 26)
    macd = ema12 - ema26
    # Approximation: signal from short synthetic series with current macd repeated.
    synthetic = [macd] * min(max(9, len(values) // 10), 20)
    signal = _ema(synthetic, 9)
    return {"macd": macd, "signal": signal, "hist": macd - signal}


def _signal_from_indicators(last_close: float, indicators: Dict[str, float]) -> str:
    score = 0
    if last_close > indicators["sma20"]:
        score += 1
    if indicators["sma20"] > indicators["sma50"]:
        score += 1
    if indicators["rsi14"] >= 55 and indicators["rsi14"] <= 75:
        score += 1
    if indicators["macdHist"] > 0:
        score += 1
    if indicators["rsi14"] >= 80:
        score -= 1
    if score >= 3:
        return "BUY"
    if score <= 1:
        return "SELL"
    return "HOLD"


def _stooq_candidates(ticker: str) -> List[str]:
    base = str(ticker or "").strip().lower()
    if not base:
        return []
    if "." in base:
        root = base.split(".", 1)[0]
        return [base, root, f"{root}.us", f"{root}.pl"]
    if "_" in base:
        root = base.split("_", 1)[0]
        return [base, root, f"{root}.us", f"{root}.pl"]
    return [f"{base}.pl", f"{base}.us", base]


def _parse_stooq_history(payload: str) -> List[Dict[str, Any]]:
    reader = csv.DictReader(io.StringIO(payload))
    rows: List[Dict[str, Any]] = []
    for row in reader:
        try:
            dt = str(row.get("Date") or "").strip()
            if not dt:
                continue
            open_v = float(row.get("Open") or 0)
            high_v = float(row.get("High") or 0)
            low_v = float(row.get("Low") or 0)
            close_v = float(row.get("Close") or 0)
            vol_v = float(row.get("Volume") or 0)
        except (TypeError, ValueError):
            continue
        rows.append(
            {
                "date": dt,
                "open": open_v,
                "high": high_v,
                "low": low_v,
                "close": close_v,
                "volume": vol_v,
            }
        )
    rows.sort(key=lambda item: item["date"])
    return rows


def _parse_tag_map(tags: Iterable[str]) -> Dict[str, str]:
    output: Dict[str, str] = {}
    for raw in tags:
        text = str(raw or "").strip()
        if not text:
            continue
        if "=" in text:
            key, value = text.split("=", 1)
        elif ":" in text:
            key, value = text.split(":", 1)
        else:
            continue
        output[_norm(key)] = value.strip()
    return output


def _tag_value(tag_map: Dict[str, str], *keys: str) -> str:
    for key in keys:
        value = tag_map.get(_norm(key), "")
        if value:
            return value
    return ""


def _years_to(date_iso: str) -> float:
    if not date_iso:
        return 0.0
    try:
        maturity = date.fromisoformat(date_iso)
    except ValueError:
        return 0.0
    delta = (maturity - _today()).days
    if delta <= 0:
        return 0.0
    return delta / 365.25


@dataclass
class EsPiItem:
    title: str
    link: str
    ticker: str
    source: str
    published_at: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "link": self.link,
            "ticker": self.ticker,
            "source": self.source,
            "publishedAt": self.published_at,
        }


class ParityToolsService:
    def __init__(self, database: Database, quote_service: QuoteService):
        self.database = database
        self.quote_service = quote_service

    def candles(self, *, ticker: str, limit: int = 120) -> Dict[str, Any]:
        symbol = str(ticker or "").strip().upper()
        if not symbol:
            return {"ticker": "", "candles": [], "indicators": {}, "signal": "N/A", "generatedAt": now_iso()}

        candles = self._fetch_stooq_candles(symbol)
        if limit > 0:
            candles = candles[-max(10, min(limit, 3000)) :]
        closes = [row["close"] for row in candles if row["close"] > 0]
        last_close = closes[-1] if closes else 0.0
        indicators = {
            "sma20": _sma(closes, 20),
            "sma50": _sma(closes, 50),
            "ema12": _ema(closes, 12),
            "ema26": _ema(closes, 26),
            "rsi14": _rsi(closes, 14),
        }
        macd = _macd(closes)
        indicators["macd"] = macd["macd"]
        indicators["macdSignal"] = macd["signal"]
        indicators["macdHist"] = macd["hist"]
        signal = _signal_from_indicators(last_close, indicators) if candles else "N/A"
        return {
            "ticker": symbol,
            "candles": candles,
            "indicators": {key: round(float(value), 6) for key, value in indicators.items()},
            "signal": signal,
            "generatedAt": now_iso(),
        }

    def tradingview(self, *, ticker: str) -> Dict[str, Any]:
        symbol = str(ticker or "").strip().upper()
        chart = self.candles(ticker=symbol, limit=220)
        tv_symbol = self._to_tradingview_symbol(symbol)
        embed_url = f"https://www.tradingview.com/chart/?symbol={urllib.parse.quote(tv_symbol)}"
        return {
            "ticker": symbol,
            "tradingviewSymbol": tv_symbol,
            "embedUrl": embed_url,
            "signal": chart.get("signal", "N/A"),
            "indicators": chart.get("indicators", {}),
            "generatedAt": now_iso(),
        }

    def catalyst_analysis(self, *, portfolio_id: str = "", limit: int = 80) -> Dict[str, Any]:
        state = self.database.get_state()
        quote_map = {
            str(item["ticker"]).upper(): item
            for item in self.database.get_quotes([row.get("ticker", "") for row in state.get("assets", [])])
        }
        rows: List[Dict[str, Any]] = []
        for asset in state.get("assets", []):
            if not self._is_bond(asset):
                continue
            ticker = str(asset.get("ticker") or "").upper()
            price = _to_num((quote_map.get(ticker) or {}).get("price") or asset.get("currentPrice"))
            if price <= 0:
                continue
            tag_map = _parse_tag_map(asset.get("tags") or [])
            coupon_rate = _to_num(_tag_value(tag_map, "coupon", "kupon", "coupon_rate"))
            nominal = _to_num(_tag_value(tag_map, "nominal", "nominal_value", "wartosc_nominalna")) or 100.0
            maturity_raw = _tag_value(tag_map, "maturity", "zapadalnosc", "expiry", "wykup")
            maturity_iso = _date_to_iso(maturity_raw)
            years = _years_to(maturity_iso)

            annual_coupon = nominal * coupon_rate / 100.0
            current_yield = (annual_coupon / price * 100.0) if price > 0 else 0.0
            ytm = 0.0
            if years > 0:
                ytm = ((annual_coupon + (nominal - price) / years) / ((nominal + price) / 2.0)) * 100.0
            duration_proxy = years / (1.0 + max(0.0, ytm) / 100.0) if years > 0 else 0.0

            risk = "Niski"
            if years > 7 or ytm > 10:
                risk = "Wysoki"
            elif years > 3 or ytm > 6:
                risk = "Sredni"

            rows.append(
                {
                    "ticker": ticker,
                    "name": str(asset.get("name") or ""),
                    "price": round(price, 4),
                    "currency": str((quote_map.get(ticker) or {}).get("currency") or asset.get("currency") or "PLN"),
                    "couponRate": round(coupon_rate, 4),
                    "nominal": round(nominal, 4),
                    "maturityDate": maturity_iso,
                    "yearsToMaturity": round(years, 4),
                    "currentYieldPct": round(current_yield, 4),
                    "ytmApproxPct": round(ytm, 4),
                    "durationProxy": round(duration_proxy, 4),
                    "riskLabel": risk,
                }
            )
        rows.sort(key=lambda row: row["ytmApproxPct"], reverse=True)
        rows = rows[: max(1, min(limit, 500))]
        return {"portfolioId": portfolio_id, "rows": rows, "generatedAt": now_iso()}

    def funds_ranking(self, *, limit: int = 30) -> Dict[str, Any]:
        state = self.database.get_state()
        candidates = [asset for asset in state.get("assets", []) if self._is_fund(asset)]
        rows: List[Dict[str, Any]] = []
        for asset in candidates[:80]:
            ticker = str(asset.get("ticker") or "").upper()
            if not ticker:
                continue
            candles = self._fetch_stooq_candles(ticker)
            if len(candles) < 20:
                continue
            closes = [row["close"] for row in candles if row["close"] > 0][-252:]
            if len(closes) < 10:
                continue
            returns = [(closes[idx] - closes[idx - 1]) / closes[idx - 1] for idx in range(1, len(closes)) if closes[idx - 1] > 0]
            if not returns:
                continue
            cumulative = (closes[-1] / closes[0] - 1.0) * 100.0 if closes[0] > 0 else 0.0
            avg_daily = sum(returns) / len(returns)
            annual_return = ((1.0 + avg_daily) ** 252 - 1.0) * 100.0
            volatility = _std(returns) * math.sqrt(252) * 100.0
            sharpe = (annual_return - 2.0) / volatility if volatility > 0 else 0.0
            mdd = _max_drawdown(closes)
            rr = annual_return / volatility if volatility > 0 else 0.0
            score = sharpe * 100.0 + rr * 10.0 + cumulative * 0.3 + mdd * 0.2
            rows.append(
                {
                    "ticker": ticker,
                    "name": str(asset.get("name") or ""),
                    "type": str(asset.get("type") or ""),
                    "annualReturnPct": round(annual_return, 4),
                    "cumulativeReturnPct": round(cumulative, 4),
                    "volatilityPct": round(volatility, 4),
                    "maxDrawdownPct": round(mdd, 4),
                    "sharpeApprox": round(sharpe, 4),
                    "returnRisk": round(rr, 4),
                    "score": round(score, 4),
                }
            )
        rows.sort(key=lambda row: row["score"], reverse=True)
        rows = rows[: max(1, min(limit, 200))]
        for idx, row in enumerate(rows):
            row["rank"] = idx + 1
        return {"rows": rows, "generatedAt": now_iso()}

    def espi_messages(self, *, query: str = "", limit: int = 40) -> Dict[str, Any]:
        raw = self._fetch_text("https://www.gpw.pl/espi-ebi-reports", timeout=6)
        items = self._parse_espi_from_html(raw)
        if not items:
            rss_raw = self._fetch_text("https://www.gpw.pl/rss-communiques", timeout=6)
            items = self._parse_rss_communiques(rss_raw)
        if not items:
            bankier_raw = self._fetch_text("https://www.bankier.pl/rss/wiadomosci.xml", timeout=8)
            items = self._parse_bankier_rss(bankier_raw)
        token = _norm(query)
        if token:
            filtered = []
            for row in items:
                hay = _norm(f"{row.title} {row.ticker} {row.source}")
                if token in hay:
                    filtered.append(row)
            items = filtered
        items = items[: max(1, min(limit, 200))]
        return {
            "query": query,
            "items": [row.to_dict() for row in items],
            "generatedAt": now_iso(),
        }

    def tax_optimize(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        gain = _to_num(payload.get("realizedGain"))
        loss = _to_num(payload.get("realizedLoss"))
        dividends = _to_num(payload.get("dividends"))
        costs = _to_num(payload.get("costs"))
        rate_pct = _to_num(payload.get("taxRatePct")) or 19.0
        rate = rate_pct / 100.0

        raw_positions = payload.get("unrealizedPositions")
        if not isinstance(raw_positions, list):
            raw_positions = []

        base = max(0.0, gain - loss + dividends - costs)
        tax_before = base * rate
        remaining = base
        actions = []
        for item in sorted(raw_positions, key=lambda row: _to_num(row.get("unrealizedPL"))):
            unrealized = _to_num(item.get("unrealizedPL"))
            if unrealized >= 0 or remaining <= 0:
                continue
            harvest = min(abs(unrealized), remaining)
            remaining -= harvest
            actions.append(
                {
                    "ticker": str(item.get("ticker") or "N/A").upper(),
                    "unrealizedLoss": round(unrealized, 2),
                    "suggestedHarvestLoss": round(harvest, 2),
                }
            )
        base_after = max(0.0, remaining)
        tax_after = base_after * rate
        return {
            "taxRatePct": round(rate_pct, 4),
            "taxableBaseBefore": round(base, 2),
            "taxBefore": round(tax_before, 2),
            "taxableBaseAfter": round(base_after, 2),
            "taxAfter": round(tax_after, 2),
            "taxSaved": round(max(0.0, tax_before - tax_after), 2),
            "actions": actions,
            "generatedAt": now_iso(),
        }

    def tax_foreign_dividend(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        gross = _to_num(payload.get("grossDividend"))
        foreign_rate = _to_num(payload.get("foreignWithholdingPct"))
        local_rate = _to_num(payload.get("localTaxPct")) or 19.0
        treaty_cap = _to_num(payload.get("treatyCreditCapPct")) or 15.0

        foreign_withheld = gross * foreign_rate / 100.0
        local_nominal = gross * local_rate / 100.0
        creditable = gross * min(foreign_rate, treaty_cap) / 100.0
        local_due = max(0.0, local_nominal - creditable)
        refund_potential = max(0.0, foreign_withheld - creditable)
        net = gross - foreign_withheld - local_due
        return {
            "grossDividend": round(gross, 2),
            "foreignWithheld": round(foreign_withheld, 2),
            "localTaxNominal": round(local_nominal, 2),
            "creditableForeignTax": round(creditable, 2),
            "localTaxDue": round(local_due, 2),
            "foreignRefundPotential": round(refund_potential, 2),
            "netDividendAfterTax": round(net, 2),
            "generatedAt": now_iso(),
        }

    def tax_crypto(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        proceeds = _to_num(payload.get("proceeds"))
        acquisition_cost = _to_num(payload.get("acquisitionCost"))
        tx_cost = _to_num(payload.get("transactionCosts"))
        carry_loss = _to_num(payload.get("carryForwardLoss"))
        rate_pct = _to_num(payload.get("taxRatePct")) or 19.0
        taxable_profit = proceeds - acquisition_cost - tx_cost
        tax_base_after_carry = max(0.0, taxable_profit - carry_loss)
        tax = tax_base_after_carry * rate_pct / 100.0
        return {
            "proceeds": round(proceeds, 2),
            "acquisitionCost": round(acquisition_cost, 2),
            "transactionCosts": round(tx_cost, 2),
            "cryptoIncomeBeforeCarry": round(taxable_profit, 2),
            "carryForwardLossUsed": round(min(max(taxable_profit, 0.0), carry_loss), 2),
            "taxableBase": round(tax_base_after_carry, 2),
            "taxDue": round(max(0.0, tax), 2),
            "generatedAt": now_iso(),
        }

    def tax_foreign_interest(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        gross = _to_num(payload.get("grossInterest"))
        foreign_rate = _to_num(payload.get("foreignWithholdingPct"))
        local_rate = _to_num(payload.get("localTaxPct")) or 19.0
        treaty_cap = _to_num(payload.get("treatyCreditCapPct")) or 15.0
        foreign_withheld = gross * foreign_rate / 100.0
        local_nominal = gross * local_rate / 100.0
        credit = gross * min(foreign_rate, treaty_cap) / 100.0
        local_due = max(0.0, local_nominal - credit)
        return {
            "grossInterest": round(gross, 2),
            "foreignWithheld": round(foreign_withheld, 2),
            "localTaxDue": round(local_due, 2),
            "netInterestAfterTax": round(gross - foreign_withheld - local_due, 2),
            "generatedAt": now_iso(),
        }

    def tax_bond_interest(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        coupon = _to_num(payload.get("couponInterest"))
        discount_gain = _to_num(payload.get("discountGain"))
        costs = _to_num(payload.get("costs"))
        rate_pct = _to_num(payload.get("taxRatePct")) or 19.0
        base = max(0.0, coupon + discount_gain - costs)
        tax = base * rate_pct / 100.0
        return {
            "couponInterest": round(coupon, 2),
            "discountGain": round(discount_gain, 2),
            "costs": round(costs, 2),
            "taxableBase": round(base, 2),
            "taxDue": round(tax, 2),
            "generatedAt": now_iso(),
        }

    def list_forum(self, *, ticker: str = "", limit: int = 200) -> Dict[str, Any]:
        return {
            "ticker": str(ticker or "").upper(),
            "posts": self.database.list_forum_posts(ticker=ticker, limit=limit),
            "generatedAt": now_iso(),
        }

    def add_forum_post(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        content = str(payload.get("content") or "").strip()
        if not content:
            raise ValueError("Brak treści posta.")
        ticker = str(payload.get("ticker") or "OGOLNE").strip().upper()
        author = str(payload.get("author") or "Ja").strip() or "Ja"
        post_id = make_id("forum")
        self.database.upsert_forum_post(
            post_id=post_id,
            ticker=ticker,
            author=author,
            content=content,
            created_at=now_iso(),
        )
        return {"created": True, "postId": post_id}

    def delete_forum_post(self, *, post_id: str) -> Dict[str, Any]:
        return {"deleted": self.database.delete_forum_post(post_id)}

    def option_exercise_price(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        option_type = "put" if _norm(payload.get("optionType")) == "put" else "call"
        strike = _to_num(payload.get("strike"))
        premium = _to_num(payload.get("premium"))
        spot = _to_num(payload.get("spotPrice"))
        contracts = max(1.0, _to_num(payload.get("contracts")) or 1.0)
        multiplier = max(1.0, _to_num(payload.get("multiplier")) or 100.0)

        if option_type == "call":
            break_even = strike + premium
            intrinsic = max(0.0, spot - strike)
        else:
            break_even = strike - premium
            intrinsic = max(0.0, strike - spot)
        time_value = max(0.0, premium - intrinsic)
        payoff_per_unit = intrinsic - premium
        position_pl = payoff_per_unit * contracts * multiplier
        status = "OTM"
        if intrinsic > 0:
            status = "ITM"
        if abs(intrinsic) < 1e-9:
            status = "ATM"
        recommendation = "HOLD"
        if status == "ITM" and time_value <= max(0.01, premium * 0.05):
            recommendation = "EXERCISE_OR_CLOSE"
        elif status == "OTM":
            recommendation = "NO_EXERCISE"
        return {
            "optionType": option_type,
            "strike": round(strike, 4),
            "premium": round(premium, 4),
            "spotPrice": round(spot, 4),
            "breakEven": round(break_even, 4),
            "intrinsicValue": round(intrinsic, 4),
            "timeValue": round(time_value, 4),
            "status": status,
            "payoffPerUnit": round(payoff_per_unit, 4),
            "positionPL": round(position_pl, 4),
            "recommendation": recommendation,
            "generatedAt": now_iso(),
        }

    def option_positions(self, *, refresh_quotes: bool = False) -> Dict[str, Any]:
        rows = self.database.list_option_positions(limit=1000)
        tickers = sorted({str(item.get("ticker") or "").upper() for item in rows if str(item.get("ticker") or "").strip()})
        if refresh_quotes and tickers:
            quotes = self.quote_service.refresh(tickers)
            if quotes:
                self.database.upsert_quotes(quotes)
        quote_map = {str(item["ticker"]).upper(): item for item in self.database.get_quotes(tickers)}
        parsed = []
        for item in rows:
            ticker = str(item.get("ticker") or "").upper()
            quote = quote_map.get(ticker, {})
            spot = _to_num(quote.get("price") or item.get("underlyingPrice"))
            calc = self.option_exercise_price(
                {
                    "optionType": item.get("optionType"),
                    "strike": item.get("strike"),
                    "premium": item.get("premium"),
                    "spotPrice": spot,
                    "contracts": item.get("contracts"),
                    "multiplier": item.get("multiplier"),
                }
            )
            expiry_iso = _date_to_iso(item.get("expiryDate"))
            days_to_expiry = 0
            if expiry_iso:
                try:
                    days_to_expiry = max(0, (date.fromisoformat(expiry_iso) - _today()).days)
                except ValueError:
                    days_to_expiry = 0
            parsed.append(
                {
                    **item,
                    "spotPrice": round(spot, 4),
                    "currency": str(quote.get("currency") or "PLN"),
                    "daysToExpiry": days_to_expiry,
                    "breakEven": calc["breakEven"],
                    "status": calc["status"],
                    "positionPL": calc["positionPL"],
                    "recommendation": calc["recommendation"],
                }
            )
        return {"rows": parsed, "generatedAt": now_iso()}

    def add_option_position(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        ticker = str(payload.get("ticker") or "").strip().upper()
        if not ticker:
            raise ValueError("Brak tickera.")
        option_type = "put" if _norm(payload.get("optionType")) == "put" else "call"
        strike = _to_num(payload.get("strike"))
        premium = _to_num(payload.get("premium"))
        contracts = max(1.0, _to_num(payload.get("contracts")) or 1.0)
        multiplier = max(1.0, _to_num(payload.get("multiplier")) or 100.0)
        expiry_date = _date_to_iso(payload.get("expiryDate")) or _today().isoformat()
        underlying_price = _to_num(payload.get("underlyingPrice"))

        position_id = make_id("opt")
        self.database.upsert_option_position(
            position_id=position_id,
            ticker=ticker,
            option_type=option_type,
            strike=strike,
            expiry_date=expiry_date,
            premium=premium,
            contracts=contracts,
            multiplier=multiplier,
            underlying_price=underlying_price,
            created_at=now_iso(),
        )
        return {"created": True, "positionId": position_id}

    def delete_option_position(self, *, position_id: str) -> Dict[str, Any]:
        return {"deleted": self.database.delete_option_position(position_id)}

    def get_model_portfolio(self) -> Dict[str, Any]:
        default = {
            "name": "Portfel wzorcowy",
            "weights": [],
            "updatedAt": "",
        }
        return self.database.get_meta_json("modelPortfolio", default)

    def set_model_portfolio(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        existing = self.get_model_portfolio()
        name = str(payload.get("name") or existing.get("name") or "Portfel wzorcowy").strip() or "Portfel wzorcowy"
        raw_weights = payload.get("weights")
        parsed: List[Dict[str, Any]] = []
        if isinstance(raw_weights, list):
            for item in raw_weights:
                if not isinstance(item, dict):
                    continue
                ticker = str(item.get("ticker") or "").strip().upper()
                weight = _to_num(item.get("weight"))
                if ticker and weight > 0:
                    parsed.append({"ticker": ticker, "weight": weight})
        total = sum(item["weight"] for item in parsed)
        if total <= 0:
            raise ValueError("Wagi portfela wzorcowego muszą być dodatnie.")
        normalized = [{"ticker": item["ticker"], "weight": round(item["weight"] / total * 100.0, 6)} for item in parsed]
        data = {"name": name, "weights": normalized, "updatedAt": now_iso()}
        self.database.set_meta_json("modelPortfolio", data)
        return data

    def compare_model_portfolio(self, *, portfolio_id: str = "") -> Dict[str, Any]:
        model = self.get_model_portfolio()
        weights = model.get("weights") if isinstance(model.get("weights"), list) else []
        if not weights:
            return {
                "modelName": model.get("name", "Portfel wzorcowy"),
                "portfolioId": portfolio_id,
                "rows": [],
                "summary": {"trackingErrorPct": 0.0, "rebalanceNeeded": False},
                "generatedAt": now_iso(),
            }

        state = self.database.get_state()
        metrics = AnalyticsEngine(state, portfolio_id=portfolio_id).metrics
        asset_by_id = {row.get("id", ""): row for row in state.get("assets", [])}
        actual_by_ticker: Dict[str, float] = defaultdict(float)
        value_by_ticker: Dict[str, float] = defaultdict(float)
        price_by_ticker: Dict[str, float] = {}
        for row in metrics.get("holdings", []):
            ticker = str(row.ticker or "").upper()
            if not ticker:
                continue
            actual_by_ticker[ticker] += _to_num(row.share)
            value_by_ticker[ticker] += _to_num(row.value)
            price_by_ticker[ticker] = _to_num(row.price)

        for asset in state.get("assets", []):
            ticker = str(asset.get("ticker") or "").upper()
            if ticker and ticker not in price_by_ticker:
                price_by_ticker[ticker] = _to_num(asset.get("currentPrice"))

        target_by_ticker = {str(item.get("ticker") or "").upper(): _to_num(item.get("weight")) for item in weights}
        universe = sorted(set(target_by_ticker) | set(actual_by_ticker))
        net_worth = _to_num(metrics.get("netWorth"))
        rows = []
        sq_error = 0.0
        for ticker in universe:
            target = target_by_ticker.get(ticker, 0.0)
            actual = actual_by_ticker.get(ticker, 0.0)
            diff = actual - target
            sq_error += diff * diff
            target_value = net_worth * target / 100.0
            actual_value = value_by_ticker.get(ticker, 0.0)
            value_delta = actual_value - target_value
            price = _to_num(price_by_ticker.get(ticker))
            qty_delta = abs(value_delta / price) if price > 0 else 0.0
            action = "OK"
            if diff > 1.0:
                action = "SPRZEDAJ"
            elif diff < -1.0:
                action = "KUP"
            rows.append(
                {
                    "ticker": ticker,
                    "targetSharePct": round(target, 4),
                    "actualSharePct": round(actual, 4),
                    "deviationPct": round(diff, 4),
                    "targetValue": round(target_value, 2),
                    "actualValue": round(actual_value, 2),
                    "valueDelta": round(value_delta, 2),
                    "price": round(price, 4),
                    "qtyDeltaApprox": round(qty_delta, 6),
                    "action": action,
                }
            )
        rows.sort(key=lambda row: abs(row["deviationPct"]), reverse=True)
        tracking_error = math.sqrt(sq_error / max(1, len(universe)))
        return {
            "modelName": model.get("name", "Portfel wzorcowy"),
            "portfolioId": portfolio_id,
            "rows": rows,
            "summary": {
                "trackingErrorPct": round(tracking_error, 4),
                "rebalanceNeeded": any(row["action"] != "OK" for row in rows),
            },
            "generatedAt": now_iso(),
        }

    def list_public_portfolios(self) -> Dict[str, Any]:
        state = self.database.get_state()
        rows = []
        for portfolio in state.get("portfolios", []):
            if not portfolio.get("isPublic"):
                continue
            metrics = AnalyticsEngine(state, portfolio_id=str(portfolio.get("id") or "")).metrics
            rows.append(
                {
                    "id": str(portfolio.get("id") or ""),
                    "name": str(portfolio.get("name") or ""),
                    "benchmark": str(portfolio.get("benchmark") or ""),
                    "goal": str(portfolio.get("goal") or ""),
                    "netWorth": round(_to_num(metrics.get("netWorth")), 2),
                    "returnPct": round(_to_num(metrics.get("returnPct")), 4),
                    "holdingsCount": len(metrics.get("holdings", [])),
                }
            )
        rows.sort(key=lambda row: row["netWorth"], reverse=True)
        return {"portfolios": rows, "generatedAt": now_iso()}

    def clone_public_portfolio(self, *, source_portfolio_id: str, new_name: str) -> Dict[str, Any]:
        state = self.database.get_state()
        source = None
        for row in state.get("portfolios", []):
            if str(row.get("id") or "") == source_portfolio_id and row.get("isPublic"):
                source = row
                break
        if not source:
            raise ValueError("Nie znaleziono publicznego portfela.")
        copied = dict(source)
        copied["id"] = make_id("ptf")
        copied["name"] = new_name.strip() if new_name.strip() else f"{source.get('name', 'Portfel')} (kopia)"
        copied["isPublic"] = False
        copied["createdAt"] = now_iso()
        state["portfolios"].append(copied)

        for op in list(state.get("operations", [])):
            if op.get("portfolioId") != source_portfolio_id:
                continue
            clone = dict(op)
            clone["id"] = make_id("op")
            clone["portfolioId"] = copied["id"]
            clone["createdAt"] = now_iso()
            state["operations"].append(clone)
        self.database.replace_state(state)
        return {"cloned": True, "portfolioId": copied["id"], "name": copied["name"]}

    def _fetch_text(self, url: str, timeout: int = 10) -> str:
        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": "PrywatnyPortfel/1.0",
                "Accept": "text/html,application/xml,text/xml,*/*",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return response.read().decode("utf-8", errors="ignore")
        except urllib.error.URLError as error:
            if isinstance(error.reason, ssl.SSLError):
                try:
                    context = ssl._create_unverified_context()  # noqa: S323
                    with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
                        return response.read().decode("utf-8", errors="ignore")
                except Exception:  # noqa: BLE001
                    return ""
            return ""
        except Exception:  # noqa: BLE001
            return ""

    def _fetch_stooq_candles(self, ticker: str) -> List[Dict[str, Any]]:
        for candidate in _stooq_candidates(ticker):
            url = "https://stooq.com/q/d/l/?" + urllib.parse.urlencode({"s": candidate, "i": "d"})
            text = self._fetch_text(url)
            rows = _parse_stooq_history(text)
            if rows:
                return rows
        return []

    def _to_tradingview_symbol(self, ticker: str) -> str:
        text = str(ticker or "").strip().upper()
        if not text:
            return "GPW:WIG20"
        if text.endswith(".PL") or text.endswith(".WA"):
            base = text.split(".")[0]
            return f"GPW:{base}"
        if text.endswith(".US"):
            return f"NASDAQ:{text.split('.')[0]}"
        if "." in text:
            return text
        # Default for this project: first try GPW.
        return f"GPW:{text}"

    def _is_bond(self, asset: Dict[str, Any]) -> bool:
        kind = _norm(asset.get("type", ""))
        if "oblig" in kind or "bond" in kind:
            return True
        tags = [str(tag or "") for tag in asset.get("tags") or []]
        joined = _norm(" ".join(tags))
        return "oblig" in joined or "bond" in joined or "catalyst" in joined

    def _is_fund(self, asset: Dict[str, Any]) -> bool:
        kind = _norm(asset.get("type", ""))
        if "fund" in kind or "etf" in kind:
            return True
        tags = [str(tag or "") for tag in asset.get("tags") or []]
        joined = _norm(" ".join(tags))
        return "fundusz" in joined or "fund" in joined or "etf" in joined

    def _parse_espi_from_html(self, raw: str) -> List[EsPiItem]:
        if not raw:
            return []
        pattern = re.compile(
            r'href="(?P<href>espi-ebi-report\?[^"]+)"[^>]*>(?P<title>.*?)</a>',
            re.IGNORECASE | re.DOTALL,
        )
        dedup = set()
        items: List[EsPiItem] = []
        for match in pattern.finditer(raw):
            href = match.group("href")
            title_html = match.group("title")
            title = html.unescape(re.sub(r"<[^>]+>", " ", title_html)).strip()
            if not title or title.lower().startswith("more"):
                continue
            if href in dedup:
                continue
            dedup.add(href)
            absolute = urllib.parse.urljoin("https://www.gpw.pl/", href)
            ticker = self._ticker_from_title(title)
            snippet_start = max(0, match.start() - 180)
            snippet = raw[snippet_start : match.start()]
            date_match = re.findall(r"\d{2}\.\d{2}\.\d{4}|\d{4}-\d{2}-\d{2}", snippet)
            published = _date_to_iso(date_match[-1]) if date_match else ""
            items.append(
                EsPiItem(
                    title=title,
                    link=absolute,
                    ticker=ticker,
                    source="GPW ESPI/EBI",
                    published_at=published,
                )
            )
        return items

    def _parse_rss_communiques(self, raw: str) -> List[EsPiItem]:
        if not raw:
            return []
        items: List[EsPiItem] = []
        blocks = re.findall(r"<item>(.*?)</item>", raw, re.IGNORECASE | re.DOTALL)
        for block in blocks:
            title_match = re.search(r"<title>(.*?)</title>", block, re.IGNORECASE | re.DOTALL)
            link_match = re.search(r"<link>(.*?)</link>", block, re.IGNORECASE | re.DOTALL)
            date_match = re.search(r"<pubDate>(.*?)</pubDate>", block, re.IGNORECASE | re.DOTALL)
            if not title_match or not link_match:
                continue
            title = html.unescape(re.sub(r"<[^>]+>", " ", title_match.group(1))).strip()
            if not title:
                continue
            published = ""
            if date_match:
                pub_text = date_match.group(1).strip()
                try:
                    published = datetime.strptime(pub_text, "%a, %d %b %Y %H:%M:%S %z").date().isoformat()
                except ValueError:
                    published = _date_to_iso(pub_text)
            items.append(
                EsPiItem(
                    title=title,
                    link=html.unescape(link_match.group(1).strip()),
                    ticker=self._ticker_from_title(title),
                    source="GPW RSS",
                    published_at=published,
                )
            )
        return items

    def _parse_bankier_rss(self, raw: str) -> List[EsPiItem]:
        if not raw:
            return []
        items: List[EsPiItem] = []
        blocks = re.findall(r"<item>(.*?)</item>", raw, re.IGNORECASE | re.DOTALL)
        for block in blocks:
            title_match = re.search(r"<title>(.*?)</title>", block, re.IGNORECASE | re.DOTALL)
            link_match = re.search(r"<link>(.*?)</link>", block, re.IGNORECASE | re.DOTALL)
            date_match = re.search(r"<pubDate>(.*?)</pubDate>", block, re.IGNORECASE | re.DOTALL)
            if not title_match or not link_match:
                continue
            title = html.unescape(re.sub(r"<[^>]+>", " ", title_match.group(1))).strip()
            if not title:
                continue
            published = ""
            if date_match:
                pub_text = date_match.group(1).strip()
                try:
                    published = datetime.strptime(pub_text, "%a, %d %b %Y %H:%M:%S %Z").date().isoformat()
                except ValueError:
                    published = _date_to_iso(pub_text)
            # Keep only items likely related to reports/issuer announcements.
            text = _norm(title)
            if not any(
                token in text
                for token in ("espi", "ebi", "raport", "emitent", "spolka", "dywidend", "zarzad", "walne")
            ):
                continue
            items.append(
                EsPiItem(
                    title=title,
                    link=html.unescape(link_match.group(1).strip()),
                    ticker=self._ticker_from_title(title),
                    source="Bankier RSS",
                    published_at=published,
                )
            )
        return items

    def _ticker_from_title(self, text: str) -> str:
        parts = re.findall(r"[A-Z]{2,8}", str(text or "").upper())
        if not parts:
            return ""
        return parts[0]
