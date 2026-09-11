package pl.prywatnyportfel.tax

import java.io.File
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.fail

/**
 * Kotlin half of the shared tax contract.
 *
 * Reads the very same tests/fixtures/tax-spec.json that tests/test_tax_spec.py reads, so the phone
 * and the backend are held to one set of numbers. Adding a case there covers both implementations
 * at once; a case that only one side satisfies fails here.
 */
class TaxSpecTest {

    private fun specFile(): File {
        // Gradle runs tests from the module directory; the fixture lives at the repository root.
        var dir: File? = File(System.getProperty("user.dir"))
        while (dir != null) {
            val candidate = File(dir, "tests/fixtures/tax-spec.json")
            if (candidate.isFile) return candidate
            dir = dir.parentFile
        }
        fail("tests/fixtures/tax-spec.json not found above ${System.getProperty("user.dir")}")
    }

    private fun spec(): JSONObject = JSONObject(specFile().readText())

    private fun payloadOf(input: JSONObject): Map<String, Any?> =
        input.keys().asSequence().associateWith { key -> input.get(key) }

    private fun positionsOf(input: JSONObject): List<Map<String, Any?>> {
        val raw = input.optJSONArray("unrealizedPositions") ?: JSONArray()
        return (0 until raw.length()).mapNotNull { index ->
            raw.optJSONObject(index)?.let { payloadOf(it) }
        }
    }

    private fun call(fn: String, input: JSONObject): Map<String, Any> {
        val payload = payloadOf(input)
        return when (fn) {
            "tax_foreign_dividend" -> TaxCalculations.taxForeignDividend(payload)
            "tax_crypto" -> TaxCalculations.taxCrypto(payload)
            "tax_foreign_interest" -> TaxCalculations.taxForeignInterest(payload)
            "tax_bond_interest" -> TaxCalculations.taxBondInterest(payload)
            "option_exercise_price" -> TaxCalculations.optionExercisePrice(payload)
            "tax_optimize" -> TaxCalculations.taxOptimize(payload, positionsOf(input))
            else -> fail("The spec names $fn, which this module does not implement")
        }
    }

    @Test
    fun `spec has cases`() {
        assertTrue(spec().getJSONArray("cases").length() > 0, "The shared tax spec is empty.")
    }

    @Test
    fun `every case matches the shared spec`() {
        val spec = spec()
        val tolerance = spec.optDouble("tolerance", 0.01)
        val cases = spec.getJSONArray("cases")
        val failures = mutableListOf<String>()

        for (index in 0 until cases.length()) {
            val case = cases.getJSONObject(index)
            val id = case.getString("id")
            val why = case.optString("why", "")
            val result = call(case.getString("fn"), case.getJSONObject("input"))
            val expected = case.getJSONObject("expect")

            for (field in expected.keys()) {
                val want = expected.get(field)
                val got = result[field]
                if (got == null) {
                    failures.add("$id: no $field in the result — $why")
                    continue
                }
                if (want is String) {
                    if (got.toString() != want) {
                        failures.add("$id: $field was \"$got\", the spec says \"$want\" — $why")
                    }
                } else {
                    val wantNum = (want as Number).toDouble()
                    val gotNum = (got as Number).toDouble()
                    if (abs(gotNum - wantNum) > tolerance) {
                        failures.add("$id: $field was $gotNum, the spec says $wantNum — $why")
                    }
                }
            }
        }

        assertTrue(
            failures.isEmpty(),
            "This implementation disagrees with the shared tax spec:\n  " +
                failures.joinToString("\n  "),
        )
    }

    @Test
    fun `harvesting actions match where the spec states them`() {
        val spec = spec()
        val tolerance = spec.optDouble("tolerance", 0.01)
        val cases = spec.getJSONArray("cases")

        for (index in 0 until cases.length()) {
            val case = cases.getJSONObject(index)
            val wanted = case.optJSONArray("expectActions") ?: continue
            val id = case.getString("id")

            @Suppress("UNCHECKED_CAST")
            val actions = call(case.getString("fn"), case.getJSONObject("input"))["actions"]
                as? List<TaxCalculations.HarvestAction>
                ?: fail("$id: the result carries no action list")

            assertEquals(wanted.length(), actions.size, "$id: wrong number of harvesting actions")
            for (position in 0 until wanted.length()) {
                val want = wanted.getJSONObject(position)
                val got = actions[position]
                assertEquals(
                    want.getString("ticker"),
                    got.ticker,
                    "$id: action $position is for the wrong position — the largest loss goes first",
                )
                assertTrue(
                    abs(got.suggestedHarvestLoss - want.getDouble("suggestedHarvestLoss")) <= tolerance,
                    "$id: action $position harvests ${got.suggestedHarvestLoss}, " +
                        "the spec says ${want.getDouble("suggestedHarvestLoss")}",
                )
            }
        }
    }
}
