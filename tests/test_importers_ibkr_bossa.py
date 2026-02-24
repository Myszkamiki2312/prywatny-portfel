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


class ExtendedBrokerImportersTests(unittest.TestCase):
    def test_brokers_are_listed(self):
        importer = BrokerImporter(FakeDatabase())
        broker_ids = [item["id"] for item in importer.list_brokers()]
        self.assertIn("ibkr", broker_ids)
        self.assertIn("bossa", broker_ids)

    def test_ibkr_import_buy_and_sell_rows(self):
        csv_text = "\n".join(
            [
                "Date/Time,Symbol,Action,Quantity,T. Price,Proceeds,Comm/Fee,Currency,Description",
                "2026-02-20,AAPL,BUY,2,200.0,-400.0,1.0,USD,Apple Inc",
                "2026-02-21,AAPL,SELL,-1,205.0,205.0,1.0,USD,Apple Inc",
            ]
        )
        database = FakeDatabase()
        importer = BrokerImporter(database)

        summary = importer.import_csv(broker="ibkr", csv_text=csv_text, options={"fileName": "ibkr.csv"})

        self.assertEqual(summary["importedCount"], 2)
        self.assertEqual(summary["created"]["assets"], 1)
        self.assertEqual(len(database.state["operations"]), 2)

        buy = database.state["operations"][0]
        self.assertEqual(buy["type"], "Kupno waloru")
        self.assertEqual(buy["quantity"], 2.0)
        self.assertEqual(buy["price"], 200.0)
        self.assertEqual(buy["amount"], 400.0)
        self.assertEqual(buy["fee"], 1.0)
        self.assertEqual(buy["currency"], "USD")
        self.assertEqual(buy["tags"], ["ibkr"])

        sell = database.state["operations"][1]
        self.assertEqual(sell["type"], "Sprzedaż waloru")
        self.assertEqual(sell["quantity"], 1.0)
        self.assertEqual(sell["price"], 205.0)
        self.assertEqual(sell["amount"], 205.0)
        self.assertEqual(sell["fee"], 1.0)
        self.assertEqual(sell["currency"], "USD")
        self.assertEqual(sell["tags"], ["ibkr"])

    def test_bossa_import_buy_row(self):
        csv_text = "\n".join(
            [
                "Data;Rodzaj;Instrument;Ilosc;Cena;Kwota;Prowizja;Waluta",
                "2026-02-22;Kupno;CDR;3;210,5;631,5;2,5;PLN",
            ]
        )
        database = FakeDatabase()
        importer = BrokerImporter(database)

        summary = importer.import_csv(broker="bossa", csv_text=csv_text, options={"fileName": "bossa.csv"})

        self.assertEqual(summary["importedCount"], 1)
        self.assertEqual(summary["created"]["assets"], 1)
        self.assertEqual(len(database.state["operations"]), 1)

        row = database.state["operations"][0]
        self.assertEqual(row["type"], "Kupno waloru")
        self.assertEqual(row["quantity"], 3.0)
        self.assertEqual(row["price"], 210.5)
        self.assertEqual(row["amount"], 631.5)
        self.assertEqual(row["fee"], 2.5)
        self.assertEqual(row["currency"], "PLN")
        self.assertEqual(row["tags"], ["bossa"])


if __name__ == "__main__":
    unittest.main()
