import unittest

from backend.importers import BrokerImporter


def build_state():
    return {
        "meta": {
            "activePlan": "Expert",
            "baseCurrency": "PLN",
            "createdAt": "2026-01-01T00:00:00+00:00",
        },
        "portfolios": [
            {
                "id": "ptf_1",
                "name": "Glowny",
                "currency": "PLN",
                "benchmark": "",
                "goal": "",
                "parentId": "",
                "twinOf": "",
                "groupName": "",
                "isPublic": False,
                "createdAt": "2026-01-01T00:00:00+00:00",
            }
        ],
        "accounts": [
            {
                "id": "acc_1",
                "name": "Konto podstawowe",
                "type": "Broker",
                "currency": "PLN",
                "createdAt": "2026-01-01T00:00:00+00:00",
            }
        ],
        "assets": [],
        "operations": [],
        "recurringOps": [],
        "liabilities": [],
        "alerts": [],
        "notes": [],
        "strategies": [],
        "favorites": [],
    }


class FakeDatabase:
    def __init__(self):
        self.state = build_state()
        self.import_logs = []

    def get_state(self):
        return self.state

    def replace_state(self, new_state):
        self.state = new_state

    def log_import(self, **kwargs):
        self.import_logs.append(kwargs)


class DegiroImporterTests(unittest.TestCase):
    def test_broker_is_listed(self):
        importer = BrokerImporter(FakeDatabase())
        broker_ids = [item["id"] for item in importer.list_brokers()]
        self.assertIn("degiro", broker_ids)

    def test_import_buy_and_sell_rows(self):
        csv_text = "\n".join(
            [
                "Date;Product;ISIN;Action;Quantity;Price;Total;Currency",
                "2026-02-20;Apple Inc. (AAPL);US0378331005;Buy;2;190.5;381.0;USD",
                "2026-02-21;Apple Inc. (AAPL);US0378331005;Sell;-1;195.0;-195.0;USD",
            ]
        )
        database = FakeDatabase()
        importer = BrokerImporter(database)

        summary = importer.import_csv(broker="degiro", csv_text=csv_text, options={"fileName": "degiro.csv"})

        self.assertEqual(summary["broker"], "degiro")
        self.assertEqual(summary["rowCount"], 2)
        self.assertEqual(summary["importedCount"], 2)
        self.assertEqual(summary["created"]["assets"], 1)

        operations = database.state["operations"]
        self.assertEqual(len(operations), 2)

        buy = operations[0]
        self.assertEqual(buy["type"], "Kupno waloru")
        self.assertEqual(buy["quantity"], 2.0)
        self.assertEqual(buy["price"], 190.5)
        self.assertEqual(buy["amount"], 381.0)
        self.assertEqual(buy["currency"], "USD")
        self.assertEqual(buy["tags"], ["degiro"])

        sell = operations[1]
        self.assertEqual(sell["type"], "Sprzedaż waloru")
        self.assertEqual(sell["quantity"], 1.0)
        self.assertEqual(sell["price"], 195.0)
        self.assertEqual(sell["amount"], 195.0)
        self.assertEqual(sell["currency"], "USD")
        self.assertEqual(sell["tags"], ["degiro"])

        self.assertEqual(len(database.state["assets"]), 1)
        self.assertEqual(database.state["assets"][0]["ticker"], "AAPL")
        self.assertEqual(len(database.import_logs), 1)


if __name__ == "__main__":
    unittest.main()
