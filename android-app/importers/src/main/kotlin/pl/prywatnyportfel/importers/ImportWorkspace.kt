package pl.prywatnyportfel.importers

/** A portfolio as the importer needs to see it. */
data class PortfolioRow(val id: String, val name: String)

/** An account as the importer needs to see it. */
data class AccountRow(val id: String, val name: String)

/** An asset as the importer needs to see it; [name] is mutable because `_ensure_asset` renames. */
data class AssetRow(val id: String, val ticker: String, var name: String)

/**
 * Entity resolution during an import, ported from the `_ensure_*` helpers in backend/importers.py.
 *
 * The phone resolved the portfolio and the account once for the whole file and matched assets by
 * ticker alone. The server resolves both per row — a CSV may name a different portfolio on each
 * line — and matches an asset by ticker *or* name. On a file that names portfolios per row the two
 * sides therefore filed the same operations against different portfolios.
 *
 * The caller owns the state; this class only reports what it created so the caller can append it.
 */
class ImportWorkspace(
    val baseCurrency: String,
    portfolios: List<PortfolioRow>,
    accounts: List<AccountRow>,
    assets: List<AssetRow>,
    private val idFactory: (String) -> String,
    private val timestamp: () -> String,
) {
    private val portfolios = portfolios.toMutableList()
    private val accounts = accounts.toMutableList()
    private val assets = assets.toMutableList()

    /** Rows to append to state, already shaped the way backend/importers.py shapes them. */
    val createdPortfolios = mutableListOf<Map<String, Any?>>()
    val createdAccounts = mutableListOf<Map<String, Any?>>()
    val createdAssets = mutableListOf<Map<String, Any?>>()

    /** Existing assets whose name `_ensure_asset` replaced, as asset id to new name. */
    val renamedAssets = mutableMapOf<String, String>()

    val createdCounts: Map<String, Int>
        get() = mapOf(
            "assets" to createdAssets.size,
            "accounts" to createdAccounts.size,
            "portfolios" to createdPortfolios.size,
        )

    /** backend/importers.py `_ensure_portfolio`. */
    fun ensurePortfolio(preferredId: String = "", preferredName: String = "", fallbackId: String = ""): String {
        if (preferredId.isNotEmpty()) {
            portfolios.firstOrNull { it.id == preferredId }?.let { return it.id }
        }
        if (preferredName.isNotEmpty()) {
            val wanted = preferredName.trim().lowercase()
            portfolios.firstOrNull { it.name.trim().lowercase() == wanted }?.let { return it.id }
        }
        if (fallbackId.isNotEmpty()) {
            portfolios.firstOrNull { it.id == fallbackId }?.let { return it.id }
        }
        portfolios.firstOrNull()?.let { return it.id }

        val id = idFactory("ptf")
        val name = textOrFallback(preferredName, "Import")
        portfolios += PortfolioRow(id, name)
        createdPortfolios += mapOf(
            "id" to id,
            "name" to name,
            "currency" to baseCurrency,
            "benchmark" to "",
            "goal" to "",
            "parentId" to "",
            "twinOf" to "",
            "groupName" to "",
            "isPublic" to false,
            "createdAt" to timestamp(),
        )
        return id
    }

    /** backend/importers.py `_ensure_account`. */
    fun ensureAccount(preferredId: String = "", preferredName: String = "", fallbackId: String = ""): String {
        if (preferredId.isNotEmpty()) {
            accounts.firstOrNull { it.id == preferredId }?.let { return it.id }
        }
        if (preferredName.isNotEmpty()) {
            val wanted = preferredName.trim().lowercase()
            accounts.firstOrNull { it.name.trim().lowercase() == wanted }?.let { return it.id }
        }
        if (fallbackId.isNotEmpty()) {
            accounts.firstOrNull { it.id == fallbackId }?.let { return it.id }
        }
        accounts.firstOrNull()?.let { return it.id }

        val id = idFactory("acc")
        val name = textOrFallback(preferredName, "Konto importu")
        accounts += AccountRow(id, name)
        createdAccounts += mapOf(
            "id" to id,
            "name" to name,
            "type" to "Broker",
            "currency" to baseCurrency,
            "createdAt" to timestamp(),
        )
        return id
    }

    /** backend/importers.py `_ensure_asset`. */
    fun ensureAsset(
        token: String,
        preferredName: String = "",
        assetType: String = "Inny",
        currency: String = "",
    ): String {
        val text = token.trim()
        if (text.isEmpty()) return ""
        val lookup = text.lowercase()
        val name = textOrFallback(preferredName, text.uppercase())

        for (row in assets) {
            if (row.id == text) return row.id
            if (row.ticker.lowercase() == lookup || row.name.lowercase() == lookup) {
                // A placeholder name equal to the ticker is replaced once a real one arrives.
                if (preferredName.isNotEmpty() && row.name == row.ticker) {
                    row.name = preferredName
                    renamedAssets[row.id] = preferredName
                }
                return row.id
            }
        }

        val id = idFactory("ast")
        assets += AssetRow(id, text.uppercase(), name)
        createdAssets += mapOf(
            "id" to id,
            "ticker" to text.uppercase(),
            "name" to name,
            "type" to textOrFallback(assetType, "Inny"),
            "currency" to textOrFallback(currency, baseCurrency),
            "currentPrice" to 0.0,
            "risk" to 5.0,
            "sector" to "",
            "industry" to "",
            "tags" to emptyList<String>(),
            "benchmark" to "",
            "createdAt" to timestamp(),
        )
        return id
    }

    internal fun newOperationId(): String = idFactory("op")

    internal fun now(): String = timestamp()
}
