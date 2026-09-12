"""The CSV layer in front of the broker mappers.

Two faults lived here, both rejecting files that real brokers produce:

- csv.Sniffer fails on an export that opens with a preamble, and the old fallback picked the
  delimiter from the first line only — a preamble line, which contains no delimiter. It returned
  "," so the header search settled on line 0, the file parsed as a single column named after the
  preamble text, and the import was refused. DEGIRO and IBKR exports look exactly like that.
- the required header "type" had no alias entry, so a Polish "Rodzaj" column failed the generic
  import even though the mbank and bossa importers accept that very word.
"""

import unittest

from backend.importers import BrokerImporter, parse_csv_rows


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
                "name": "Konto",
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


CLEAN = "date;type;ticker;quantity;price\n2026-03-01;Kupno;CDR;10;100\n"
PREAMBLE = (
    "Raport transakcji\n"
    "Klient: 12345\n"
    "\n"
    "date;type;ticker;quantity;price\n"
    "2026-03-01;Kupno;CDR;10;100\n"
)
POLISH_HEADERS = "Data;Rodzaj;Instrument;Ilosc;Cena\n2026-03-01;Kupno;CDR;10;100\n"


class CsvLayoutTests(unittest.TestCase):
    def test_preamble_does_not_swallow_the_header(self):
        rows = parse_csv_rows(PREAMBLE)

        self.assertEqual(len(rows), 1, "The preamble lines are not data rows.")
        self.assertIn("date", rows[0], f"Header was misread as {list(rows[0].keys())}")
        self.assertEqual(rows[0]["ticker"], "CDR")

    def test_preamble_and_clean_file_parse_identically(self):
        self.assertEqual(parse_csv_rows(PREAMBLE), parse_csv_rows(CLEAN))

    def test_delimiters_are_each_recognised(self):
        for delimiter in (";", ",", "|", "\t"):
            with self.subTest(delimiter=delimiter):
                text = (
                    f"date{delimiter}type{delimiter}ticker{delimiter}quantity{delimiter}price\n"
                    f"2026-03-01{delimiter}Kupno{delimiter}CDR{delimiter}10{delimiter}100\n"
                )
                rows = parse_csv_rows(text)
                self.assertEqual(len(rows), 1)
                self.assertEqual(rows[0]["ticker"], "CDR")

    def test_summary_rows_are_still_dropped(self):
        rows = parse_csv_rows(CLEAN + "Suma;;;;\n")
        self.assertEqual(len(rows), 1)


class RequiredHeaderTests(unittest.TestCase):
    def setUp(self):
        self.database = FakeDatabase()
        self.importer = BrokerImporter(self.database)

    def run_import(self, csv_text):
        return self.importer.import_csv(
            broker="generic",
            csv_text=csv_text,
            options={"portfolioId": "ptf_1", "accountId": "acc_1"},
        )

    def test_polish_rodzaj_header_satisfies_the_type_requirement(self):
        result = self.run_import(POLISH_HEADERS)

        self.assertEqual(result["importedCount"], 1)
        self.assertEqual(self.database.state["operations"][0]["type"], "Kupno waloru")

    def test_export_with_a_preamble_imports(self):
        result = self.run_import(PREAMBLE)

        self.assertEqual(result["rowCount"], 1)
        self.assertEqual(result["importedCount"], 1)
        operation = self.database.state["operations"][0]
        self.assertEqual(operation["date"], "2026-03-01")
        self.assertEqual(operation["quantity"], 10.0)
        self.assertEqual(operation["amount"], 1000.0)

    def test_a_file_without_the_required_headers_is_still_refused(self):
        with self.assertRaises(ValueError):
            self.run_import("foo;bar\n1;2\n")


if __name__ == "__main__":
    unittest.main()
