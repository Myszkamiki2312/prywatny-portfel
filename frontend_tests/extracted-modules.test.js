// Guards the app.js -> frontend/*.js extraction. buildReport and the tax calculators no longer
// close over app.js globals; they receive them through a deps object. A missing entry in that
// object would only surface in the browser, so these tests drive the real delegation path.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { wireModules } from "./modules.js";

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
    Set,
    Map,
    Promise,
    Symbol,
    parseFloat,
    parseInt,
    isNaN,
    isFinite,
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
      body: { addEventListener() {} }
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
    // Reads the fields the test attached to the stub form, so formToObject sees real values.
    FormData: class FormData {
      constructor(form) {
        this.fields = (form && form.fields) || {};
      }
      entries() {
        return Object.entries(this.fields)[Symbol.iterator]();
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
  wireModules(hooks);
  return hooks;
}

function seedState(hooks) {
  hooks.setState({
    meta: {
      activePlan: "Expert",
      baseCurrency: "PLN",
      createdAt: "2026-01-01T00:00:00.000Z",
      fxRates: { "USD/PLN": 4 }
    },
    portfolios: [
      {
        id: "ptf_1",
        name: "Główny",
        currency: "PLN",
        benchmark: "WIG20",
        goal: "Emerytura",
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
        name: "Konto maklerskie",
        type: "Broker",
        currency: "PLN",
        portfolioId: "ptf_1",
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ],
    assets: [
      {
        id: "ast_1",
        ticker: "CDR",
        name: "CD Projekt",
        type: "Akcja",
        currency: "PLN",
        currentPrice: 120,
        risk: 5,
        sector: "Gry",
        industry: "Rozrywka",
        tags: ["growth"],
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "ast_2",
        ticker: "AAPL",
        name: "Apple",
        type: "Akcja",
        currency: "USD",
        currentPrice: 200,
        risk: 3,
        sector: "Tech",
        industry: "Hardware",
        tags: ["core"],
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ],
    operations: [
      {
        id: "op_1",
        date: "2026-02-01",
        type: "Kupno",
        portfolioId: "ptf_1",
        accountId: "acc_1",
        assetId: "ast_1",
        quantity: 10,
        price: 100,
        amount: 1000,
        fee: 5,
        currency: "PLN"
      },
      {
        id: "op_2",
        date: "2026-03-01",
        type: "Dywidenda",
        portfolioId: "ptf_1",
        accountId: "acc_1",
        assetId: "ast_1",
        quantity: 0,
        price: 0,
        amount: 50,
        fee: 0,
        currency: "PLN"
      },
      {
        id: "op_3",
        date: "2026-04-01",
        type: "Sprzedaż",
        portfolioId: "ptf_1",
        accountId: "acc_1",
        assetId: "ast_1",
        quantity: 4,
        price: 130,
        amount: 520,
        fee: 3,
        currency: "PLN"
      }
    ],
    recurringOps: [],
    liabilities: [
      {
        id: "lia_1",
        name: "Kredyt",
        amount: 2000,
        currency: "PLN",
        portfolioId: "ptf_1",
        startDate: "2026-01-01"
      }
    ],
    alerts: [],
    notes: [],
    strategies: [],
    favorites: []
  });
}

test("buildReport delegates to frontend/reports.js for every catalogued report", () => {
  const hooks = createHarness();
  hooks.disableRendering();
  seedState(hooks);

  const reportNames = hooks.REPORT_FEATURES;
  assert.ok(Array.isArray(reportNames) && reportNames.length > 0, "No reports catalogued.");

  const failures = [];
  for (const reportName of reportNames) {
    try {
      const report = hooks.buildReport(reportName, "ptf_1");
      assert.ok(report && typeof report === "object", "no report object");
      assert.equal(typeof report.info, "string");
      assert.ok(Array.isArray(report.headers), "headers is not an array");
      assert.ok(Array.isArray(report.rows), "rows is not an array");
      assert.ok(report.chart, "chart is missing");
    } catch (error) {
      // A missing deps entry shows up here as "x is not a function" / "x is not defined".
      failures.push(`${reportName}: ${error.message}`);
    }
  }
  assert.deepEqual(failures, [], `Reports failed through the module boundary:\n${failures.join("\n")}`);
});

test("buildReport works for the all-portfolios view too", () => {
  const hooks = createHarness();
  hooks.disableRendering();
  seedState(hooks);

  const report = hooks.buildReport("Historia operacji", "");
  assert.ok(report.info.includes("wszystkie"));
  assert.equal(report.rows.length, 3, "Every operation should be listed when no portfolio filters.");
});

test("buildReport reflects portfolio data rather than returning an empty shell", () => {
  const hooks = createHarness();
  hooks.disableRendering();
  seedState(hooks);

  const report = hooks.buildReport("Historia operacji", "ptf_1");
  const flat = report.rows.flat().join(" ");
  assert.ok(flat.includes("Kupno"), "Operation rows are missing their data.");
  assert.ok(flat.includes("CD Projekt") || flat.includes("CDR"), "Asset labels are missing.");
});

test("onTaxSubmit delegates to frontend/taxes.js and renders through its deps", () => {
  const hooks = createHarness();
  hooks.disableRendering();
  seedState(hooks);

  const taxOutput = { innerHTML: "", textContent: "" };
  hooks.setDom({ taxOutput });

  let prevented = false;
  hooks.onTaxSubmit({
    preventDefault() {
      prevented = true;
    },
    currentTarget: {
      fields: { realized: "1000", dividends: "200", costs: "100", rate: "19" },
      querySelectorAll: () => []
    }
  });

  assert.ok(prevented, "The submit event should be prevented.");
  assert.ok(taxOutput.innerHTML.includes("Podstawa opodatkowania"), "Tax output was not rendered.");
  // (1000 + 200 - 100) * 19% = 209
  assert.ok(taxOutput.innerHTML.includes("209"), `Expected tax of 209 in: ${taxOutput.innerHTML}`);
});
