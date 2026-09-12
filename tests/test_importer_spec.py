"""Python half of the shared broker-import contract.

Reads the very same tests/fixtures/importer-spec.json that the Kotlin :importers module reads, so
the phone and the backend are held to one set of operations. Adding a case there covers both
implementations at once; a case that only one side satisfies fails here.

Operations are compared by resolved portfolio/account names and asset tickers rather than by id,
because both sides generate ids differently and neither ordering is meaningful to the user.
"""

import json
import pathlib
import unittest

from backend.importers import BrokerImporter

SPEC_PATH = pathlib.Path(__file__).resolve().parent / "fixtures" / "importer-spec.json"


def load_spec():
    return json.loads(SPEC_PATH.read_text(encoding="utf-8"))


def build_state(case, base_currency):
    return {
        "meta": {
            "activePlan": "Expert",
            "baseCurrency": base_currency,
            "createdAt": "2026-01-01T00:00:00+00:00",
        },
        "portfolios": [
            {
                "id": row["id"],
                "name": row["name"],
                "currency": base_currency,
                "benchmark": "",
                "goal": "",
                "parentId": "",
                "twinOf": "",
                "groupName": "",
                "isPublic": False,
                "createdAt": "2026-01-01T00:00:00+00:00",
            }
            for row in case["portfolios"]
        ],
        "accounts": [
            {
                "id": row["id"],
                "name": row["name"],
                "type": "Broker",
                "currency": base_currency,
                "createdAt": "2026-01-01T00:00:00+00:00",
            }
            for row in case["accounts"]
        ],
        "assets": [
            {
                "id": row["id"],
                "ticker": row["ticker"],
                "name": row["name"],
                "type": "Inny",
                "currency": base_currency,
                "currentPrice": 0.0,
                "risk": 5.0,
                "sector": "",
                "industry": "",
                "tags": [],
                "benchmark": "",
                "createdAt": "2026-01-01T00:00:00+00:00",
            }
            for row in case["assets"]
        ],
        "operations": [],
        "recurringOps": [],
        "liabilities": [],
        "alerts": [],
        "notes": [],
        "strategies": [],
        "favorites": [],
    }


class FakeDatabase:
    def __init__(self, state):
        self.state = state
        self.import_logs = []

    def get_state(self):
        return self.state

    def replace_state(self, new_state):
        self.state = new_state

    def log_import(self, **kwargs):
        self.import_logs.append(kwargs)


class ImporterSpecTests(unittest.TestCase):
    def test_every_case_matches_the_shared_expectation(self):
        spec = load_spec()
        base_currency = spec["baseCurrency"]
        self.assertTrue(spec["cases"], "The spec must carry at least one case.")

        for case in spec["cases"]:
            with self.subTest(case=case["name"]):
                database = FakeDatabase(build_state(case, base_currency))
                result = BrokerImporter(database).import_csv(
                    broker=case["broker"],
                    csv_text=case["csv"],
                    options=dict(case["options"]),
                )
                state = database.get_state()
                expected = case["expected"]

                self.assertEqual(result["rowCount"], expected["rowCount"], "row count")
                self.assertEqual(result["importedCount"], expected["importedCount"], "imported count")
                self.assertEqual(result["created"], expected["created"], "created entities")

                portfolio_names = {row["id"]: row["name"] for row in state["portfolios"]}
                account_names = {row["id"]: row["name"] for row in state["accounts"]}
                asset_tickers = {row["id"]: row["ticker"] for row in state["assets"]}

                operations = [
                    {
                        "date": op["date"],
                        "type": op["type"],
                        "portfolio": portfolio_names.get(op["portfolioId"], "?"),
                        "account": account_names.get(op["accountId"], "?"),
                        "assetTicker": asset_tickers.get(op["assetId"], ""),
                        "targetAssetTicker": asset_tickers.get(op["targetAssetId"], ""),
                        "quantity": op["quantity"],
                        "targetQuantity": op["targetQuantity"],
                        "price": op["price"],
                        "amount": op["amount"],
                        "fee": op["fee"],
                        "currency": op["currency"],
                        "tags": op["tags"],
                        "note": op["note"],
                    }
                    for op in state["operations"]
                ]
                self.assertEqual(operations, expected["operations"])

    def test_the_spec_covers_every_supported_broker(self):
        """A broker with no case here is a broker whose two implementations nothing compares."""
        from backend.importers import SUPPORTED_BROKERS

        covered = {case["broker"] for case in load_spec()["cases"]}
        self.assertEqual(covered, set(SUPPORTED_BROKERS.keys()))


if __name__ == "__main__":
    unittest.main()
