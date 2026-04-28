import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const APP_PATH = path.resolve(process.cwd(), "app.js");

function createHarness() {
  const source = fs.readFileSync(APP_PATH, "utf8");
  const context = {
    console,
    Math,
    Date,
    JSON,
    Intl,
    Number,
    String,
    Boolean,
    Array,
    Object,
    RegExp,
    Error,
    parseFloat,
    parseInt,
    isNaN,
    __MYFUND_ENABLE_TEST_HOOKS__: true,
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {}
    },
    document: {
      addEventListener() {},
      getElementById() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      body: {
        addEventListener() {}
      }
    },
    window: {
      alert() {},
      confirm() {
        return true;
      },
      open() {},
      setTimeout() {
        return 1;
      },
      clearTimeout() {}
    },
    fetch: async () => {
      throw new Error("fetch disabled in tests");
    },
    FormData: class FormData {
      entries() {
        return [][Symbol.iterator]();
      }
      [Symbol.iterator]() {
        return this.entries();
      }
    },
    Blob: class Blob {},
    URL: {
      createObjectURL() {
        return "blob:test";
      },
      revokeObjectURL() {}
    }
  };

  context.globalThis = context;
  context.setTimeout = context.window.setTimeout;
  context.clearTimeout = context.window.clearTimeout;

  vm.createContext(context);
  vm.runInContext(source, context, { filename: "app.js" });
  const hooks = context.__MYFUND_TEST__;
  assert.ok(hooks, "Test hooks are not available.");
  return hooks;
}

test("computeMetrics converts USD portfolio values to PLN using stored FX rates", () => {
  const hooks = createHarness();
  hooks.setState({
    meta: {
      activePlan: "Expert",
      baseCurrency: "PLN",
      createdAt: "2026-01-01T00:00:00.000Z",
      fxRates: {
        "USD/PLN": 4
      }
    },
    portfolios: [
      {
        id: "ptf_1",
        name: "USD",
        currency: "USD",
        benchmark: "",
        goal: "",
        parentId: "",
        twinOf: "",
        groupName: "",
        isPublic: false,
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ],
    accounts: [
      {
        id: "acc_1",
        name: "Konto USD",
        type: "Broker",
        currency: "USD",
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ],
    assets: [
      {
        id: "ast_1",
        ticker: "AAPL",
        name: "Apple",
        type: "Akcja",
        currency: "USD",
        currentPrice: 110,
        risk: 5,
        sector: "",
        industry: "",
        tags: [],
        benchmark: "",
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ],
    operations: [
      {
        id: "op_1",
        date: "2026-01-02",
        type: "Operacja gotówkowa",
        portfolioId: "ptf_1",
        accountId: "acc_1",
        assetId: "",
        targetAssetId: "",
        quantity: 0,
        targetQuantity: 0,
        price: 0,
        amount: 1000,
        fee: 0,
        currency: "USD",
        tags: [],
        note: "",
        createdAt: "2026-01-02T00:00:00.000Z"
      },
      {
        id: "op_2",
        date: "2026-01-03",
        type: "Kupno waloru",
        portfolioId: "ptf_1",
        accountId: "acc_1",
        assetId: "ast_1",
        targetAssetId: "",
        quantity: 2,
        targetQuantity: 0,
        price: 100,
        amount: 200,
        fee: 1,
        currency: "USD",
        tags: [],
        note: "",
        createdAt: "2026-01-03T00:00:00.000Z"
      }
    ],
    recurringOps: [],
    liabilities: [],
    alerts: [],
    notes: [],
    strategies: [],
    favorites: []
  });

  const metrics = hooks.computeMetrics("ptf_1");

  assert.equal(metrics.marketValue, 880);
  assert.equal(metrics.bookValue, 804);
  assert.equal(metrics.cashTotal, 3196);
  assert.equal(metrics.netWorth, 4076);
  assert.equal(metrics.totalPL, 72);
  assert.equal(metrics.holdings[0].value, 880);
  assert.equal(metrics.holdings[0].currency, "USD");
});
