import unittest

from backend.reports import AnalyticsEngine


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
                "benchmark": "WIG20",
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
        "assets": [
            {
                "id": "ast_1",
                "ticker": "CDR",
                "name": "CD Projekt",
                "type": "Akcja",
                "currency": "PLN",
                "currentPrice": 120.0,
                "risk": 5.0,
                "sector": "Gry",
                "industry": "",
                "tags": [],
                "benchmark": "WIG20",
                "createdAt": "2026-01-01T00:00:00+00:00",
            }
        ],
        "operations": [],
        "recurringOps": [],
        "liabilities": [],
        "alerts": [],
        "notes": [],
        "strategies": [],
        "favorites": [],
    }


def operation(
    op_id,
    *,
    date,
    op_type,
    account_id="acc_1",
    portfolio_id="ptf_1",
    asset_id="",
    quantity=0.0,
    price=0.0,
    amount=0.0,
    fee=0.0,
    created_at="2026-01-01T00:00:00+00:00",
):
    return {
        "id": op_id,
        "date": date,
        "type": op_type,
        "portfolioId": portfolio_id,
        "accountId": account_id,
        "assetId": asset_id,
        "targetAssetId": "",
        "quantity": quantity,
        "targetQuantity": 0.0,
        "price": price,
        "amount": amount,
        "fee": fee,
        "currency": "PLN",
        "tags": [],
        "note": "",
        "createdAt": created_at,
    }


class AnalyticsEngineTests(unittest.TestCase):
    def test_metrics_for_cash_plus_buy(self):
        state = build_state()
        state["operations"] = [
            operation(
                "op_1",
                date="2026-01-02",
                op_type="Operacja gotowkowa",
                amount=1000.0,
                created_at="2026-01-02T10:00:00+00:00",
            ),
            operation(
                "op_2",
                date="2026-01-03",
                op_type="Kupno waloru",
                asset_id="ast_1",
                quantity=2.0,
                price=100.0,
                amount=200.0,
                fee=2.0,
                created_at="2026-01-03T10:00:00+00:00",
            ),
        ]

        metrics = AnalyticsEngine(state).metrics

        self.assertAlmostEqual(metrics["marketValue"], 240.0)
        self.assertAlmostEqual(metrics["bookValue"], 202.0)
        self.assertAlmostEqual(metrics["cashTotal"], 798.0)
        self.assertAlmostEqual(metrics["unrealized"], 38.0)
        self.assertAlmostEqual(metrics["fees"], 2.0)
        self.assertAlmostEqual(metrics["totalPL"], 36.0)
        self.assertAlmostEqual(metrics["netWorth"], 1038.0)
        self.assertAlmostEqual(metrics["netContribution"], 1000.0)
        self.assertAlmostEqual(metrics["returnPct"], 3.6)

        self.assertEqual(len(metrics["holdings"]), 1)
        holding = metrics["holdings"][0]
        self.assertAlmostEqual(holding.qty, 2.0)
        self.assertAlmostEqual(holding.price, 120.0)
        self.assertAlmostEqual(holding.unrealized, 38.0)

    def test_metrics_for_partial_sale_and_realized_pl(self):
        state = build_state()
        state["operations"] = [
            operation(
                "op_1",
                date="2026-01-02",
                op_type="Operacja gotowkowa",
                amount=1000.0,
                created_at="2026-01-02T10:00:00+00:00",
            ),
            operation(
                "op_2",
                date="2026-01-03",
                op_type="Kupno waloru",
                asset_id="ast_1",
                quantity=2.0,
                price=100.0,
                amount=200.0,
                fee=0.0,
                created_at="2026-01-03T10:00:00+00:00",
            ),
            operation(
                "op_3",
                date="2026-01-04",
                op_type="Sprzedaz waloru",
                asset_id="ast_1",
                quantity=1.0,
                price=130.0,
                amount=130.0,
                fee=1.0,
                created_at="2026-01-04T10:00:00+00:00",
            ),
        ]

        metrics = AnalyticsEngine(state).metrics

        self.assertAlmostEqual(metrics["realized"], 29.0)
        self.assertAlmostEqual(metrics["fees"], 1.0)
        self.assertAlmostEqual(metrics["cashTotal"], 929.0)
        self.assertAlmostEqual(metrics["marketValue"], 120.0)
        self.assertAlmostEqual(metrics["unrealized"], 20.0)
        self.assertAlmostEqual(metrics["totalPL"], 48.0)
        self.assertAlmostEqual(metrics["netWorth"], 1049.0)

        self.assertEqual(len(metrics["closedSummary"]), 1)
        closed = metrics["closedSummary"][0]
        self.assertAlmostEqual(closed["buyQty"], 2.0)
        self.assertAlmostEqual(closed["sellQty"], 1.0)
        self.assertAlmostEqual(closed["remainingQty"], 1.0)
        self.assertAlmostEqual(closed["realizedPL"], 29.0)
        self.assertEqual(closed["closed"], False)

        self.assertEqual(len(metrics["closedDetails"]), 1)
        detail = metrics["closedDetails"][0]
        self.assertAlmostEqual(detail["realizedPL"], 29.0)


if __name__ == "__main__":
    unittest.main()
