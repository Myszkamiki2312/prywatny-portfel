package pl.prywatnyportfel.importers

import java.text.Normalizer
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

/**
 * Scalar and text helpers, ported field-for-field from backend/utils.py and backend/state_model.py.
 *
 * Every function here decides what a broker's raw cell becomes. A difference of one character class
 * changes which column an importer reads, so these follow the Python originals exactly rather than
 * being written the way Kotlin would naturally express them.
 */

/** backend/importers.py `_simplify_text`: trim, lowercase, strip diacritics. */
fun simplifyText(value: String?): String {
    val raw = (value ?: "").trim().lowercase()
    val normalized = Normalizer.normalize(raw, Normalizer.Form.NFKD)
    // Python drops characters with a non-zero combining class, which is Java's NON_SPACING_MARK.
    // "ł" has no decomposition in either language, so it survives on both sides.
    return normalized.filter { Character.getType(it) != Character.NON_SPACING_MARK.toInt() }
}

/**
 * backend/importers.py `_normalize_key`: keep only alphanumerics after simplification.
 *
 * The phone used to strip just spaces, underscores and hyphens, so an IBKR header "Date/Time"
 * normalized to "date/time" here and to "datetime" on the server — the column was then invisible
 * to every lookup and the date silently fell back to today.
 */
fun normalizeKey(value: String?): String = simplifyText(value).filter { it.isLetterOrDigit() }

/** backend/utils.py `to_num`, including its thousands/decimal separator disambiguation. */
fun toNum(value: Any?, default: Double = 0.0): Double {
    if (value is Number) return value.toDouble()
    val stripped = (value?.toString() ?: "").trim().replace(" ", "")
    var text = stripped.filter { it.isDigit() || it == ',' || it == '.' || it == '-' }
    val lastComma = text.lastIndexOf(',')
    val lastDot = text.lastIndexOf('.')
    if (lastComma >= 0 && lastDot >= 0) {
        // The separator that appears last is the decimal one: "1.234,56" and "1,234.56" both work.
        val decimal = if (lastComma > lastDot) ',' else '.'
        val thousands = if (decimal == ',') '.' else ','
        text = text.replace(thousands.toString(), "").replace(decimal, '.')
    } else if (lastComma >= 0) {
        text = text.replace(',', '.')
    }
    return text.toDoubleOrNull() ?: default
}

/** backend/state_model.py `to_tags`: comma-separated only, blanks dropped. */
fun toTags(value: String?): List<String> =
    (value ?: "").split(",").map { it.trim() }.filter { it.isNotEmpty() }

/** backend/state_model.py `text_or_fallback`. */
fun textOrFallback(value: String?, fallback: String): String {
    val text = (value ?: "").trim()
    return if (text.isNotEmpty()) text else fallback
}

// backend/utils.py `parse_date` tries these in order. The phone knew only four of them and, in
// particular, not dd/MM/yyyy — so a DEGIRO date "01/03/2026" parsed nowhere and the operation was
// stamped with today's date instead of the trade's.
private val DATE_PATTERNS = listOf(
    "yyyy-MM-dd",
    "yyyy/MM/dd",
    "dd.MM.yyyy",
    "dd-MM-yyyy",
    "dd/MM/yyyy",
    "yyyy-MM-dd HH:mm:ss",
    "dd.MM.yyyy HH:mm:ss",
    "yyyy/MM/dd HH:mm:ss",
)

/**
 * backend/utils.py `parse_date`.
 *
 * One deliberate narrowing: Python's `strptime` accepts unpadded components ("2026-3-1"), Java's
 * formatters do not. Broker exports pad, and the ISO shortcut below covers the padded case before
 * any pattern is tried.
 */
fun parseDate(value: String?, today: LocalDate = LocalDate.now(ZoneOffset.UTC)): LocalDate {
    val text = (value ?: "").trim()
    if (text.isEmpty()) return today
    if (isIsoShaped(text)) {
        return try {
            LocalDate.parse(text.substring(0, 10))
        } catch (_: Exception) {
            today
        }
    }
    for (pattern in DATE_PATTERNS) {
        val formatter = DateTimeFormatter.ofPattern(pattern)
        try {
            return if (pattern.contains("HH")) {
                LocalDateTime.parse(text, formatter).toLocalDate()
            } else {
                LocalDate.parse(text, formatter)
            }
        } catch (_: Exception) {
            continue
        }
    }
    return today
}

/**
 * backend/state_model.py `normalize_date`.
 *
 * Note it returns the leading ten characters unvalidated when the string is ISO-shaped, so a
 * timestamp like "2026-03-01T10:00:00Z" keeps its date without being reparsed. Matching that
 * shortcut matters: validating here would reject values the server accepts.
 */
fun normalizeDate(value: String?, today: LocalDate = LocalDate.now(ZoneOffset.UTC)): String {
    val text = (value ?: "").trim()
    if (text.isEmpty()) return today.toString()
    if (isIsoShaped(text)) return text.substring(0, 10)
    return parseDate(text, today).toString()
}

private fun isIsoShaped(text: String): Boolean =
    text.length >= 10 && text[4] == '-' && text[7] == '-'
