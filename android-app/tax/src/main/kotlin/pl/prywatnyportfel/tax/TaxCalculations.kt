package pl.prywatnyportfel.tax

import java.math.BigDecimal
import java.math.RoundingMode

/**
 * Tax and option calculations, kept identical to backend/parity_tools.py.
 *
 * The web app calls the Python implementation over the /api/tools/tax endpoints; the phone calls
 * this one when it is offline. Both are pinned by tests/fixtures/tax-spec.json, because the two
 * had already drifted in eight places before that fixture existed.
 *
 * Payloads are maps rather than typed parameters on purpose: the Python side takes an optional
 * JSON body where an absent field falls back to a statutory default, and the contract includes
 * that behaviour. Deliberate quirks of the reference are reproduced rather than tidied up — see
 * the note on OTM in [optionExercisePrice].
 */
object TaxCalculations {

    /** Mirrors Python's `_to_num`: anything unparseable is zero, decimal commas are accepted. */
    fun toNum(value: Any?): Double = when (value) {
        null -> 0.0
        is Number -> value.toDouble()
        else -> value.toString().replace(',', '.').trim().toDoubleOrNull() ?: 0.0
    }

    /**
     * Mirrors Python's `_to_num(...) or 19.0`. Zero is falsy there, so an explicit 0 falls back to
     * the statutory rate exactly as an absent field does.
     */
    private fun orDefault(value: Double, fallback: Double): Double =
        if (value == 0.0) fallback else value

    /** Python's round() is half-to-even; plain Math.round would disagree on exact halves. */
    private fun round(value: Double, scale: Int): Double =
        BigDecimal(value).setScale(scale, RoundingMode.HALF_EVEN).toDouble()

    private fun round2(value: Double) = round(value, 2)

    private fun round4(value: Double) = round(value, 4)

    fun taxForeignDividend(payload: Map<String, Any?>): Map<String, Any> {
        val gross = toNum(payload["grossDividend"])
        val foreignRate = toNum(payload["foreignWithholdingPct"])
        val localRate = orDefault(toNum(payload["localTaxPct"]), 19.0)
        val treatyCap = orDefault(toNum(payload["treatyCreditCapPct"]), 15.0)

        val foreignWithheld = gross * foreignRate / 100.0
        val localNominal = gross * localRate / 100.0
        val creditable = gross * minOf(foreignRate, treatyCap) / 100.0
        val localDue = maxOf(0.0, localNominal - creditable)
        val refundPotential = maxOf(0.0, foreignWithheld - creditable)

        return mapOf(
            "grossDividend" to round2(gross),
            "foreignWithheld" to round2(foreignWithheld),
            "localTaxNominal" to round2(localNominal),
            "creditableForeignTax" to round2(creditable),
            "localTaxDue" to round2(localDue),
            "foreignRefundPotential" to round2(refundPotential),
            "netDividendAfterTax" to round2(gross - foreignWithheld - localDue),
        )
    }

    fun taxCrypto(payload: Map<String, Any?>): Map<String, Any> {
        val proceeds = toNum(payload["proceeds"])
        val acquisitionCost = toNum(payload["acquisitionCost"])
        val transactionCosts = toNum(payload["transactionCosts"])
        val carryLoss = toNum(payload["carryForwardLoss"])
        val ratePct = orDefault(toNum(payload["taxRatePct"]), 19.0)

        val taxableProfit = proceeds - acquisitionCost - transactionCosts
        val baseAfterCarry = maxOf(0.0, taxableProfit - carryLoss)
        val tax = baseAfterCarry * ratePct / 100.0

        return mapOf(
            "proceeds" to round2(proceeds),
            "acquisitionCost" to round2(acquisitionCost),
            "transactionCosts" to round2(transactionCosts),
            "cryptoIncomeBeforeCarry" to round2(taxableProfit),
            "carryForwardLossUsed" to round2(minOf(maxOf(taxableProfit, 0.0), carryLoss)),
            "taxableBase" to round2(baseAfterCarry),
            "taxDue" to round2(maxOf(0.0, tax)),
        )
    }

    fun taxForeignInterest(payload: Map<String, Any?>): Map<String, Any> {
        val gross = toNum(payload["grossInterest"])
        val foreignRate = toNum(payload["foreignWithholdingPct"])
        val localRate = orDefault(toNum(payload["localTaxPct"]), 19.0)
        val treatyCap = orDefault(toNum(payload["treatyCreditCapPct"]), 15.0)

        val foreignWithheld = gross * foreignRate / 100.0
        val localNominal = gross * localRate / 100.0
        val credit = gross * minOf(foreignRate, treatyCap) / 100.0
        val localDue = maxOf(0.0, localNominal - credit)

        return mapOf(
            "grossInterest" to round2(gross),
            "foreignWithheld" to round2(foreignWithheld),
            "localTaxDue" to round2(localDue),
            "netInterestAfterTax" to round2(gross - foreignWithheld - localDue),
        )
    }

    fun taxBondInterest(payload: Map<String, Any?>): Map<String, Any> {
        val coupon = toNum(payload["couponInterest"])
        val discountGain = toNum(payload["discountGain"])
        val costs = toNum(payload["costs"])
        val ratePct = orDefault(toNum(payload["taxRatePct"]), 19.0)

        val base = maxOf(0.0, coupon + discountGain - costs)

        return mapOf(
            "couponInterest" to round2(coupon),
            "discountGain" to round2(discountGain),
            "costs" to round2(costs),
            "taxableBase" to round2(base),
            "taxDue" to round2(base * ratePct / 100.0),
        )
    }

    fun optionExercisePrice(payload: Map<String, Any?>): Map<String, Any> {
        val optionType =
            if (payload["optionType"]?.toString()?.trim()?.lowercase() == "put") "put" else "call"
        val strike = toNum(payload["strike"])
        val premium = toNum(payload["premium"])
        val spot = toNum(payload["spotPrice"])
        val contracts = maxOf(1.0, orDefault(toNum(payload["contracts"]), 1.0))
        // A contract covers 100 units unless stated otherwise. Defaulting this to 1 would make
        // position P/L a hundred times too small.
        val multiplier = maxOf(1.0, orDefault(toNum(payload["multiplier"]), 100.0))

        val breakEven = if (optionType == "call") strike + premium else strike - premium
        val intrinsic =
            if (optionType == "call") maxOf(0.0, spot - strike) else maxOf(0.0, strike - spot)
        val timeValue = maxOf(0.0, premium - intrinsic)
        val payoffPerUnit = intrinsic - premium
        val positionPl = payoffPerUnit * contracts * multiplier

        // Reference order, quirk included: intrinsic value is clamped at zero, so a zero reading is
        // classified ATM and the OTM branch is unreachable. Kept identical rather than corrected,
        // because the contract describes what both sides must actually return.
        var status = "OTM"
        if (intrinsic > 0) status = "ITM"
        if (kotlin.math.abs(intrinsic) < 1e-9) status = "ATM"

        var recommendation = "HOLD"
        if (status == "ITM" && timeValue <= maxOf(0.01, premium * 0.05)) {
            recommendation = "EXERCISE_OR_CLOSE"
        } else if (status == "OTM") {
            recommendation = "NO_EXERCISE"
        }

        return mapOf(
            "optionType" to optionType,
            "strike" to round4(strike),
            "premium" to round4(premium),
            "spotPrice" to round4(spot),
            "breakEven" to round4(breakEven),
            "intrinsicValue" to round4(intrinsic),
            "timeValue" to round4(timeValue),
            "status" to status,
            "payoffPerUnit" to round4(payoffPerUnit),
            "positionPL" to round4(positionPl),
            "recommendation" to recommendation,
        )
    }

    /** One suggested loss-harvesting trade. */
    data class HarvestAction(
        val ticker: String,
        val unrealizedLoss: Double,
        val suggestedHarvestLoss: Double,
    )

    fun taxOptimize(
        payload: Map<String, Any?>,
        unrealizedPositions: List<Map<String, Any?>> = emptyList(),
    ): Map<String, Any> {
        val gain = toNum(payload["realizedGain"])
        val loss = toNum(payload["realizedLoss"])
        val dividends = toNum(payload["dividends"])
        val costs = toNum(payload["costs"])
        val ratePct = orDefault(toNum(payload["taxRatePct"]), 19.0)
        val rate = ratePct / 100.0

        val base = maxOf(0.0, gain - loss + dividends - costs)
        val taxBefore = base * rate

        // Biggest loss first, so the budget is spent where it saves most.
        var remaining = base
        val actions = mutableListOf<HarvestAction>()
        for (item in unrealizedPositions.sortedBy { toNum(it["unrealizedPL"]) }) {
            val unrealized = toNum(item["unrealizedPL"])
            if (unrealized >= 0 || remaining <= 0) continue
            val harvest = minOf(kotlin.math.abs(unrealized), remaining)
            remaining -= harvest
            val ticker = item["ticker"]?.toString()?.takeIf { it.isNotBlank() } ?: "N/A"
            actions.add(HarvestAction(ticker.uppercase(), round2(unrealized), round2(harvest)))
        }

        val baseAfter = maxOf(0.0, remaining)
        val taxAfter = baseAfter * rate

        return mapOf(
            "taxRatePct" to round4(ratePct),
            "taxableBaseBefore" to round2(base),
            "taxBefore" to round2(taxBefore),
            "taxableBaseAfter" to round2(baseAfter),
            "taxAfter" to round2(taxAfter),
            "taxSaved" to round2(maxOf(0.0, taxBefore - taxAfter)),
            "actions" to actions,
        )
    }
}
