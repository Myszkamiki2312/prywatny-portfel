package pl.prywatnyportfel.importers

import java.io.File
import org.json.JSONArray
import org.json.JSONObject
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.fail

/**
 * Kotlin half of the shared broker-import contract.
 *
 * Reads the very same tests/fixtures/importer-spec.json that tests/test_importer_spec.py reads. The
 * cases are real export shapes, each one a place where the phone's own importer used to disagree
 * with the server: a preamble before the header, a dd/MM/yyyy date, punctuated IBKR column names, a
 * side that only the sign of the quantity reveals, a portfolio named per row.
 */
class ImporterSpecTest {

    private fun specFile(): File {
        // Gradle runs tests from the module directory; the fixture lives at the repository root.
        var dir: File? = File(System.getProperty("user.dir"))
        while (dir != null) {
            val candidate = File(dir, "tests/fixtures/importer-spec.json")
            if (candidate.isFile) return candidate
            dir = dir.parentFile
        }
        fail("tests/fixtures/importer-spec.json not found above ${System.getProperty("user.dir")}")
    }

    private fun spec(): JSONObject = JSONObject(specFile().readText())

    /** Ids only have to be unique and stable within one case; nothing compares them. */
    private class SequentialIds {
        private var counter = 0
        fun next(prefix: String): String {
            counter += 1
            return "${prefix}_$counter"
        }
    }

    @Test
    fun `every case matches the shared expectation`() {
        val spec = spec()
        val baseCurrency = spec.getString("baseCurrency")
        val cases = spec.getJSONArray("cases")
        assertTrue(cases.length() > 0, "The spec must carry at least one case.")

        for (index in 0 until cases.length()) {
            val case = cases.getJSONObject(index)
            val name = case.getString("name")

            val ids = SequentialIds()
            val portfolios = case.getJSONArray("portfolios").objects()
                .map { PortfolioRow(it.getString("id"), it.getString("name")) }
            val accounts = case.getJSONArray("accounts").objects()
                .map { AccountRow(it.getString("id"), it.getString("name")) }
            val assets = case.getJSONArray("assets").objects()
                .map { AssetRow(it.getString("id"), it.getString("ticker"), it.getString("name")) }

            val workspace = ImportWorkspace(
                baseCurrency = baseCurrency,
                portfolios = portfolios,
                accounts = accounts,
                assets = assets,
                idFactory = ids::next,
                timestamp = { "2026-01-01T00:00:00+00:00" },
            )
            val options = case.getJSONObject("options")
            val result = BrokerImport.importCsv(
                broker = case.getString("broker"),
                csvText = case.getString("csv"),
                workspace = workspace,
                preferredPortfolioId = options.optString("portfolioId", ""),
                preferredPortfolioName = options.optString("portfolioName", ""),
                preferredAccountId = options.optString("accountId", ""),
                preferredAccountName = options.optString("accountName", ""),
            )

            val expected = case.getJSONObject("expected")
            assertEquals(expected.getInt("rowCount"), result.rowCount, "$name: row count")
            assertEquals(expected.getInt("importedCount"), result.importedCount, "$name: imported count")

            val expectedCreated = expected.getJSONObject("created")
            for (key in listOf("assets", "accounts", "portfolios")) {
                assertEquals(
                    expectedCreated.getInt(key),
                    result.created[key],
                    "$name: created $key",
                )
            }

            // Names and tickers, including the entities this import created.
            val portfolioNames = portfolios.associate { it.id to it.name }.toMutableMap()
            workspace.createdPortfolios.forEach { portfolioNames[it["id"] as String] = it["name"] as String }
            val accountNames = accounts.associate { it.id to it.name }.toMutableMap()
            workspace.createdAccounts.forEach { accountNames[it["id"] as String] = it["name"] as String }
            val assetTickers = assets.associate { it.id to it.ticker }.toMutableMap()
            workspace.createdAssets.forEach { assetTickers[it["id"] as String] = it["ticker"] as String }

            val expectedOperations = expected.getJSONArray("operations").objects()
            assertEquals(expectedOperations.size, result.operations.size, "$name: operation count")

            for ((position, operation) in result.operations.withIndex()) {
                val wanted = expectedOperations[position]
                val label = "$name: operation $position"
                assertEquals(wanted.getString("date"), operation.date, "$label date")
                assertEquals(wanted.getString("type"), operation.type, "$label type")
                assertEquals(
                    wanted.getString("portfolio"),
                    portfolioNames[operation.portfolioId] ?: "?",
                    "$label portfolio",
                )
                assertEquals(
                    wanted.getString("account"),
                    accountNames[operation.accountId] ?: "?",
                    "$label account",
                )
                assertEquals(
                    wanted.getString("assetTicker"),
                    assetTickers[operation.assetId] ?: "",
                    "$label asset",
                )
                assertEquals(
                    wanted.getString("targetAssetTicker"),
                    assetTickers[operation.targetAssetId] ?: "",
                    "$label target asset",
                )
                assertEquals(wanted.getDouble("quantity"), operation.quantity, 1e-9, "$label quantity")
                assertEquals(
                    wanted.getDouble("targetQuantity"),
                    operation.targetQuantity,
                    1e-9,
                    "$label target quantity",
                )
                assertEquals(wanted.getDouble("price"), operation.price, 1e-9, "$label price")
                assertEquals(wanted.getDouble("amount"), operation.amount, 1e-9, "$label amount")
                assertEquals(wanted.getDouble("fee"), operation.fee, 1e-9, "$label fee")
                assertEquals(wanted.getString("currency"), operation.currency, "$label currency")
                assertEquals(wanted.getString("note"), operation.note, "$label note")
                assertEquals(
                    wanted.getJSONArray("tags").objectsAsStrings(),
                    operation.tags,
                    "$label tags",
                )
            }
        }
    }

    @Test
    fun `the spec covers every supported broker`() {
        val covered = spec().getJSONArray("cases").objects().map { it.getString("broker") }.toSet()
        assertEquals(SUPPORTED_BROKERS.keys, covered)
    }

    private fun JSONArray.objects(): List<JSONObject> =
        (0 until length()).map { getJSONObject(it) }

    private fun JSONArray.objectsAsStrings(): List<String> =
        (0 until length()).map { getString(it) }
}
