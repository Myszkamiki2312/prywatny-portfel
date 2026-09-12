package pl.prywatnyportfel.importers

/** One entry of the broker catalogue, mirroring backend/importers.py `SUPPORTED_BROKERS`. */
data class BrokerSpec(
    val id: String,
    val name: String,
    val description: String,
    val requiredHeaders: List<String>,
)

val SUPPORTED_BROKERS: Map<String, BrokerSpec> = listOf(
    BrokerSpec(
        "generic",
        "Generic CSV",
        "Uniwersalny importer oparty o naglowki z aplikacji.",
        listOf("date", "type"),
    ),
    BrokerSpec(
        "xtb",
        "XTB",
        "Import historii transakcji XTB (CSV).",
        listOf("time", "symbol", "type"),
    ),
    BrokerSpec(
        "mbank",
        "mBank",
        "Import historii rachunku maklerskiego mBank (CSV).",
        listOf("data", "rodzaj", "instrument"),
    ),
    BrokerSpec(
        "degiro",
        "DEGIRO",
        "Import historii transakcji DEGIRO (CSV).",
        listOf("date", "product", "quantity"),
    ),
    BrokerSpec(
        "ibkr",
        "Interactive Brokers (IBKR)",
        "Import historii transakcji IBKR (CSV).",
        listOf("date", "symbol", "quantity"),
    ),
    BrokerSpec(
        "bossa",
        "BOSSA",
        "Import historii rachunku maklerskiego BOSSA (CSV).",
        listOf("data", "rodzaj", "instrument"),
    ),
).associateBy { it.id }

/**
 * backend/importers.py `REQUIRED_HEADER_ALIASES`.
 *
 * Also drives the header-line scoring in CsvLayout, which is why an entry missing here does more
 * than fail one lookup: it makes a real header score lower and a preamble line win.
 */
val REQUIRED_HEADER_ALIASES: Map<String, List<String>> = linkedMapOf(
    "date" to listOf("date", "data", "time", "datetime", "date/time", "tradeTime", "executionDate"),
    "time" to listOf("time", "date", "datetime", "date/time"),
    "symbol" to listOf("symbol", "ticker", "underlyingSymbol", "instrument"),
    "quantity" to listOf("quantity", "qty", "shares", "ilosc", "ilość", "wolumen"),
    "data" to listOf("data", "date", "time", "datetime"),
    "rodzaj" to listOf("rodzaj", "rodzajOperacji", "type", "typ", "operacja"),
    "type" to listOf("type", "typ", "rodzaj", "rodzajOperacji", "operacja", "operation", "action"),
    "instrument" to listOf("instrument", "walor", "ticker", "symbol", "nazwa"),
    "product" to listOf("product", "instrument", "security", "nazwa"),
)

/** backend/importers.py `_validate_required_headers`. */
fun validateRequiredHeaders(brokerId: String, rows: List<Map<String, String>>) {
    if (rows.isEmpty()) return
    val spec = SUPPORTED_BROKERS[brokerId] ?: return
    val headers = rows.first().keys.map { normalizeKey(it) }.toSet()
    val missing = spec.requiredHeaders.filter { required ->
        val aliases = REQUIRED_HEADER_ALIASES[required] ?: listOf(required)
        aliases.none { normalizeKey(it) in headers }
    }
    if (missing.isNotEmpty()) {
        val readable = spec.requiredHeaders.joinToString(", ")
        throw IllegalArgumentException("Missing required CSV headers for $brokerId: $readable")
    }
}
