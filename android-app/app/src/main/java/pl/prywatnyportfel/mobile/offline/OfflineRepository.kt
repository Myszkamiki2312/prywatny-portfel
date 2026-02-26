package pl.prywatnyportfel.mobile.offline

import android.content.Context
import io.ktor.http.Parameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import kotlin.math.roundToInt

data class ApiDispatchResult(
    val status: Int,
    val body: String
)

data class OfflineMetrics(
    val portfolioId: String,
    val marketValue: Double,
    val cashTotal: Double,
    val netWorth: Double,
    val totalPL: Double
)

class OfflineRepository(private val context: Context) {
    private val dao = OfflineDatabase.get(context).dao()

    suspend fun dispatch(
        method: String,
        apiPath: String,
        query: Parameters,
        bodyText: String
    ): ApiDispatchResult {
        val path = normalizePath(apiPath)
        return try {
            when {
                method == "GET" && path == "/health" -> ok(
                    JSONObject()
                        .put("status", "ok")
                        .put("serverTime", nowIso())
                        .put("mode", "android-offline")
                )

                method == "GET" && path == "/state" -> {
                    val stateJson = ensureStateJson()
                    ok(rawJsonObject("state", stateJson))
                }

                method == "PUT" && path == "/state" -> {
                    val stateJson = extractStateJsonFromPayload(bodyText)
                    dao.upsertStateSnapshot(
                        StateSnapshotEntity(
                            stateJson = stateJson,
                            updatedAt = nowIso()
                        )
                    )
                    ok(JSONObject().put("saved", true).put("state", JSONObject(stateJson)))
                }

                method == "GET" && path == "/reports/catalog" -> ok(
                    JSONObject().put("reports", reportCatalogJson())
                )

                method == "POST" && path == "/reports/generate" -> {
                    val payload = safeJsonObject(bodyText)
                    val reportName = payload.optString("reportName", "Statystyki portfela")
                    val portfolioId = payload.optString("portfolioId", "")
                    val metrics = computeMetrics(portfolioId)
                    val report = JSONObject()
                        .put("reportName", reportName)
                        .put("info", "$reportName | Offline Android")
                        .put("headers", JSONArray().put("Metryka").put("Wartość"))
                        .put(
                            "rows",
                            JSONArray()
                                .put(JSONArray().put("Wartość rynkowa").put(round2(metrics.marketValue)))
                                .put(JSONArray().put("Gotówka").put(round2(metrics.cashTotal)))
                                .put(JSONArray().put("Wartość netto").put(round2(metrics.netWorth)))
                                .put(JSONArray().put("Całkowity zysk/strata").put(round2(metrics.totalPL)))
                        )
                        .put(
                            "chart",
                            JSONObject()
                                .put("labels", JSONArray().put(todayIso()))
                                .put("values", JSONArray().put(round2(metrics.netWorth)))
                                .put("color", "#0e7a64")
                        )
                    ok(JSONObject().put("report", report))
                }

                method == "GET" && path == "/metrics/portfolio" -> {
                    val portfolioId = query["portfolioId"].orEmpty()
                    val metrics = computeMetrics(portfolioId)
                    ok(
                        JSONObject().put(
                            "metrics",
                            JSONObject()
                                .put("portfolioId", metrics.portfolioId)
                                .put("marketValue", round2(metrics.marketValue))
                                .put("cashTotal", round2(metrics.cashTotal))
                                .put("netWorth", round2(metrics.netWorth))
                                .put("totalPL", round2(metrics.totalPL))
                        )
                    )
                }

                method == "GET" && path == "/import/brokers" -> ok(
                    JSONObject().put(
                        "brokers",
                        JSONArray()
                            .put(JSONObject().put("id", "generic").put("name", "Generic CSV"))
                            .put(JSONObject().put("id", "xtb").put("name", "XTB"))
                            .put(JSONObject().put("id", "mbank").put("name", "mBank"))
                            .put(JSONObject().put("id", "degiro").put("name", "DeGiro"))
                            .put(JSONObject().put("id", "ibkr").put("name", "Interactive Brokers"))
                            .put(JSONObject().put("id", "bossa").put("name", "BOSSA"))
                    )
                )

                method == "POST" && path.startsWith("/import/broker/") -> {
                    ok(
                        JSONObject().put(
                            "import",
                            JSONObject()
                                .put("broker", path.removePrefix("/import/broker/"))
                                .put("inserted", 0)
                                .put("skipped", 0)
                                .put("errors", JSONArray())
                                .put("offline", true)
                        )
                    )
                }

                method == "GET" && path == "/quotes" -> {
                    val tickers = (query["tickers"] ?: "")
                        .split(",")
                        .map { it.trim().uppercase() }
                        .filter { it.isNotEmpty() }
                    val quotes = listQuotes(tickers)
                    ok(JSONObject().put("quotes", quotes))
                }

                method == "POST" && path == "/quotes/refresh" -> {
                    val payload = safeJsonObject(bodyText)
                    val tickersArray = payload.optJSONArray("tickers") ?: JSONArray()
                    val requestedTickers = mutableListOf<String>()
                    for (index in 0 until tickersArray.length()) {
                        requestedTickers += tickersArray.optString(index, "").uppercase().trim()
                    }
                    val refreshed = refreshQuotes(requestedTickers.filter { it.isNotBlank() })
                    ok(JSONObject().put("quotes", refreshed))
                }

                method == "GET" && path == "/tools/realtime/status" -> ok(realtimeStatusObject())
                method == "PUT" && path == "/tools/realtime/config" -> {
                    val payload = safeJsonObject(bodyText)
                    saveJsonConfig(KEY_REALTIME_CONFIG, payload)
                    ok(JSONObject().put("status", realtimeStatusObject()))
                }

                method == "POST" && path == "/tools/realtime/start" -> {
                    val cfg = realtimeConfig()
                    cfg.put("enabled", true)
                    saveJsonConfig(KEY_REALTIME_CONFIG, cfg)
                    ok(realtimeStatusObject())
                }

                method == "POST" && path == "/tools/realtime/stop" -> {
                    val cfg = realtimeConfig()
                    cfg.put("enabled", false)
                    saveJsonConfig(KEY_REALTIME_CONFIG, cfg)
                    ok(realtimeStatusObject())
                }

                method == "POST" && path == "/tools/realtime/run" -> {
                    val workflow = JSONObject()
                        .put("summary", JSONObject().put("triggered", 0).put("totalAlerts", 0))
                    val result = JSONObject().put("workflow", workflow)
                    ok(JSONObject().put("status", realtimeStatusObject()).put("result", result))
                }

                method == "GET" && path == "/tools/notifications/config" -> ok(
                    JSONObject().put("config", notificationConfig())
                )

                method == "PUT" && path == "/tools/notifications/config" -> {
                    val payload = safeJsonObject(bodyText)
                    saveJsonConfig(KEY_NOTIFICATION_CONFIG, payload)
                    ok(JSONObject().put("config", notificationConfig()))
                }

                method == "POST" && path == "/tools/notifications/test" -> {
                    appendNotificationHistory(
                        JSONObject()
                            .put("createdAt", nowIso())
                            .put("channel", "local")
                            .put("alert", "Test")
                            .put("status", "sent")
                            .put("message", "Offline test notification")
                    )
                    ok(
                        JSONObject().put(
                            "result",
                            JSONObject()
                                .put("sent", 1)
                                .put("errors", 0)
                                .put("message", "Offline test notification sent.")
                        )
                    )
                }

                method == "GET" && path == "/tools/notifications/history" -> {
                    val limit = query["limit"]?.toIntOrNull()?.coerceIn(1, 500) ?: 100
                    ok(JSONObject().put("history", notificationHistory(limit)))
                }

                method == "GET" && path == "/tools/backup/config" -> ok(JSONObject().put("config", backupConfig()))
                method == "PUT" && path == "/tools/backup/config" -> {
                    val payload = safeJsonObject(bodyText)
                    val merged = backupConfig().apply {
                        keys().forEach { key -> if (payload.has(key)) put(key, payload.opt(key)) }
                    }
                    saveJsonConfig(KEY_BACKUP_CONFIG, merged)
                    ok(JSONObject().put("config", merged))
                }

                method == "POST" && path == "/tools/backup/run" -> {
                    val backupRow = runBackup()
                    ok(JSONObject().put("backup", backupRow))
                }

                method == "POST" && path == "/tools/backup/verify" -> {
                    val verify = verifyLastBackup()
                    ok(JSONObject().put("verify", verify))
                }

                method == "GET" && path == "/tools/backup/runs" -> {
                    val limit = query["limit"]?.toIntOrNull()?.coerceIn(1, 500) ?: 60
                    ok(JSONObject().put("runs", backupRuns(limit)))
                }

                method == "GET" && path == "/tools/monitoring/status" -> ok(monitoringStatus())
                method == "GET" && path == "/tools/healthcheck" -> ok(healthcheckStatus())

                method == "GET" && path == "/tools/errors" -> {
                    val limit = query["limit"]?.toIntOrNull()?.coerceIn(1, 2000) ?: 120
                    ok(JSONObject().put("logs", errorLogs(limit)))
                }

                method == "POST" && path == "/tools/errors/log" -> {
                    val payload = safeJsonObject(bodyText)
                    val logged = logError(
                        source = payload.optString("source", "client"),
                        level = payload.optString("level", "error"),
                        method = payload.optString("method", ""),
                        path = payload.optString("path", ""),
                        message = payload.optString("message", ""),
                        detailsJson = payload.optJSONObject("details")?.toString() ?: "{}"
                    )
                    ok(JSONObject().put("logged", true).put("error", logged))
                }

                method == "POST" && path == "/tools/errors/clear" -> {
                    val payload = safeJsonObject(bodyText)
                    val keepLast = payload.optInt("keepLast", 0).coerceAtLeast(0)
                    val cleared = clearErrorLogs(keepLast)
                    ok(cleared)
                }

                method == "POST" && path == "/tools/scanner" -> ok(JSONObject().put("items", JSONArray()))
                method == "GET" && path == "/tools/signals" -> ok(JSONObject().put("signals", JSONArray()))
                method == "GET" && path == "/tools/calendar" -> ok(JSONObject().put("events", JSONArray()))
                method == "GET" && path == "/tools/recommendations" -> ok(JSONObject().put("recommendations", JSONArray()))
                method == "POST" && path == "/tools/alerts/run" -> ok(
                    JSONObject()
                        .put("summary", JSONObject().put("triggered", 0).put("totalAlerts", 0))
                        .put("history", JSONArray())
                        .put("triggered", JSONArray())
                )

                method == "GET" && path == "/tools/alerts/history" -> ok(JSONObject().put("history", JSONArray()))
                method == "GET" && path == "/tools/charts/candles" -> ok(
                    JSONObject()
                        .put("ticker", query["ticker"].orEmpty())
                        .put("signal", "HOLD")
                        .put("indicators", JSONObject())
                        .put("candles", JSONArray())
                )

                method == "GET" && path == "/tools/charts/tradingview" -> {
                    val ticker = query["ticker"].orEmpty()
                    val tv = "https://www.tradingview.com/chart/?symbol=${ticker.ifBlank { "AAPL" }}"
                    ok(JSONObject().put("embedUrl", tv).put("url", tv).put("ticker", ticker).put("signal", "HOLD"))
                }

                method == "GET" && path == "/tools/catalyst" -> ok(JSONObject().put("rows", JSONArray()))
                method == "GET" && path == "/tools/funds/ranking" -> ok(JSONObject().put("rows", JSONArray()))
                method == "GET" && path == "/tools/espi" -> ok(JSONObject().put("items", JSONArray()))
                method == "POST" && path == "/tools/tax/optimize" -> ok(taxOptimize(safeJsonObject(bodyText)))
                method == "POST" && path == "/tools/tax/foreign-dividend" -> ok(taxForeignDividend(safeJsonObject(bodyText)))
                method == "POST" && path == "/tools/tax/crypto" -> ok(taxCrypto(safeJsonObject(bodyText)))
                method == "POST" && path == "/tools/tax/foreign-interest" -> ok(taxForeignInterest(safeJsonObject(bodyText)))
                method == "POST" && path == "/tools/tax/bond-interest" -> ok(taxBondInterest(safeJsonObject(bodyText)))
                method == "GET" && path == "/tools/forum" -> ok(JSONObject().put("posts", forumPosts()))
                method == "POST" && path == "/tools/forum/post" -> ok(postForum(safeJsonObject(bodyText)))
                method == "DELETE" && path.startsWith("/tools/forum/post/") -> ok(deleteForumPost(path.removePrefix("/tools/forum/post/")))
                method == "POST" && path == "/tools/options/exercise-price" -> ok(optionExercisePrice(safeJsonObject(bodyText)))
                method == "GET" && path == "/tools/options/positions" -> ok(JSONObject().put("rows", optionPositions()))
                method == "POST" && path == "/tools/options/positions" -> ok(saveOptionPosition(safeJsonObject(bodyText)))
                method == "DELETE" && path.startsWith("/tools/options/positions/") -> ok(deleteOptionPosition(path.removePrefix("/tools/options/positions/")))
                method == "GET" && path == "/tools/model-portfolio" -> ok(JSONObject().put("model", modelPortfolio()))
                method == "PUT" && path == "/tools/model-portfolio" -> ok(saveModelPortfolio(safeJsonObject(bodyText)))
                method == "GET" && path == "/tools/model-portfolio/compare" -> ok(compareModelPortfolio())
                method == "GET" && path == "/tools/public-portfolios" -> ok(publicPortfolios())
                method == "POST" && path == "/tools/public-portfolios/clone" -> ok(clonePublicPortfolio(safeJsonObject(bodyText)))

                path.startsWith("/tools/") -> ok(JSONObject())
                else -> notFound("Endpoint not found: $path")
            }
        } catch (error: Exception) {
            val logged = logError(
                source = "server",
                level = "error",
                method = method,
                path = path,
                message = error.message ?: "Internal error",
                detailsJson = JSONObject().put("type", error::class.java.simpleName).toString()
            )
            ApiDispatchResult(
                status = 500,
                body = JSONObject()
                    .put("error", "Internal server error")
                    .put("id", logged.optLong("id", 0L))
                    .toString()
            )
        }
    }

    private suspend fun listQuotes(tickers: List<String>): JSONArray {
        val rows = if (tickers.isEmpty()) dao.listQuotes() else dao.listQuotesByTickers(tickers)
        val json = JSONArray()
        rows.forEach { row ->
            json.put(
                JSONObject()
                    .put("ticker", row.ticker)
                    .put("price", row.price)
                    .put("currency", row.currency)
                    .put("provider", row.provider)
                    .put("fetchedAt", row.fetchedAt)
                    .put("fetched_at", row.fetchedAt)
                    .put("ageSeconds", ageSeconds(row.fetchedAt))
                    .put("stale", ageSeconds(row.fetchedAt) > 15 * 60)
                    .put("source", "offline-cache")
            )
        }
        return json
    }

    private suspend fun refreshQuotes(requestedTickers: List<String>): JSONArray {
        val state = JSONObject(ensureStateJson())
        val assets = state.optJSONArray("assets") ?: JSONArray()
        val availableByTicker = HashMap<String, JSONObject>()
        for (idx in 0 until assets.length()) {
            val asset = assets.optJSONObject(idx) ?: continue
            val ticker = asset.optString("ticker", "").uppercase().trim()
            if (ticker.isNotEmpty()) {
                availableByTicker[ticker] = asset
            }
        }

        val targetTickers = if (requestedTickers.isNotEmpty()) {
            requestedTickers
        } else {
            availableByTicker.keys.toList()
        }

        val rows = mutableListOf<QuoteEntity>()
        for (ticker in targetTickers) {
            val asset = availableByTicker[ticker]
            val cachedPrice = asset?.optDouble("currentPrice", 0.0) ?: 0.0
            val quote = withContext(Dispatchers.IO) { QuoteFetcher.fetch(ticker) }
            val price = when {
                quote != null && quote.price > 0.0 -> quote.price
                cachedPrice > 0.0 -> cachedPrice
                else -> 0.0
            }
            val currency = when {
                quote != null -> quote.currency
                asset != null -> asset.optString("currency", "PLN")
                else -> "PLN"
            }
            rows += QuoteEntity(
                ticker = ticker,
                price = round2(price),
                currency = currency,
                provider = quote?.provider ?: if (price > 0) "offline-asset" else "offline",
                fetchedAt = nowIso()
            )
        }
        if (rows.isNotEmpty()) {
            dao.upsertQuotes(rows)
        }
        return listQuotes(targetTickers)
    }

    private suspend fun ensureStateJson(): String {
        val existing = dao.getStateSnapshot()?.stateJson
        if (!existing.isNullOrBlank()) {
            return existing
        }
        val generated = defaultStateJson()
        dao.upsertStateSnapshot(StateSnapshotEntity(stateJson = generated, updatedAt = nowIso()))
        return generated
    }

    private fun defaultStateJson(): String {
        val createdAt = nowIso()
        val root = JSONObject()
            .put(
                "meta",
                JSONObject()
                    .put("activePlan", "Expert")
                    .put("baseCurrency", "PLN")
                    .put("createdAt", createdAt)
            )
            .put(
                "portfolios",
                JSONArray().put(
                    JSONObject()
                        .put("id", "ptf-main")
                        .put("name", "Główny")
                        .put("currency", "PLN")
                        .put("benchmark", "WIG20")
                        .put("goal", "Długoterminowy wzrost")
                        .put("parentId", "")
                        .put("twinOf", "")
                        .put("groupName", "")
                        .put("isPublic", false)
                        .put("createdAt", createdAt)
                )
            )
            .put(
                "accounts",
                JSONArray().put(
                    JSONObject()
                        .put("id", "acc-main")
                        .put("name", "Konto podstawowe")
                        .put("type", "Broker")
                        .put("currency", "PLN")
                        .put("createdAt", createdAt)
                )
            )
            .put("assets", JSONArray())
            .put("operations", JSONArray())
            .put("recurringOps", JSONArray())
            .put("liabilities", JSONArray())
            .put("alerts", JSONArray())
            .put("notes", JSONArray())
            .put("strategies", JSONArray())
            .put("favorites", JSONArray())
        return root.toString()
    }

    private suspend fun computeMetrics(portfolioId: String): OfflineMetrics {
        val state = JSONObject(ensureStateJson())
        val operations = state.optJSONArray("operations") ?: JSONArray()
        val assets = state.optJSONArray("assets") ?: JSONArray()

        val assetById = HashMap<String, JSONObject>()
        for (index in 0 until assets.length()) {
            val row = assets.optJSONObject(index) ?: continue
            assetById[row.optString("id", "")] = row
        }

        val holdings = HashMap<String, Double>()
        var cash = 0.0
        var contributions = 0.0

        for (index in 0 until operations.length()) {
            val op = operations.optJSONObject(index) ?: continue
            val opPortfolioId = op.optString("portfolioId", "")
            if (portfolioId.isNotBlank() && opPortfolioId != portfolioId) {
                continue
            }
            val type = op.optString("type", "")
            val quantity = num(op.opt("quantity"))
            val price = num(op.opt("price"))
            val amountRaw = num(op.opt("amount"))
            val amount = if (amountRaw != 0.0) amountRaw else quantity * price
            val commission = num(op.opt("commission"))
            val assetId = op.optString("assetId", "")

            when (type) {
                "Operacja gotówkowa", "Wpłata", "Wpłata gotówkowa" -> {
                    cash += amount
                    contributions += amount
                }

                "Kupno waloru" -> {
                    cash -= amount + commission
                    if (assetId.isNotBlank()) {
                        holdings[assetId] = (holdings[assetId] ?: 0.0) + quantity
                    }
                }

                "Sprzedaż waloru" -> {
                    cash += amount - commission
                    if (assetId.isNotBlank()) {
                        holdings[assetId] = (holdings[assetId] ?: 0.0) - quantity
                    }
                }

                "Dywidenda", "Odsetki" -> cash += amount
                "Prowizja" -> cash -= kotlin.math.abs(amount)
                else -> {
                    // Keep other operations neutral for core offline metric pass.
                }
            }
        }

        var marketValue = 0.0
        holdings.forEach { (assetId, qty) ->
            if (qty <= 0.0) return@forEach
            val asset = assetById[assetId] ?: return@forEach
            if (portfolioId.isNotBlank()) {
                val assetPortfolioId = asset.optString("portfolioId", "")
                if (assetPortfolioId.isNotBlank() && assetPortfolioId != portfolioId) {
                    return@forEach
                }
            }
            val currentPrice = num(asset.opt("currentPrice"))
            marketValue += qty * currentPrice
        }

        val netWorth = marketValue + cash
        val totalPL = netWorth - contributions

        return OfflineMetrics(
            portfolioId = portfolioId,
            marketValue = round2(marketValue),
            cashTotal = round2(cash),
            netWorth = round2(netWorth),
            totalPL = round2(totalPL)
        )
    }

    private suspend fun realtimeStatusObject(): JSONObject {
        val config = realtimeConfig()
        return JSONObject()
            .put("running", config.optBoolean("enabled", false))
            .put("cronEnabled", config.optBoolean("enabled", false))
            .put("lastRunAt", config.optString("lastRunAt", ""))
            .put("config", config)
    }

    private suspend fun realtimeConfig(): JSONObject {
        val defaults = JSONObject()
            .put("enabled", false)
            .put("autoRefreshQuotes", true)
            .put("intervalMinutes", 15)
            .put("webhookSecret", "")
            .put("portfolioId", "")
        return jsonConfig(KEY_REALTIME_CONFIG, defaults)
    }

    private suspend fun notificationConfig(): JSONObject {
        val defaults = JSONObject()
            .put("enabled", false)
            .put("cooldownMinutes", 60)
            .put("emailEnabled", false)
            .put("smtpHost", "")
            .put("smtpPort", 587)
            .put("smtpUsername", "")
            .put("smtpPassword", "")
            .put("smtpFrom", "")
            .put("smtpTo", "")
            .put("smtpUseTls", true)
            .put("telegramEnabled", false)
            .put("telegramBotToken", "")
            .put("telegramChatId", "")
        return jsonConfig(KEY_NOTIFICATION_CONFIG, defaults)
    }

    private suspend fun backupConfig(): JSONObject {
        val defaults = JSONObject()
            .put("enabled", false)
            .put("intervalMinutes", 720)
            .put("keepLast", 30)
            .put("verifyAfterBackup", true)
            .put("includeStateJson", true)
            .put("includeDbCopy", true)
        return jsonConfig(KEY_BACKUP_CONFIG, defaults)
    }

    private suspend fun runBackup(): JSONObject {
        val cfg = backupConfig()
        val keepLast = cfg.optInt("keepLast", 30).coerceIn(1, 2000)
        val stateJson = ensureStateJson()

        val folder = File(context.filesDir, "backups")
        if (!folder.exists()) {
            folder.mkdirs()
        }
        val fileName = "backup-${timestampCompact()}.json"
        val backupFile = File(folder, fileName)
        backupFile.writeText(stateJson)

        val summary = JSONObject()
            .put("file", backupFile.absolutePath)
            .put("size", backupFile.length())
            .put("mode", "offline")

        val createdAt = nowIso()
        val row = BackupRunEntity(
            status = "success",
            verified = if (cfg.optBoolean("verifyAfterBackup", true)) 1 else 0,
            summaryJson = summary.toString(),
            createdAt = createdAt
        )
        dao.insertBackupRun(row)
        dao.trimBackupRuns(keepLast)

        return JSONObject()
            .put("status", "success")
            .put("verified", cfg.optBoolean("verifyAfterBackup", true))
            .put("createdAt", createdAt)
            .put("summary", summary)
    }

    private suspend fun verifyLastBackup(): JSONObject {
        val rows = dao.listBackupRuns(1)
        val last = rows.firstOrNull()
            ?: return JSONObject().put("ok", false).put("message", "Brak backupów.")

        val summary = safeJsonObject(last.summaryJson)
        val filePath = summary.optString("file", "")
        if (filePath.isBlank()) {
            return JSONObject().put("ok", false).put("message", "Brak ścieżki backupu.")
        }
        val backupFile = File(filePath)
        if (!backupFile.exists()) {
            return JSONObject().put("ok", false).put("message", "Plik backupu nie istnieje.")
        }
        return try {
            JSONObject(backupFile.readText())
            JSONObject().put("ok", true).put("message", "Restore-check OK.")
        } catch (_: Exception) {
            JSONObject().put("ok", false).put("message", "Backup JSON uszkodzony.")
        }
    }

    private suspend fun backupRuns(limit: Int): JSONArray {
        val rows = dao.listBackupRuns(limit)
        val arr = JSONArray()
        rows.forEach { row ->
            arr.put(
                JSONObject()
                    .put("status", row.status)
                    .put("verified", row.verified == 1)
                    .put("createdAt", row.createdAt)
                    .put("summary", safeJsonObject(row.summaryJson))
            )
        }
        return arr
    }

    private suspend fun monitoringStatus(): JSONObject {
        val state = JSONObject(ensureStateJson())
        val quotes = dao.listQuotes()
        val recentErrors = countErrorsLastHour()
        val counts = JSONObject()
            .put("portfolios", state.optJSONArray("portfolios")?.length() ?: 0)
            .put("accounts", state.optJSONArray("accounts")?.length() ?: 0)
            .put("assets", state.optJSONArray("assets")?.length() ?: 0)
            .put("operations", state.optJSONArray("operations")?.length() ?: 0)
            .put("alerts", state.optJSONArray("alerts")?.length() ?: 0)
            .put("liabilities", state.optJSONArray("liabilities")?.length() ?: 0)

        val quoteStats = quoteFreshness(quotes)
        val backupCfg = backupConfig()
        val backupLast = backupRuns(1).optJSONObject(0) ?: JSONObject()

        return JSONObject()
            .put("status", "ok")
            .put("serverTime", nowIso())
            .put("counts", counts)
            .put("quotes", quoteStats)
            .put("errors", JSONObject().put("lastHour", recentErrors))
            .put("realtime", realtimeStatusObject())
            .put("backup", JSONObject().put("config", backupCfg).put("lastRun", backupLast))
    }

    private suspend fun healthcheckStatus(): JSONObject {
        val monitoring = monitoringStatus()
        val checks = JSONArray()
            .put(JSONObject().put("key", "database").put("status", "ok").put("message", "SQLite/Room dostępne."))
            .put(
                JSONObject()
                    .put("key", "quotes")
                    .put("status", if ((monitoring.optJSONObject("quotes")?.optInt("stale") ?: 0) > 0) "warn" else "ok")
                    .put("message", "Sprawdzenie cache notowań zakończone.")
            )
            .put(
                JSONObject()
                    .put("key", "backup")
                    .put("status", "ok")
                    .put("message", "Konfiguracja backupu dostępna.")
            )
            .put(
                JSONObject()
                    .put("key", "errors")
                    .put("status", if ((monitoring.optJSONObject("errors")?.optInt("lastHour") ?: 0) > 0) "warn" else "ok")
                    .put(
                        "message",
                        "Błędy w ostatniej godzinie: ${monitoring.optJSONObject("errors")?.optInt("lastHour") ?: 0}"
                    )
            )

        val overall = if ((monitoring.optJSONObject("errors")?.optInt("lastHour") ?: 0) > 0) "warn" else "ok"
        return JSONObject()
            .put("status", overall)
            .put("serverTime", nowIso())
            .put("checks", checks)
    }

    private suspend fun logError(
        source: String,
        level: String,
        method: String,
        path: String,
        message: String,
        detailsJson: String
    ): JSONObject {
        dao.insertErrorLog(
            ErrorLogEntity(
                source = source.ifBlank { "client" },
                level = level.ifBlank { "error" },
                method = method,
                path = path,
                message = message.ifBlank { "Unknown error" },
                detailsJson = detailsJson,
                createdAt = nowIso()
            )
        )
        val latest = dao.listErrorLogs(1).firstOrNull()
        return if (latest == null) {
            JSONObject()
        } else {
            JSONObject()
                .put("id", latest.id)
                .put("source", latest.source)
                .put("level", latest.level)
                .put("method", latest.method)
                .put("path", latest.path)
                .put("message", latest.message)
                .put("detailsJson", latest.detailsJson)
                .put("createdAt", latest.createdAt)
        }
    }

    private suspend fun errorLogs(limit: Int): JSONArray {
        val rows = dao.listErrorLogs(limit)
        val arr = JSONArray()
        rows.forEach { row ->
            arr.put(
                JSONObject()
                    .put("id", row.id)
                    .put("source", row.source)
                    .put("level", row.level)
                    .put("method", row.method)
                    .put("path", row.path)
                    .put("message", row.message)
                    .put("detailsJson", row.detailsJson)
                    .put("createdAt", row.createdAt)
            )
        }
        return arr
    }

    private suspend fun clearErrorLogs(keepLast: Int): JSONObject {
        val before = dao.listErrorLogs(2000).size
        if (keepLast <= 0) {
            dao.clearAllErrorLogs()
        } else {
            dao.clearErrorLogsKeepLast(keepLast)
        }
        val after = dao.listErrorLogs(2000).size
        return JSONObject()
            .put("cleared", true)
            .put("deleted", (before - after).coerceAtLeast(0))
            .put("remaining", after)
    }

    private suspend fun countErrorsLastHour(): Int {
        val fromIso = OffsetDateTime.now(ZoneOffset.UTC).minusHours(1).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
        return dao.countErrorsSince("error", fromIso)
    }

    private suspend fun taxOptimize(payload: JSONObject): JSONObject {
        val gain = num(payload.opt("realizedGain"))
        val loss = num(payload.opt("realizedLoss"))
        val dividends = num(payload.opt("dividends"))
        val costs = num(payload.opt("costs"))
        val rate = num(payload.opt("taxRatePct")) / 100.0
        val baseBefore = (gain - loss + dividends - costs).coerceAtLeast(0.0)
        val taxBefore = baseBefore * rate
        return JSONObject()
            .put("taxableBaseBefore", round2(baseBefore))
            .put("taxBefore", round2(taxBefore))
            .put("taxableBaseAfter", round2(baseBefore))
            .put("taxAfter", round2(taxBefore))
            .put("taxSaved", 0.0)
            .put("actions", JSONArray())
    }

    private fun taxForeignDividend(payload: JSONObject): JSONObject {
        val gross = num(payload.opt("grossDividend"))
        val foreignPct = num(payload.opt("foreignWithholdingPct")) / 100.0
        val localPct = num(payload.opt("localTaxPct")) / 100.0
        val treatyCapPct = num(payload.opt("treatyCreditCapPct")) / 100.0
        val foreignWithheld = gross * foreignPct
        val localGrossTax = gross * localPct
        val credit = minOf(foreignWithheld, gross * treatyCapPct)
        val localDue = (localGrossTax - credit).coerceAtLeast(0.0)
        val net = gross - foreignWithheld - localDue
        return JSONObject()
            .put("foreignWithheld", round2(foreignWithheld))
            .put("localTaxDue", round2(localDue))
            .put("foreignRefundPotential", round2((foreignWithheld - credit).coerceAtLeast(0.0)))
            .put("netDividendAfterTax", round2(net))
    }

    private fun taxCrypto(payload: JSONObject): JSONObject {
        val proceeds = num(payload.opt("proceeds"))
        val acquisitionCost = num(payload.opt("acquisitionCost"))
        val transactionCosts = num(payload.opt("transactionCosts"))
        val carryForwardLoss = num(payload.opt("carryForwardLoss"))
        val beforeCarry = proceeds - acquisitionCost - transactionCosts
        val taxable = (beforeCarry - carryForwardLoss).coerceAtLeast(0.0)
        val tax = taxable * 0.19
        return JSONObject()
            .put("cryptoIncomeBeforeCarry", round2(beforeCarry))
            .put("taxableBase", round2(taxable))
            .put("taxDue", round2(tax))
    }

    private fun taxForeignInterest(payload: JSONObject): JSONObject {
        val gross = num(payload.opt("grossInterest"))
        val foreignPct = num(payload.opt("foreignWithholdingPct")) / 100.0
        val localPct = num(payload.opt("localTaxPct")) / 100.0
        val foreignWithheld = gross * foreignPct
        val localGrossTax = gross * localPct
        val localDue = (localGrossTax - foreignWithheld).coerceAtLeast(0.0)
        return JSONObject()
            .put("foreignWithheld", round2(foreignWithheld))
            .put("localTaxDue", round2(localDue))
            .put("netInterestAfterTax", round2(gross - foreignWithheld - localDue))
    }

    private fun taxBondInterest(payload: JSONObject): JSONObject {
        val couponInterest = num(payload.opt("couponInterest"))
        val discountGain = num(payload.opt("discountGain"))
        val costs = num(payload.opt("costs"))
        val taxRatePct = num(payload.opt("taxRatePct")).coerceAtLeast(0.0)
        val base = (couponInterest + discountGain - costs).coerceAtLeast(0.0)
        return JSONObject()
            .put("taxableBase", round2(base))
            .put("taxDue", round2(base * (taxRatePct / 100.0)))
    }

    private suspend fun forumPosts(): JSONArray {
        return jsonConfig(KEY_FORUM_POSTS, JSONArray()).optJSONArray("items") ?: JSONArray()
    }

    private suspend fun postForum(payload: JSONObject): JSONObject {
        val items = forumPosts()
        val row = JSONObject(payload.toString())
            .put("id", "post-${System.currentTimeMillis()}")
            .put("createdAt", nowIso())
        val next = JSONArray().put(row)
        for (i in 0 until items.length()) {
            next.put(items.opt(i))
        }
        saveJsonConfig(KEY_FORUM_POSTS, JSONObject().put("items", next))
        return JSONObject().put("saved", true)
    }

    private suspend fun deleteForumPost(id: String): JSONObject {
        val items = forumPosts()
        val next = JSONArray()
        for (i in 0 until items.length()) {
            val row = items.optJSONObject(i) ?: continue
            if (row.optString("id", "") != id) {
                next.put(row)
            }
        }
        saveJsonConfig(KEY_FORUM_POSTS, JSONObject().put("items", next))
        return JSONObject().put("deleted", true)
    }

    private suspend fun optionPositions(): JSONArray {
        val items = jsonConfig(KEY_OPTION_POSITIONS, JSONArray()).optJSONArray("items") ?: JSONArray()
        val quoteRows = dao.listQuotes()
        val quotesByTicker = HashMap<String, Double>()
        quoteRows.forEach { row -> quotesByTicker[row.ticker.uppercase()] = row.price }
        val rows = JSONArray()
        for (i in 0 until items.length()) {
            val item = items.optJSONObject(i) ?: continue
            val ticker = item.optString("ticker", "").uppercase()
            val optionType = item.optString("optionType", "call").lowercase()
            val strike = num(item.opt("strike"))
            val premium = num(item.opt("premium"))
            val quantity = num(item.opt("quantity")).coerceAtLeast(1.0)
            val spot = quotesByTicker[ticker] ?: num(item.opt("spotPrice"))
            val intrinsic = if (optionType == "put") (strike - spot).coerceAtLeast(0.0) else (spot - strike).coerceAtLeast(0.0)
            val positionPl = (intrinsic - premium) * quantity
            val breakEven = if (optionType == "put") strike - premium else strike + premium
            val status = if (intrinsic > 0) "ITM" else "OTM"
            val recommendation = if (positionPl > 0.0) "Rozważ realizację" else "Monitoruj"
            rows.put(
                JSONObject()
                    .put("id", item.optString("id", "opt-$i"))
                    .put("ticker", ticker)
                    .put("optionType", optionType)
                    .put("strike", round2(strike))
                    .put("premium", round2(premium))
                    .put("spotPrice", round2(spot))
                    .put("breakEven", round2(breakEven))
                    .put("status", status)
                    .put("daysToExpiry", item.optInt("daysToExpiry", 0))
                    .put("positionPL", round2(positionPl))
                    .put("recommendation", recommendation)
                    .put("currency", item.optString("currency", "PLN"))
            )
        }
        return rows
    }

    private fun optionExercisePrice(payload: JSONObject): JSONObject {
        val underlying = num(payload.opt("spotPrice"))
        val strike = num(payload.opt("strike"))
        val premium = num(payload.opt("premium"))
        val contracts = num(payload.opt("contracts")).coerceAtLeast(1.0)
        val multiplier = num(payload.opt("multiplier")).coerceAtLeast(1.0)
        val kind = payload.optString("optionType", "call").lowercase()
        val intrinsic = if (kind == "put") (strike - underlying).coerceAtLeast(0.0) else (underlying - strike).coerceAtLeast(0.0)
        val status = if (intrinsic > 0) "ITM" else "OTM"
        val positionPl = (intrinsic - premium) * contracts * multiplier
        val recommendation = if (positionPl > 0) "Rozważ realizację" else "Monitoruj"
        return JSONObject()
            .put("intrinsicValue", round2(intrinsic))
            .put("breakEven", round2(if (kind == "put") strike - premium else strike + premium))
            .put("status", status)
            .put("positionPL", round2(positionPl))
            .put("recommendation", recommendation)
    }

    private suspend fun saveOptionPosition(payload: JSONObject): JSONObject {
        val storeItems = jsonConfig(KEY_OPTION_POSITIONS, JSONArray()).optJSONArray("items") ?: JSONArray()
        val row = JSONObject(payload.toString())
            .put("id", payload.optString("id", "opt-${System.currentTimeMillis()}"))
            .put("updatedAt", nowIso())
        val next = JSONArray()
        var replaced = false
        for (i in 0 until storeItems.length()) {
            val existing = storeItems.optJSONObject(i) ?: continue
            if (existing.optString("id", "") == row.optString("id", "")) {
                next.put(row)
                replaced = true
            } else {
                next.put(existing)
            }
        }
        if (!replaced) {
            next.put(row)
        }
        saveJsonConfig(KEY_OPTION_POSITIONS, JSONObject().put("items", next))
        return JSONObject().put("saved", true).put("position", row)
    }

    private suspend fun deleteOptionPosition(id: String): JSONObject {
        val storeItems = jsonConfig(KEY_OPTION_POSITIONS, JSONArray()).optJSONArray("items") ?: JSONArray()
        val next = JSONArray()
        for (i in 0 until storeItems.length()) {
            val existing = storeItems.optJSONObject(i) ?: continue
            if (existing.optString("id", "") != id) {
                next.put(existing)
            }
        }
        saveJsonConfig(KEY_OPTION_POSITIONS, JSONObject().put("items", next))
        return JSONObject().put("deleted", true)
    }

    private suspend fun modelPortfolio(): JSONObject {
        val fallback = JSONObject()
            .put("name", "Portfel wzorcowy")
            .put("weights", JSONArray())
            .put("updatedAt", nowIso())
        return jsonConfig(KEY_MODEL_PORTFOLIO, fallback)
    }

    private suspend fun saveModelPortfolio(payload: JSONObject): JSONObject {
        val model = JSONObject()
            .put("name", payload.optString("name", "Portfel wzorcowy"))
            .put("weights", payload.optJSONArray("weights") ?: JSONArray())
            .put("updatedAt", nowIso())
        saveJsonConfig(KEY_MODEL_PORTFOLIO, model)
        return JSONObject().put("saved", true).put("model", model)
    }

    private suspend fun compareModelPortfolio(): JSONObject {
        val model = modelPortfolio()
        val weights = model.optJSONArray("weights") ?: JSONArray()
        val state = JSONObject(ensureStateJson())
        val assets = state.optJSONArray("assets") ?: JSONArray()
        val totalValue = computeMetrics("").marketValue.coerceAtLeast(0.0)
        val assetValueByTicker = HashMap<String, Double>()
        for (i in 0 until assets.length()) {
            val item = assets.optJSONObject(i) ?: continue
            val ticker = item.optString("ticker", "").uppercase()
            val value = num(item.opt("currentPrice"))
            if (ticker.isNotBlank()) {
                assetValueByTicker[ticker] = value
            }
        }
        val rows = JSONArray()
        for (i in 0 until weights.length()) {
            val item = weights.optJSONObject(i) ?: continue
            val ticker = item.optString("ticker", "").uppercase()
            val target = num(item.opt("weight")).coerceAtLeast(0.0)
            val actual = if (totalValue > 0.0) ((assetValueByTicker[ticker] ?: 0.0) / totalValue) * 100.0 else 0.0
            val deviation = actual - target
            rows.put(
                JSONObject()
                    .put("ticker", ticker)
                    .put("targetSharePct", round2(target))
                    .put("actualSharePct", round2(actual))
                    .put("deviationPct", round2(deviation))
                    .put("valueDelta", round2(totalValue * (deviation / 100.0)))
                    .put("action", if (deviation > 0.25) "Zmniejsz" else if (deviation < -0.25) "Zwiększ" else "OK")
                    .put("qtyDeltaApprox", round2(kotlin.math.abs(deviation)))
            )
        }
        return JSONObject()
            .put("modelName", model.optString("name", "Portfel wzorcowy"))
            .put("summary", JSONObject().put("trackingErrorPct", 0.0).put("beta", 1.0).put("alphaPct", 0.0).put("rebalanceNeeded", rows.length() > 0))
            .put("rows", rows)
    }

    private suspend fun publicPortfolios(): JSONObject {
        val state = JSONObject(ensureStateJson())
        val portfolios = state.optJSONArray("portfolios") ?: JSONArray()
        val publicRows = JSONArray()
        for (i in 0 until portfolios.length()) {
            val row = portfolios.optJSONObject(i) ?: continue
            if (row.optBoolean("isPublic", false)) {
                publicRows.put(
                    JSONObject()
                        .put("id", row.optString("id", ""))
                        .put("name", row.optString("name", ""))
                        .put("benchmark", row.optString("benchmark", ""))
                        .put("goal", row.optString("goal", ""))
                        .put("netWorth", 0.0)
                        .put("returnPct", 0.0)
                        .put("holdingsCount", 0)
                )
            }
        }
        return JSONObject().put("portfolios", publicRows)
    }

    private suspend fun clonePublicPortfolio(payload: JSONObject): JSONObject {
        val sourceId = payload.optString("sourcePortfolioId", "")
        val cloneName = payload.optString("name", "Klon portfela publicznego")
        val stateObj = JSONObject(ensureStateJson())
        val portfolios = stateObj.optJSONArray("portfolios") ?: JSONArray()
        var source: JSONObject? = null
        for (i in 0 until portfolios.length()) {
            val row = portfolios.optJSONObject(i) ?: continue
            if (row.optString("id", "") == sourceId) {
                source = row
                break
            }
        }
        if (source == null) {
            return JSONObject().put("cloned", false).put("message", "Nie znaleziono portfela publicznego.")
        }
        val clone = JSONObject(source.toString())
            .put("id", "ptf-${System.currentTimeMillis()}")
            .put("name", cloneName)
            .put("isPublic", false)
            .put("createdAt", nowIso())
        portfolios.put(clone)
        dao.upsertStateSnapshot(StateSnapshotEntity(stateJson = stateObj.toString(), updatedAt = nowIso()))
        return JSONObject().put("cloned", true).put("portfolio", clone)
    }

    private suspend fun reportCatalogJson(): JSONArray {
        val items = listOf(
            "Skład i struktura",
            "Statystyki portfela",
            "Struktura kupna walorów",
            "Zysk per typ inwestycji",
            "Zysk per konto inwestycyjne",
            "Wartość majątku w czasie",
            "Podsumowanie portfeli",
            "Historia operacji"
        )
        val arr = JSONArray()
        items.forEach { name -> arr.put(JSONObject().put("name", name)) }
        return arr
    }

    private suspend fun notificationHistory(limit: Int): JSONArray {
        val history = jsonConfig(KEY_NOTIFICATION_HISTORY, JSONArray()).optJSONArray("items") ?: JSONArray()
        val output = JSONArray()
        for (i in 0 until minOf(limit, history.length())) {
            output.put(history.opt(i))
        }
        return output
    }

    private suspend fun appendNotificationHistory(entry: JSONObject) {
        val history = jsonConfig(KEY_NOTIFICATION_HISTORY, JSONArray()).optJSONArray("items") ?: JSONArray()
        val next = JSONArray().put(entry)
        for (i in 0 until minOf(200, history.length())) {
            next.put(history.opt(i))
        }
        saveJsonConfig(KEY_NOTIFICATION_HISTORY, JSONObject().put("items", next))
    }

    private suspend fun quoteFreshness(rows: List<QuoteEntity>): JSONObject {
        var fresh = 0
        var stale = 0
        var maxAge = 0
        rows.forEach { row ->
            val age = ageSeconds(row.fetchedAt)
            if (age <= 15 * 60) {
                fresh += 1
            } else {
                stale += 1
            }
            if (age > maxAge) {
                maxAge = age
            }
        }
        return JSONObject()
            .put("total", rows.size)
            .put("fresh", fresh)
            .put("stale", stale)
            .put("maxAgeSeconds", maxAge)
    }

    private suspend fun jsonConfig(key: String, fallback: JSONObject): JSONObject {
        val row = dao.getKv(key)
        if (row == null || row.value.isBlank()) {
            saveJsonConfig(key, fallback)
            return JSONObject(fallback.toString())
        }
        return safeJsonObject(row.value)
    }

    private suspend fun jsonConfig(key: String, fallback: JSONArray): JSONObject {
        val wrapped = JSONObject().put("items", fallback)
        return jsonConfig(key, wrapped)
    }

    private suspend fun saveJsonConfig(key: String, value: JSONObject) {
        dao.upsertKv(KvEntity(key = key, value = value.toString(), updatedAt = nowIso()))
    }

    private fun extractStateJsonFromPayload(payloadText: String): String {
        val payload = safeJsonObject(payloadText)
        return if (payload.has("state") && payload.opt("state") is JSONObject) {
            payload.optJSONObject("state")?.toString() ?: defaultStateJson()
        } else {
            payload.toString()
        }
    }

    private fun normalizePath(path: String): String {
        if (path.isBlank()) {
            return "/"
        }
        return if (path.startsWith('/')) path else "/$path"
    }

    private fun rawJsonObject(key: String, rawJsonValue: String): JSONObject {
        val json = JSONObject()
        json.put(key, JSONObject(rawJsonValue))
        return json
    }

    private fun safeJsonObject(raw: String): JSONObject {
        return try {
            JSONObject(raw.ifBlank { "{}" })
        } catch (_: Exception) {
            JSONObject()
        }
    }

    private fun num(value: Any?): Double {
        return when (value) {
            null -> 0.0
            is Number -> value.toDouble()
            else -> value.toString().replace(',', '.').trim().toDoubleOrNull() ?: 0.0
        }
    }

    private fun nowIso(): String = Instant.now().toString()

    private fun todayIso(): String = OffsetDateTime.now(ZoneOffset.UTC).toLocalDate().toString()

    private fun timestampCompact(): String =
        OffsetDateTime.now(ZoneOffset.UTC).format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))

    private fun ageSeconds(iso: String): Int {
        return try {
            val parsed = Instant.parse(iso)
            (Instant.now().epochSecond - parsed.epochSecond).coerceAtLeast(0).toInt()
        } catch (_: Exception) {
            0
        }
    }

    private fun round2(value: Double): Double = ((value * 100.0).roundToInt()) / 100.0

    private fun ok(body: JSONObject): ApiDispatchResult = ApiDispatchResult(status = 200, body = body.toString())

    private fun notFound(message: String): ApiDispatchResult =
        ApiDispatchResult(status = 404, body = JSONObject().put("error", message).toString())

    companion object {
        private const val KEY_REALTIME_CONFIG = "realtime_config"
        private const val KEY_NOTIFICATION_CONFIG = "notification_config"
        private const val KEY_NOTIFICATION_HISTORY = "notification_history"
        private const val KEY_BACKUP_CONFIG = "backup_config"
        private const val KEY_FORUM_POSTS = "forum_posts"
        private const val KEY_OPTION_POSITIONS = "option_positions"
        private const val KEY_MODEL_PORTFOLIO = "model_portfolio"
    }
}
