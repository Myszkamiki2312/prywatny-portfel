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
                "2026-02-22;Kupno;CDR;3;1.210,50;3.631,50;2,5;PLN",
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
        self.assertEqual(row["price"], 1210.5)
        self.assertEqual(row["amount"], 3631.5)
        self.assertEqual(row["fee"], 2.5)
        self.assertEqual(row["currency"], "PLN")
        self.assertEqual(row["tags"], ["bossa"])

    def test_xtb_ike_export_with_metadata_imports_cash_interest_and_stock_purchase(self):
        csv_text = "\n".join(
            [
                "Account number,52282419,,,,,,",
                "Cash Operations,,,,,,,",
                "Date from (UTC),2025-02-02 23:00:00,,,,,,",
                "Date to (UTC),2026-04-29 20:30:44,,,,,,",
                "Type,Ticker,Instrument,Time,Amount,ID,Comment,Product",
                "Free funds interest,,,2026-04-03 16:52:43,0.22,1209208028,Free-funds Interest 2026-03,IKE",
                "Stock purchase,CDR.PL,CD Projekt,2026-03-04 09:02:31,-241.5,1159816441,OPEN BUY 1 @ 241.50,IKE",
                "IKE deposit,,,2026-03-03 12:50:38,498.27,1158229081,Transfer in operation on account with id 54019595,IKE",
                "Total,,,,256.99,,,",
            ]
        )
        database = FakeDatabase()
        importer = BrokerImporter(database)

        summary = importer.import_csv(broker="xtb", csv_text=csv_text, options={"fileName": "ike.csv"})

        self.assertEqual(summary["broker"], "xtb")
        self.assertEqual(summary["rowCount"], 3)
        self.assertEqual(summary["importedCount"], 3)
        self.assertEqual(summary["created"]["assets"], 1)

        interest, buy, deposit = database.state["operations"]
        self.assertEqual(interest["type"], "Odsetki")
        self.assertEqual(interest["amount"], 0.22)
        self.assertEqual(interest["assetId"], "")

        self.assertEqual(buy["type"], "Kupno waloru")
        self.assertEqual(buy["quantity"], 1.0)
        self.assertEqual(buy["price"], 241.5)
        self.assertEqual(buy["amount"], 241.5)
        self.assertEqual(buy["tags"], ["xtb"])

        asset = database.state["assets"][0]
        self.assertEqual(asset["ticker"], "CDR.PL")
        self.assertEqual(asset["name"], "CD Projekt")
        self.assertEqual(asset["type"], "Akcja")

        self.assertEqual(deposit["type"], "Operacja gotówkowa")
        self.assertEqual(deposit["amount"], 498.27)
        self.assertEqual(deposit["assetId"], "")

    def test_ibkr_rejects_csv_without_required_headers(self):
        database = FakeDatabase()
        importer = BrokerImporter(database)

        with self.assertRaises(ValueError):
            importer.import_csv(broker="ibkr", csv_text="foo,bar\n1,2", options={"fileName": "bad.csv"})

        self.assertEqual(database.state["operations"], [])


if __name__ == "__main__":
    unittest.main()
