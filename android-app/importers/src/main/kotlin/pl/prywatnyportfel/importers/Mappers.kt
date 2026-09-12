package pl.prywatnyportfel.importers

import kotlin.math.abs

/**
 * One imported operation. Field-for-field the dict the Python mappers return.
 */
data class MappedOperation(
    val id: String,
    val date: String,
    val type: String,
    val portfolioId: String,
    val accountId: String,
    val assetId: String,
    val targetAssetId: String,
    val quantity: Double,
    val targetQuantity: Double,
    val price: Double,
    val amount: Double,
    val fee: Double,
    val currency: String,
    val tags: List<String>,
    val note: String,
    val createdAt: String,
) {
    fun toStateMap(): Map<String, Any?> = mapOf(
        "id" to id,
        "date" to date,
        "type" to type,
        "portfolioId" to portfolioId,
        "accountId" to accountId,
        "assetId" to assetId,
        "targetAssetId" to targetAssetId,
        "quantity" to quantity,
        "targetQuantity" to targetQuantity,
        "price" to price,
        "amount" to amount,
        "fee" to fee,
        "currency" to currency,
        "tags" to tags,
        "note" to note,
        "createdAt" to createdAt,
    )
}

internal typealias RowMapper = (
    row: Map<String, String>,
    workspace: ImportWorkspace,
    defaultPortfolioId: String,
    defaultAccountId: String,
) -> MappedOperation?

/** backend/importers.py `_pick_mapper`. */
internal fun pickMapper(brokerId: String): RowMapper = when (brokerId) {
    "xtb" -> ::mapXtbRow
    "mbank" -> ::mapMbankRow
    "degiro" -> ::mapDegiroRow
    "ibkr" -> ::mapIbkrRow
    "bossa" -> ::mapBossaRow
    else -> ::mapGenericRow
}

/**
 * backend/importers.py `_normalize_operation_type`.
 *
 * Eleven categories with "Import operacji" as the fallback. The phone had six and fell back to
 * "Operacja gotówkowa", so an unrecognised row became a cash movement there and an unclassified
 * import on the server — two different portfolio effects from one file.
 */
fun normalizeOperationType(raw: String?): String {
    val text = simplifyText(raw)
    fun has(vararg words: String) = words.any { it in text }
    return when {
        has("kupno", "buy", "purchase") -> "Kupno waloru"
        has("sprzedaz", "sell", "sale") -> "Sprzedaż waloru"
        has("dywid", "dividend") -> "Dywidenda"
        has("przelew", "transfer", "withdraw") -> "Przelew gotówkowy"
        has("gotowk", "deposit", "wplata") -> "Operacja gotówkowa"
        has("lokat") -> "Lokata"
        has("pozyczk", "loan") -> "Pożyczka społecznościowa"
        has("konwers", "conversion") -> "Konwersja walorów"
        has("zobowiaz") -> "Zobowiązanie"
        has("prowiz", "commission") -> "Prowizja"
        has("odset", "interest") -> "Odsetki"
        else -> "Import operacji"
    }
}

private val TRADE_TYPES = setOf("Kupno waloru", "Sprzedaż waloru")

/** backend/importers.py `_map_generic_row`. */
internal fun mapGenericRow(
    row: Map<String, String>,
    workspace: ImportWorkspace,
    defaultPortfolioId: String,
    defaultAccountId: String,
): MappedOperation {
    val opType = normalizeOperationType(rowValue(row, "type", "operation_type", "rodzaj", "operacja", "typ"))
    val portfolioId = workspace.ensurePortfolio(
        preferredId = rowValue(row, "portfolioId", "portfolio_id"),
        preferredName = rowValue(row, "portfolio", "portfel"),
        fallbackId = defaultPortfolioId,
    )
    val accountId = workspace.ensureAccount(
        preferredId = rowValue(row, "accountId", "account_id"),
        preferredName = rowValue(row, "account", "konto"),
        fallbackId = defaultAccountId,
    )
    val assetId = workspace.ensureAsset(rowValue(row, "asset", "walor", "ticker", "symbol", "instrument"))
    val targetAssetId = workspace.ensureAsset(
        rowValue(row, "targetAsset", "target_asset", "walorDocelowy", "instrumentdocelowy")
    )
    val quantity = toNum(rowValue(row, "quantity", "ilosc", "qty", "volume"))
    val price = toNum(rowValue(row, "price", "cena", "openprice"))
    var amount = toNum(rowValue(row, "amount", "kwota", "value"))
    if (opType in TRADE_TYPES && amount == 0.0 && quantity != 0.0 && price != 0.0) {
        amount = quantity * price
    }

    return MappedOperation(
        id = workspace.newOperationId(),
        date = normalizeDate(rowValue(row, "date", "data", "time")),
        type = opType,
        portfolioId = portfolioId,
        accountId = accountId,
        assetId = assetId,
        targetAssetId = targetAssetId,
        quantity = quantity,
        targetQuantity = toNum(rowValue(row, "targetQuantity", "target_quantity", "iloscDocelowa")),
        price = price,
        amount = amount,
        fee = abs(toNum(rowValue(row, "fee", "prowizja", "commission"))),
        currency = textOrFallback(rowValue(row, "currency", "waluta"), workspace.baseCurrency),
        tags = toTags(rowValue(row, "tags", "tagi")),
        note = rowValue(row, "note", "notatka", "comment"),
        createdAt = workspace.now(),
    )
}

/** backend/importers.py `_map_xtb_row`. */
internal fun mapXtbRow(
    row: Map<String, String>,
    workspace: ImportWorkspace,
    defaultPortfolioId: String,
    defaultAccountId: String,
): MappedOperation {
    val sideRaw = rowValue(row, "type", "side", "transakcja")
    val side = simplifyText(sideRaw)
    val symbol = rowValue(row, "symbol", "ticker").ifEmpty { rowValue(row, "instrument") }
    val instrumentName = rowValue(row, "instrument", "security", "name")
    val comment = rowValue(row, "comment", "note", "description")
    val parsedTrade = parseXtbTradeComment(comment)

    // XTB writes the size and the fill price into the comment when the columns are absent.
    val quantity = toNum(rowValue(row, "volume", "lots", "quantity", "ilosc")).takeIf { it != 0.0 }
        ?: parsedTrade.first
    val price = toNum(rowValue(row, "openprice", "price", "cena")).takeIf { it != 0.0 }
        ?: parsedTrade.second
    // Brokers write a commission as money leaving the account, so the column is negative. A fee is
    // consumed as a magnitude everywhere downstream ("cash -= amount + fee", "totalPL -= fees"), so
    // a negative one credits the account instead of charging it.
    val commission = abs(toNum(rowValue(row, "commission", "fee", "prowizja")))
    val profit = toNum(rowValue(row, "profit", "amount", "kwota"))
    val currency = textOrFallback(rowValue(row, "currency", "waluta"), workspace.baseCurrency)

    var opType = normalizeOperationType(side)
    when {
        "buy" in side || "purchase" in side -> opType = "Kupno waloru"
        "sell" in side || "sale" in side -> opType = "Sprzedaż waloru"
        "dividend" in side -> opType = "Dywidenda"
        "interest" in side -> opType = "Odsetki"
        "deposit" in side -> opType = "Operacja gotówkowa"
        "withdraw" in side -> opType = "Przelew gotówkowy"
    }

    val portfolioId = workspace.ensurePortfolio(
        preferredId = rowValue(row, "portfolioid"),
        preferredName = rowValue(row, "portfolio", "portfel"),
        fallbackId = defaultPortfolioId,
    )
    val accountId = workspace.ensureAccount(
        preferredId = rowValue(row, "accountid"),
        preferredName = rowValue(row, "account", "konto"),
        fallbackId = defaultAccountId,
    )
    val assetId = workspace.ensureAsset(
        token = symbol,
        preferredName = instrumentName,
        assetType = if (opType in TRADE_TYPES) "Akcja" else "Inny",
        currency = currency,
    )
    var amount = profit
    if (opType in TRADE_TYPES && quantity != 0.0 && price != 0.0) {
        amount = quantity * price
    }

    return MappedOperation(
        id = workspace.newOperationId(),
        date = normalizeDate(rowValue(row, "time", "date", "data")),
        type = opType,
        portfolioId = portfolioId,
        accountId = accountId,
        assetId = assetId,
        targetAssetId = "",
        quantity = quantity,
        targetQuantity = 0.0,
        price = price,
        amount = amount,
        fee = commission,
        currency = currency,
        tags = listOf("xtb"),
        note = comment,
        createdAt = workspace.now(),
    )
}

/** backend/importers.py `_map_mbank_row`. */
internal fun mapMbankRow(
    row: Map<String, String>,
    workspace: ImportWorkspace,
    defaultPortfolioId: String,
    defaultAccountId: String,
): MappedOperation {
    val opType = normalizeOperationType(rowValue(row, "rodzajoperacji", "rodzaj", "type", "typ"))
    val instrument = rowValue(row, "instrument", "walor", "ticker", "symbol")
    val quantity = toNum(rowValue(row, "ilosc", "quantity"))
    val price = toNum(rowValue(row, "cena", "price"))
    var amount = toNum(rowValue(row, "kwota", "amount", "wartosc"))
    if (opType in TRADE_TYPES && amount == 0.0 && quantity != 0.0 && price != 0.0) {
        amount = quantity * price
    }

    val portfolioId = workspace.ensurePortfolio(
        preferredId = rowValue(row, "portfolioid"),
        preferredName = rowValue(row, "portfel", "portfolio"),
        fallbackId = defaultPortfolioId,
    )
    val accountId = workspace.ensureAccount(
        preferredId = rowValue(row, "accountid"),
        preferredName = rowValue(row, "konto", "account"),
        fallbackId = defaultAccountId,
    )

    return MappedOperation(
        id = workspace.newOperationId(),
        date = normalizeDate(rowValue(row, "data", "date", "time")),
        type = opType,
        portfolioId = portfolioId,
        accountId = accountId,
        assetId = workspace.ensureAsset(instrument),
        targetAssetId = "",
        quantity = quantity,
        targetQuantity = 0.0,
        price = price,
        amount = amount,
        fee = abs(toNum(rowValue(row, "prowizja", "fee", "commission"))),
        currency = textOrFallback(rowValue(row, "waluta", "currency"), workspace.baseCurrency),
        tags = listOf("mbank"),
        note = rowValue(row, "notatka", "note", "comment"),
        createdAt = workspace.now(),
    )
}

/** backend/importers.py `_map_degiro_row`. */
internal fun mapDegiroRow(
    row: Map<String, String>,
    workspace: ImportWorkspace,
    defaultPortfolioId: String,
    defaultAccountId: String,
): MappedOperation {
    val actionRaw = rowValue(row, "action", "side", "transactiontype", "type", "description")
    val action = simplifyText(actionRaw)
    val rawQuantity = toNum(rowValue(row, "quantity", "ilosc", "qty", "size"))
    var quantity = abs(rawQuantity)
    val price = toNum(rowValue(row, "price", "cena", "executionprice"))
    var amount = toNum(
        rowValue(row, "total", "amount", "value", "localvalue", "kwota", "change", "wartosc")
    )
    val fee = abs(toNum(rowValue(row, "fee", "commission", "transactionandorthird", "costs")))
    val currency = textOrFallback(rowValue(row, "currency", "waluta"), workspace.baseCurrency)

    val portfolioId = workspace.ensurePortfolio(
        preferredId = rowValue(row, "portfolioid"),
        preferredName = rowValue(row, "portfolio", "portfel"),
        fallbackId = defaultPortfolioId,
    )
    val accountId = workspace.ensureAccount(
        preferredId = rowValue(row, "accountid"),
        preferredName = rowValue(row, "account", "konto"),
        fallbackId = defaultAccountId,
    )

    val product = rowValue(row, "product", "instrument", "security", "nazwa")
    val isin = rowValue(row, "isin")
    val symbol = rowValue(row, "symbol", "ticker").ifEmpty { extractTicker(product, isin) }
    val assetId = if (symbol.isNotEmpty()) workspace.ensureAsset(symbol) else ""

    var opType = normalizeOperationType(actionRaw)
    when {
        listOf("buy", "koop", "kupno", "purchase", "kauf").any { it in action } -> opType = "Kupno waloru"
        listOf("sell", "sprzedaz", "verkoop", "vente").any { it in action } -> opType = "Sprzedaż waloru"
        "dividend" in action -> opType = "Dywidenda"
        listOf("deposit", "wplata", "storting").any { it in action } -> opType = "Operacja gotówkowa"
        listOf("withdraw", "withdrawal", "wyplata", "transfer out").any { it in action } ->
            opType = "Przelew gotówkowy"
        // No verb in the file: the sign of the quantity says which side the trade was.
        assetId.isNotEmpty() && rawQuantity > 0 -> opType = "Kupno waloru"
        assetId.isNotEmpty() && rawQuantity < 0 -> opType = "Sprzedaż waloru"
    }

    if (opType in TRADE_TYPES) {
        if (quantity <= 0.0 && price > 0.0 && amount != 0.0) {
            quantity = abs(amount / price)
        }
        amount = if (amount == 0.0 && quantity > 0.0 && price > 0.0) quantity * price else abs(amount)
    }

    return MappedOperation(
        id = workspace.newOperationId(),
        date = normalizeDate(rowValue(row, "date", "data", "time", "executiondate", "tradedate")),
        type = opType,
        portfolioId = portfolioId,
        accountId = accountId,
        assetId = assetId,
        targetAssetId = "",
        quantity = quantity,
        targetQuantity = 0.0,
        price = price,
        amount = amount,
        fee = fee,
        currency = currency,
        tags = listOf("degiro"),
        note = rowValue(row, "comment", "description", "notatka"),
        createdAt = workspace.now(),
    )
}

/** backend/importers.py `_map_ibkr_row`. */
internal fun mapIbkrRow(
    row: Map<String, String>,
    workspace: ImportWorkspace,
    defaultPortfolioId: String,
    defaultAccountId: String,
): MappedOperation {
    val actionRaw = rowValue(row, "action", "buysell", "side", "transactiontype", "description", "code")
    val action = simplifyText(actionRaw)
    val rawQuantity = toNum(rowValue(row, "quantity", "qty", "shares", "ilosc"))
    var quantity = abs(rawQuantity)
    val price = toNum(rowValue(row, "tprice", "price", "tradeprice", "cena"))
    val proceeds = toNum(rowValue(row, "proceeds", "amount", "value", "kwota"))
    val fee = abs(toNum(rowValue(row, "commfee", "commission", "fee", "prowizja")))
    val currency = textOrFallback(rowValue(row, "currency", "waluta"), workspace.baseCurrency)

    val portfolioId = workspace.ensurePortfolio(
        preferredId = rowValue(row, "portfolioid"),
        preferredName = rowValue(row, "portfolio", "portfel"),
        fallbackId = defaultPortfolioId,
    )
    val accountId = workspace.ensureAccount(
        preferredId = rowValue(row, "accountid"),
        preferredName = rowValue(row, "account", "konto", "accountid"),
        fallbackId = defaultAccountId,
    )

    var symbol = rowValue(row, "symbol", "ticker", "underlyingsymbol", "instrument")
    if (symbol.isEmpty()) {
        symbol = extractTicker(rowValue(row, "description", "security", "product"), rowValue(row, "isin"))
    }
    val assetId = if (symbol.isNotEmpty()) workspace.ensureAsset(symbol) else ""

    var opType = normalizeOperationType(actionRaw)
    when {
        listOf("buy", "kupno", "bought").any { it in action } -> opType = "Kupno waloru"
        listOf("sell", "sprzedaz", "sold").any { it in action } -> opType = "Sprzedaż waloru"
        "dividend" in action -> opType = "Dywidenda"
        listOf("deposit", "cash in", "wplata").any { it in action } -> opType = "Operacja gotówkowa"
        listOf("withdraw", "cash out", "wyplata", "transfer out").any { it in action } ->
            opType = "Przelew gotówkowy"
        assetId.isNotEmpty() && rawQuantity > 0 -> opType = "Kupno waloru"
        assetId.isNotEmpty() && rawQuantity < 0 -> opType = "Sprzedaż waloru"
    }

    var amount = abs(proceeds)
    if (opType in TRADE_TYPES) {
        if (quantity <= 0.0 && price > 0.0 && proceeds != 0.0) {
            quantity = abs(proceeds / price)
        }
        if (amount == 0.0 && quantity > 0.0 && price > 0.0) {
            amount = quantity * price
        }
    }

    return MappedOperation(
        id = workspace.newOperationId(),
        date = normalizeDate(rowValue(row, "datetime", "date/time", "date", "time", "tradetime")),
        type = opType,
        portfolioId = portfolioId,
        accountId = accountId,
        assetId = assetId,
        targetAssetId = "",
        quantity = quantity,
        targetQuantity = 0.0,
        price = price,
        amount = amount,
        fee = fee,
        currency = currency,
        tags = listOf("ibkr"),
        note = rowValue(row, "description", "comment", "note"),
        createdAt = workspace.now(),
    )
}

/** backend/importers.py `_map_bossa_row`. */
internal fun mapBossaRow(
    row: Map<String, String>,
    workspace: ImportWorkspace,
    defaultPortfolioId: String,
    defaultAccountId: String,
): MappedOperation {
    val opType = normalizeOperationType(rowValue(row, "rodzajoperacji", "rodzaj", "type", "typ", "operacja"))
    val instrument = rowValue(row, "instrument", "walor", "ticker", "symbol", "nazwa")
    val quantity = abs(toNum(rowValue(row, "ilosc", "quantity", "wolumen")))
    val price = toNum(rowValue(row, "cena", "price", "kurs"))
    var amount = toNum(rowValue(row, "kwota", "amount", "wartosc", "wartosctransakcji"))
    val fee = abs(toNum(rowValue(row, "prowizja", "fee", "commission", "koszt")))

    if (opType in TRADE_TYPES && amount == 0.0 && quantity != 0.0 && price != 0.0) {
        amount = quantity * price
    }
    if (opType in TRADE_TYPES) {
        amount = abs(amount)
    }

    val portfolioId = workspace.ensurePortfolio(
        preferredId = rowValue(row, "portfolioid"),
        preferredName = rowValue(row, "portfel", "portfolio"),
        fallbackId = defaultPortfolioId,
    )
    val accountId = workspace.ensureAccount(
        preferredId = rowValue(row, "accountid"),
        preferredName = rowValue(row, "konto", "account"),
        fallbackId = defaultAccountId,
    )

    return MappedOperation(
        id = workspace.newOperationId(),
        date = normalizeDate(rowValue(row, "data", "date", "czas", "time")),
        type = opType,
        portfolioId = portfolioId,
        accountId = accountId,
        assetId = workspace.ensureAsset(instrument),
        targetAssetId = "",
        quantity = quantity,
        targetQuantity = 0.0,
        price = price,
        amount = amount,
        fee = fee,
        currency = textOrFallback(rowValue(row, "waluta", "currency"), workspace.baseCurrency),
        tags = listOf("bossa"),
        note = rowValue(row, "notatka", "note", "comment"),
        createdAt = workspace.now(),
    )
}

private val TICKER_IN_PARENTHESES = Regex("""\(([A-Za-z0-9._-]{1,12})\)""")
private val TICKER_SEPARATORS = Regex("""[\s,;:/\\|+\-]+""")
private val TICKER_STOP_WORDS = setOf(
    "INC", "PLC", "ETF", "SA", "NV", "CORP", "CLASS", "SHARES", "COMMON", "USD", "EUR", "PLN",
)

/**
 * backend/importers.py `_extract_degiro_ticker`: recover a symbol from a product description.
 *
 * DEGIRO and IBKR name the instrument rather than its ticker, so "Apple Inc (AAPL)" or
 * "CDPROJEKT SA" has to yield AAPL and CDPROJEKT. The ISIN is the last resort.
 */
fun extractTicker(product: String?, isin: String?): String {
    val source = (product ?: "").trim()
    if (source.isEmpty()) return (isin ?: "").trim().uppercase()

    TICKER_IN_PARENTHESES.find(source)?.let { match ->
        val candidate = match.groupValues[1].uppercase().trim()
        if (candidate.isNotEmpty()) return candidate
    }

    for (token in TICKER_SEPARATORS.split(source.uppercase())) {
        val trimmed = token.trim()
        if (trimmed.isEmpty() || trimmed.any { it.isDigit() }) continue
        if (trimmed in TICKER_STOP_WORDS) continue
        if (trimmed.length in 1..8) return trimmed
    }
    return (isin ?: "").trim().uppercase()
}

private val XTB_TRADE_COMMENT = Regex(
    """(?:OPEN|CLOSE)\s+(?:BUY|SELL)\s+([0-9]+(?:[.,][0-9]+)?)\s*@\s*([0-9]+(?:[.,][0-9]+)?)""",
    RegexOption.IGNORE_CASE,
)

/** backend/importers.py `_parse_xtb_trade_comment`: returns quantity to price. */
fun parseXtbTradeComment(comment: String?): Pair<Double, Double> {
    val match = XTB_TRADE_COMMENT.find(comment ?: "") ?: return 0.0 to 0.0
    return toNum(match.groupValues[1]) to toNum(match.groupValues[2])
}
