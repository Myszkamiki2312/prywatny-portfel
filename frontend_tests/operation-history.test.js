import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { filterOperations } from "../frontend/operations.js";

const APP_PATH = path.resolve(process.cwd(), "app.js");

function buildState() {
  return {
    meta: {
      activePlan: "Expert",
      baseCurrency: "PLN",
      createdAt: "2026-01-01T00:00:00.000Z"
    },
    portfolios: [
      { id: "ptf_1", name: "Główny" },
      { id: "ptf_2", name: "USD" }
    ],
    accounts: [
      { id: "acc_1", name: "Konto PLN", currency: "PLN" },
      { id: "acc_2", name: "Konto USD", currency: "USD" }
    ],
    assets: [
      { id: "ast_1", ticker: "CDR", name: "CD Projekt" },
      { id: "ast_2", ticker: "AAPL", name: "Apple" }
    ],
    operations: [
      {
        id: "op_1",
        date: "2026-02-20",
        type: "Kupno waloru",
        portfolioId: "ptf_1",
        accountId: "acc_1",
        assetId: "ast_1",
        targetAssetId: "",
        quantity: 1,
        targetQuantity: 0,
        price: 200,
        amount: 200,
        fee: 0,
        currency: "PLN",
        tags: ["growth"],
        note: "zakup CDR"
      },
      {
        id: "op_2",
        date: "2026-02-21",
        type: "Operacja gotówkowa",
        portfolioId: "ptf_2",
        accountId: "acc_2",
        assetId: "",
        targetAssetId: "",
        quantity: 0,
        targetQuantity: 0,
        price: 0,
        amount: 1000,
        fee: 0,
        currency: "USD",
        tags: ["cash"],
        note: "zasilenie"
      }
    ]
  };
}

function lookupName(collection, id) {
  const found = collection.find((item) => item.id === id);
  return found ? found.name : "N/D";
}

function lookupAssetLabelFactory(state) {
  return (assetId) => {
    if (!assetId) {
      return "-";
    }
    const found = state.assets.find((item) => item.id === assetId);
    return found ? `${found.ticker} - ${found.name}` : "Usunięty walor";
  };
}

function createAppHarness() {
  const source = fs.readFileSync(APP_PATH, "utf8");
  const storage = new Map();
  let confirmResult = true;
  let confirmCalls = 0;

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
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
      removeItem(key) {
        storage.delete(key);
      }
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
        confirmCalls += 1;
        return confirmResult;
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
  hooks.disableRendering();

  return {
    hooks,
    setConfirmResult(next) {
      confirmResult = Boolean(next);
    },
    getConfirmCalls() {
      return confirmCalls;
    }
  };
}

function makeActionEvent(action, id) {
  return {
    target: {
      closest(selector) {
        if (selector !== "[data-action]") {
          return null;
        }
        return { dataset: { action, id } };
      }
    }
  };
}

test("filterOperations filters by text and exact selectors", () => {
  const state = buildState();
  const result = filterOperations(
    state.operations,
    {
      search: "cdr",
      dateFrom: "",
      dateTo: "",
      type: "Kupno waloru",
      portfolioId: "ptf_1",
      accountId: "acc_1",
      amountMin: "",
      amountMax: ""
    },
    {
      state,
      lookupName,
      lookupAssetLabel: lookupAssetLabelFactory(state)
    }
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "op_1");
});

test("filterOperations returns empty list when filters exclude rows", () => {
  const state = buildState();
  const result = filterOperations(
    state.operations,
    {
      search: "apple",
      dateFrom: "",
      dateTo: "",
      type: "Kupno waloru",
      portfolioId: "ptf_1",
      accountId: "acc_1",
      amountMin: "",
      amountMax: ""
    },
    {
      state,
      lookupName,
      lookupAssetLabel: lookupAssetLabelFactory(state)
    }
  );

  assert.equal(result.length, 0);
});

test("filterOperations filters by date range", () => {
  const state = buildState();
  const result = filterOperations(
    state.operations,
    {
      search: "",
      dateFrom: "2026-02-21",
      dateTo: "2026-02-21",
      type: "",
      portfolioId: "",
      accountId: "",
      amountMin: "",
      amountMax: ""
    },
    {
      state,
      lookupName,
      lookupAssetLabel: lookupAssetLabelFactory(state)
    }
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "op_2");
});

test("filterOperations filters by amount range", () => {
  const state = buildState();
  const result = filterOperations(
    state.operations,
    {
      search: "",
      dateFrom: "",
      dateTo: "",
      type: "",
      portfolioId: "",
      accountId: "",
      amountMin: "300",
      amountMax: "1500"
    },
    {
      state,
      lookupName,
      lookupAssetLabel: lookupAssetLabelFactory(state)
    }
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "op_2");
});

test("delete-operation asks for confirmation and aborts when declined", () => {
  const harness = createAppHarness();
  const state = buildState();
  harness.hooks.setState(state);
  harness.setConfirmResult(false);

  harness.hooks.onActionClick(makeActionEvent("delete-operation", "op_1"));

  assert.equal(harness.getConfirmCalls(), 1);
  assert.equal(harness.hooks.getState().operations.length, 2);
});

test("delete-operation removes row when confirmation is accepted", () => {
  const harness = createAppHarness();
  const state = buildState();
  harness.hooks.setState(state);
  harness.setConfirmResult(true);

  harness.hooks.onActionClick(makeActionEvent("delete-operation", "op_1"));

  assert.equal(harness.getConfirmCalls(), 1);
  assert.deepEqual(
    harness.hooks.getState().operations.map((item) => item.id),
    ["op_2"]
  );
});
