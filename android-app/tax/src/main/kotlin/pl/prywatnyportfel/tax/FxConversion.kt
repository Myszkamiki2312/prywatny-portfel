package pl.prywatnyportfel.tax

/**
 * Currency conversion, kept identical to the web (frontend/metrics.js) and the backend
 * (backend/utils.py).
 *
 * The phone had no conversion at all: it summed holdings and cash across currencies as raw
 * numbers, so a portfolio holding USD and PLN reported a net worth the web never showed. This is
 * the shared implementation both sides are now pinned to by tests/fixtures/fx-spec.json.
 *
 * Rates are supplied as a map because this module has no JSON parser in its main source set; the
 * caller converts its JSON payload first.
 */
object FxConversion {

    /** Three letters or the fallback — matches normalizeCurrency / normalize_currency. */
    fun normalizeCurrency(value: Any?, fallback: String = "PLN"): String {
        val text = value?.toString().orEmpty().uppercase().trim()
        return if (text.length == 3 && text.all { it.isLetter() }) text else fallback
    }

    /**
     * Accepts the pair spellings the app stores: "USD/PLN", "FX:USD/PLN", "USDPLN" and the
     * provider form "USDPLN=X". Returns "" when the text is not a pair of distinct currencies.
     */
    fun normalizeFxPairKey(value: Any?, quoteCurrency: Any? = null): String {
        if (quoteCurrency != null) {
            val base = normalizeCurrency(value, "")
            val quote = normalizeCurrency(quoteCurrency, "")
            return if (base.isNotEmpty() && quote.isNotEmpty() && base != quote) "$base/$quote" else ""
        }
        var text = value?.toString().orEmpty().uppercase().trim()
        if (text.isEmpty()) return ""
        if (text.startsWith("FX:")) text = text.substring(3)

        Regex("^([A-Z]{3})/([A-Z]{3})$").find(text)?.let { match ->
            return "${match.groupValues[1]}/${match.groupValues[2]}"
        }
        Regex("^([A-Z]{3})([A-Z]{3})(?:=X)?$").find(text)?.let { match ->
            val base = match.groupValues[1]
            val quote = match.groupValues[2]
            return if (base != quote) "$base/$quote" else ""
        }
        return ""
    }

    /** Keeps only positive rates under normalised pair keys; anything else is dropped. */
    fun normalizeFxRates(raw: Any?): Map<String, Double> {
        val source = raw as? Map<*, *> ?: return emptyMap()
        val output = LinkedHashMap<String, Double>()
        for ((key, value) in source) {
            val pairKey = normalizeFxPairKey(key)
            if (pairKey.isEmpty()) continue
            val rate = TaxCalculations.toNum(value)
            if (rate > 0) output[pairKey] = rate
        }
        return output
    }

    /**
     * Breadth-first walk over the rate graph, so an inverse rate (PLN from USD/PLN) and a cross
     * rate (GBP to PLN through EUR) both resolve. Returns 0 when no path exists.
     */
    fun findCurrencyConversionRate(fromCurrency: Any?, toCurrency: Any?, fxRates: Any?): Double {
        val base = normalizeCurrency(fromCurrency, "")
        val quote = normalizeCurrency(toCurrency, "")
        if (base.isEmpty() || quote.isEmpty()) return 0.0
        if (base == quote) return 1.0

        val graph = HashMap<String, MutableList<Pair<String, Double>>>()
        for ((key, rate) in normalizeFxRates(fxRates)) {
            val (src, dst) = key.split("/", limit = 2)
            graph.getOrPut(src) { mutableListOf() }.add(dst to rate)
            graph.getOrPut(dst) { mutableListOf() }.add(src to 1.0 / rate)
        }

        val queue = ArrayDeque<Pair<String, Double>>()
        queue.add(base to 1.0)
        val visited = mutableSetOf(base)
        while (queue.isNotEmpty()) {
            val (current, currentRate) = queue.removeFirst()
            if (current == quote) return currentRate
            for ((next, edgeRate) in graph[current].orEmpty()) {
                if (!visited.add(next)) continue
                queue.add(next to currentRate * edgeRate)
            }
        }
        return 0.0
    }

    /** Converts, or returns the amount untouched when there is no usable rate. */
    fun convertCurrency(value: Any?, fromCurrency: Any?, toCurrency: Any?, fxRates: Any?): Double {
        val amount = TaxCalculations.toNum(value)
        val base = normalizeCurrency(fromCurrency, "")
        val quote = normalizeCurrency(toCurrency, "")
        if (base.isEmpty() || quote.isEmpty() || base == quote) return amount
        val rate = findCurrencyConversionRate(base, quote, fxRates)
        return if (rate > 0) amount * rate else amount
    }
}
