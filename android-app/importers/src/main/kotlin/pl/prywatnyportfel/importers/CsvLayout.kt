package pl.prywatnyportfel.importers

/**
 * The CSV layer in front of the mappers, ported from backend/importers.py `parse_csv_rows`.
 *
 * The phone's old version decided the delimiter from the first line alone (";" versus "," and
 * nothing else) and always treated line 0 as the header. Exports that open with a preamble — DEGIRO
 * and IBKR do — parsed as a single column named after the preamble text and imported nothing.
 */
fun parseCsvRows(text: String?): List<Map<String, String>> {
    val payload = (text ?: "").trim()
    if (payload.isEmpty()) return emptyList()
    val lines = payload
        .replace("\r\n", "\n")
        .replace('\r', '\n')
        .split('\n')
        .filter { it.isNotBlank() }
    if (lines.isEmpty()) return emptyList()

    val (delimiter, headerIndex) = pickLayout(lines)
    val records = readRecords(lines.subList(headerIndex, lines.size), delimiter)
    if (records.isEmpty()) return emptyList()

    // csv.DictReader keys on the header row; a duplicated name keeps the last column, a short data
    // row leaves the remaining keys empty, and a long one drops the surplus.
    val header = records.first().map { it.trim() }
    val output = mutableListOf<Map<String, String>>()
    for (record in records.drop(1)) {
        val cleaned = LinkedHashMap<String, String>()
        for (index in header.indices) {
            cleaned[header[index]] = (record.getOrNull(index) ?: "").trim()
        }
        if (cleaned.values.none { it.isNotEmpty() }) continue
        if (isSummaryRow(cleaned)) continue
        output += cleaned
    }
    return output
}

/**
 * backend/importers.py `_pick_layout`: delimiter and header line are chosen together.
 *
 * They decide each other. Picking the delimiter first from a preamble line — which contains no
 * delimiter at all — yields "," and then the header search settles on that same preamble. Scoring
 * each candidate delimiter by the header it actually finds keeps the two consistent, and a real
 * header beats a preamble line on alias hits.
 */
private fun pickLayout(lines: List<String>): Pair<Char, Int> {
    var bestDelimiter = ','
    var bestIndex = 0
    var bestScore = -1
    for (candidate in listOf(';', ',', '|', '\t')) {
        val (index, score, columns) = bestHeader(lines, candidate)
        if (columns < 2) continue // a delimiter that never splits anything is not the file's
        if (score > bestScore) {
            bestDelimiter = candidate
            bestIndex = index
            bestScore = score
        }
    }
    return bestDelimiter to bestIndex
}

/** backend/importers.py `_best_header`: (line index, score, column count) for one delimiter. */
private fun bestHeader(lines: List<String>, delimiter: Char): Triple<Int, Int, Int> {
    var bestIndex = 0
    var bestScore = -1
    var bestColumns = 0
    for ((index, line) in lines.take(80).withIndex()) {
        val cells = readRecords(listOf(line), delimiter).firstOrNull() ?: continue
        val normalized = cells.map { normalizeKey(it) }.toSet()
        var score = 0
        for (aliases in REQUIRED_HEADER_ALIASES.values) {
            if (aliases.any { normalizeKey(it) in normalized }) score += 1
        }
        if ("type" in normalized && ("time" in normalized || "date" in normalized)) score += 3
        if (score > bestScore) {
            bestIndex = index
            bestScore = score
            bestColumns = cells.size
        }
    }
    return Triple(bestIndex, bestScore, bestColumns)
}

/** backend/importers.py `_is_summary_row`: a trailing total line is not a transaction. */
private fun isSummaryRow(row: Map<String, String>): Boolean {
    val first = row.values.firstOrNull { it.isNotBlank() }?.trim()?.lowercase() ?: ""
    return first in setOf("total", "suma", "summary", "razem")
}

/**
 * Splits lines into records the way csv.reader does: doubled quotes are literal, a delimiter inside
 * quotes is data, and a quoted field may span lines.
 */
private fun readRecords(lines: List<String>, delimiter: Char): List<List<String>> {
    val records = mutableListOf<List<String>>()
    var fields = mutableListOf<String>()
    val current = StringBuilder()
    var inQuotes = false

    for ((lineIndex, line) in lines.withIndex()) {
        if (lineIndex > 0 && inQuotes) current.append('\n')
        var i = 0
        while (i < line.length) {
            val ch = line[i]
            when {
                ch == '"' && inQuotes && i + 1 < line.length && line[i + 1] == '"' -> {
                    current.append('"')
                    i += 1
                }
                ch == '"' -> inQuotes = !inQuotes
                ch == delimiter && !inQuotes -> {
                    fields.add(current.toString())
                    current.setLength(0)
                }
                else -> current.append(ch)
            }
            i += 1
        }
        if (!inQuotes) {
            fields.add(current.toString())
            current.setLength(0)
            records.add(fields)
            fields = mutableListOf()
        }
    }
    // An unterminated quote at end of input still yields the partial record, as csv.reader does.
    if (current.isNotEmpty() || fields.isNotEmpty()) {
        fields.add(current.toString())
        records.add(fields)
    }
    return records
}

/** backend/importers.py `normalize_row_keys`. */
fun normalizeRowKeys(row: Map<String, String>): Map<String, String> {
    val normalized = LinkedHashMap<String, String>()
    for ((key, value) in row) {
        normalized[normalizeKey(key)] = value.trim()
    }
    return normalized
}

/** backend/importers.py `row_value`: first key that holds a non-blank value wins. */
fun rowValue(row: Map<String, String>, vararg keys: String): String {
    for (key in keys) {
        val value = row[normalizeKey(key)] ?: ""
        if (value.isNotBlank()) return value.trim()
    }
    return ""
}
