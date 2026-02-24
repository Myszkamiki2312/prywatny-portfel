import unittest

from backend.parity_tools import ParityToolsService


class ParityTaxTests(unittest.TestCase):
    def setUp(self):
        self.service = ParityToolsService(database=object(), quote_service=object())

    def test_tax_optimize_harvests_unrealized_losses(self):
        payload = {
            "realizedGain": 1000.0,
            "realizedLoss": 100.0,
            "dividends": 50.0,
            "costs": 50.0,
            "taxRatePct": 19.0,
            "unrealizedPositions": [
                {"ticker": "AAA", "unrealizedPL": -400.0},
                {"ticker": "BBB", "unrealizedPL": 100.0},
                {"ticker": "CCC", "unrealizedPL": -700.0},
            ],
        }

        result = self.service.tax_optimize(payload)

        self.assertAlmostEqual(result["taxableBaseBefore"], 900.0)
        self.assertAlmostEqual(result["taxBefore"], 171.0)
        self.assertAlmostEqual(result["taxableBaseAfter"], 0.0)
        self.assertAlmostEqual(result["taxAfter"], 0.0)
        self.assertAlmostEqual(result["taxSaved"], 171.0)
        self.assertEqual(len(result["actions"]), 2)
        self.assertEqual(result["actions"][0]["ticker"], "CCC")
        self.assertAlmostEqual(result["actions"][0]["suggestedHarvestLoss"], 700.0)
        self.assertEqual(result["actions"][1]["ticker"], "AAA")
        self.assertAlmostEqual(result["actions"][1]["suggestedHarvestLoss"], 200.0)

    def test_tax_foreign_dividend(self):
        payload = {
            "grossDividend": 100.0,
            "foreignWithholdingPct": 30.0,
            "localTaxPct": 19.0,
            "treatyCreditCapPct": 15.0,
        }

        result = self.service.tax_foreign_dividend(payload)

        self.assertAlmostEqual(result["grossDividend"], 100.0)
        self.assertAlmostEqual(result["foreignWithheld"], 30.0)
        self.assertAlmostEqual(result["localTaxNominal"], 19.0)
        self.assertAlmostEqual(result["creditableForeignTax"], 15.0)
        self.assertAlmostEqual(result["localTaxDue"], 4.0)
        self.assertAlmostEqual(result["foreignRefundPotential"], 15.0)
        self.assertAlmostEqual(result["netDividendAfterTax"], 66.0)

    def test_tax_crypto_with_carry_forward(self):
        payload = {
            "proceeds": 1200.0,
            "acquisitionCost": 500.0,
            "transactionCosts": 50.0,
            "carryForwardLoss": 100.0,
            "taxRatePct": 19.0,
        }

        result = self.service.tax_crypto(payload)

        self.assertAlmostEqual(result["cryptoIncomeBeforeCarry"], 650.0)
        self.assertAlmostEqual(result["carryForwardLossUsed"], 100.0)
        self.assertAlmostEqual(result["taxableBase"], 550.0)
        self.assertAlmostEqual(result["taxDue"], 104.5)


if __name__ == "__main__":
    unittest.main()
