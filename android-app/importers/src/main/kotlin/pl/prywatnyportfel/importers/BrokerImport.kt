package pl.prywatnyportfel.importers

/** What one import produced. Mirrors the dict `BrokerImporter.import_csv` returns. */
data class ImportResult(
    val broker: String,
    val rowCount: Int,
    val importedCount: Int,
    val operations: List<MappedOperation>,
    val created: Map<String, Int>,
)

/**
 * The offline half of backend/importers.py `BrokerImporter`.
 *
 * The caller supplies a workspace over its own state, receives the operations and the entities the
 * import created, and writes them back. Nothing here touches storage or Android.
 */
object BrokerImport {

    fun listBrokers(): List<BrokerSpec> = SUPPORTED_BROKERS.values.toList()

    /**
     * @throws IllegalArgumentException on an unknown broker or a file missing required headers,
     * exactly where the Python importer raises ValueError.
     */
    fun importCsv(
        broker: String,
        csvText: String,
        workspace: ImportWorkspace,
        preferredPortfolioId: String = "",
        preferredPortfolioName: String = "",
        preferredAccountId: String = "",
        preferredAccountName: String = "",
    ): ImportResult {
        val brokerId = broker.trim().lowercase()
        if (brokerId !in SUPPORTED_BROKERS) {
            throw IllegalArgumentException("Unsupported broker: $brokerId")
        }

        val rows = parseCsvRows(csvText)
        validateRequiredHeaders(brokerId, rows)

        val defaultPortfolioId = workspace.ensurePortfolio(
            preferredId = preferredPortfolioId.trim(),
            preferredName = preferredPortfolioName.trim(),
        )
        val defaultAccountId = workspace.ensureAccount(
            preferredId = preferredAccountId.trim(),
            preferredName = preferredAccountName.trim(),
        )

        val mapper = pickMapper(brokerId)
        val operations = mutableListOf<MappedOperation>()
        for (rawRow in rows) {
            val row = normalizeRowKeys(rawRow)
            val mapped = mapper(row, workspace, defaultPortfolioId, defaultAccountId) ?: continue
            operations += mapped
        }

        return ImportResult(
            broker = brokerId,
            rowCount = rows.size,
            importedCount = operations.size,
            operations = operations,
            created = workspace.createdCounts,
        )
    }
}
