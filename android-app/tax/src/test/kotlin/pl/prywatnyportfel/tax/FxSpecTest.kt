package pl.prywatnyportfel.tax

import java.io.File
import org.json.JSONObject
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.fail

/**
 * Kotlin half of the shared currency-conversion contract, reading the same
 * tests/fixtures/fx-spec.json as the Python and JavaScript tests.
 *
 * Cases marked appliesTo without "kotlin" are skipped: this module takes rates as a map because it
 * has no JSON parser in its main source set, so the string-payload case belongs to the other two.
 */
class FxSpecTest {

    private fun specFile(): File {
        var dir: File? = File(System.getProperty("user.dir"))
        while (dir != null) {
            val candidate = File(dir, "tests/fixtures/fx-spec.json")
            if (candidate.isFile) return candidate
            dir = dir.parentFile
        }
        fail("tests/fixtures/fx-spec.json not found above ${System.getProperty("user.dir")}")
    }

    private fun spec(): JSONObject = JSONObject(specFile().readText())

    private fun toMap(json: JSONObject): Map<String, Any?> =
        json.keys().asSequence().associateWith { key -> json.get(key) }

    private fun ratesFor(case: JSONObject, spec: JSONObject): Map<String, Any?> =
        toMap(case.optJSONObject("rates") ?: spec.getJSONObject("rates"))

    private fun appliesToKotlin(case: JSONObject): Boolean {
        val list = case.optJSONArray("appliesTo") ?: return true
        return (0 until list.length()).any { list.getString(it) == "kotlin" }
    }

    private fun applicableCases(spec: JSONObject): List<JSONObject> {
        val cases = spec.getJSONArray("cases")
        return (0 until cases.length())
            .map { cases.getJSONObject(it) }
            .filter { appliesToKotlin(it) }
    }

    @Test
    fun `spec has cases for this implementation`() {
        assertTrue(applicableCases(spec()).isNotEmpty(), "The shared FX spec is empty.")
    }

    @Test
    fun `conversion rates match the spec`() {
        val spec = spec()
        val tolerance = spec.optDouble("tolerance", 1e-6)
        val failures = mutableListOf<String>()

        for (case in applicableCases(spec)) {
            val actual = FxConversion.findCurrencyConversionRate(
                case.getString("from"),
                case.getString("to"),
                ratesFor(case, spec),
            )
            val expected = case.getDouble("expectRate")
            if (abs(actual - expected) > tolerance) {
                failures.add("${case.getString("id")}: rate $actual, spec says $expected — ${case.getString("why")}")
            }
        }
        assertTrue(failures.isEmpty(), "Rates disagree with the shared spec:\n  " + failures.joinToString("\n  "))
    }

    @Test
    fun `converted amounts match the spec`() {
        val spec = spec()
        val tolerance = spec.optDouble("tolerance", 1e-6)
        val failures = mutableListOf<String>()

        for (case in applicableCases(spec)) {
            val actual = FxConversion.convertCurrency(
                case.get("amount"),
                case.getString("from"),
                case.getString("to"),
                ratesFor(case, spec),
            )
            val expected = case.getDouble("expectConverted")
            if (abs(actual - expected) > tolerance) {
                failures.add("${case.getString("id")}: got $actual, spec says $expected — ${case.getString("why")}")
            }
        }
        assertTrue(failures.isEmpty(), "Conversions disagree with the shared spec:\n  " + failures.joinToString("\n  "))
    }

    @Test
    fun `a missing rate never zeroes a holding`() {
        val spec = spec()
        for (case in applicableCases(spec)) {
            if (case.getDouble("expectRate") != 0.0) continue
            val amount = case.getDouble("amount")
            assertEquals(
                amount,
                FxConversion.convertCurrency(
                    case.get("amount"),
                    case.getString("from"),
                    case.getString("to"),
                    ratesFor(case, spec),
                ),
                "An unusable rate must leave the amount untouched, not zero it.",
            )
        }
    }

    @Test
    fun `corrupt rate payloads are dropped`() {
        assertEquals(emptyMap(), FxConversion.normalizeFxRates(mapOf("USD/PLN" to -1)))
        assertEquals(emptyMap(), FxConversion.normalizeFxRates(mapOf("NOTAPAIR" to 4.0)))
        assertEquals(emptyMap(), FxConversion.normalizeFxRates(null))
        assertEquals(emptyMap(), FxConversion.normalizeFxRates("not-a-map"))
        assertEquals(emptyMap(), FxConversion.normalizeFxRates(listOf("list")))
    }
}
