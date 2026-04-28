import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const APP_PATH = path.resolve(process.cwd(), "app.js");

function makeField(name, value = "", options = {}) {
  return {
    name,
    value,
    checked: Boolean(options.checked),
    type: options.type || "text"
  };
}

function makeForm(fields) {
  const fieldMap = {};
  fields.forEach((field) => {
    fieldMap[field.name] = field;
  });
  return {
    __fieldMap: fieldMap,
    querySelector(selector) {
      const match = /^\[name="(.+)"\]$/.exec(selector);
      if (!match) {
        return null;
      }
      return fieldMap[match[1]] || null;
    },
    querySelectorAll(selector) {
      if (selector !== 'input[type="checkbox"]') {
        return [];
      }
      return Object.values(fieldMap).filter((field) => field.type === "checkbox");
    },
    reset() {
      Object.values(fieldMap).forEach((field) => {
        if (field.type === "checkbox") {
          field.checked = false;
        } else {
          field.value = "";
        }
      });
    },
    scrollIntoView() {}
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

function buildBaseState() {
  return {
    meta: {
      activePlan: "Expert",
      baseCurrency: "PLN",
      createdAt: "2026-01-01T00:00:00.000Z"
    },
    portfolios: [
      {
        id: "ptf_1",
        name: "Portfel 1",
        currency: "PLN",
        benchmark: "WIG20",
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
        name: "Konto 1",
        type: "Broker",
        currency: "PLN",
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
        currentPrice: 100,
        risk: 5,
        sector: "",
        industry: "",
        tags: [],
        benchmark: "",
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ],
    operations: [],
    recurringOps: [],
    liabilities: [],
    alerts: [],
    notes: [],
    strategies: [],
    favorites: []
  };
}

function createHarness() {
  const source = fs.readFileSync(APP_PATH, "utf8");
  const storage = new Map();

  class FakeFormData {
    constructor(form) {
      this.items = [];
      const fieldMap = form && form.__fieldMap ? form.__fieldMap : {};
      Object.entries(fieldMap).forEach(([name, field]) => {
        if (field.type === "checkbox") {
          if (field.checked) {
            this.items.push([name, "on"]);
          }
          return;
        }
        this.items.push([name, field.value ?? ""]);
      });
    }
    entries() {
      return this.items[Symbol.iterator]();
    }
    [Symbol.iterator]() {
      return this.entries();
    }
  }

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
    FormData: FakeFormData,
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
  return hooks;
}

test("Recurring operation edit updates existing item instead of creating duplicate", () => {
  const hooks = createHarness();
  const state = buildBaseState();
  state.recurringOps = [
    {
      id: "rec_1",
      name: "Cykliczna 1",
      type: "Operacja gotówkowa",
      frequency: "monthly",
      startDate: "2026-02-01",
      amount: 100,
      portfolioId: "ptf_1",
      accountId: "acc_1",
      assetId: "",
      currency: "PLN",
      lastGeneratedDate: "",
      createdAt: "2026-02-01T00:00:00.000Z"
    }
  ];
  hooks.setState(state);

  const recurringEditId = makeField("editId", "");
  const recurringForm = makeForm([
    recurringEditId,
    makeField("name", ""),
    makeField("type", "Operacja gotówkowa"),
    makeField("frequency", "monthly"),
    makeField("startDate", ""),
    makeField("amount", "0"),
    makeField("portfolioId", "ptf_1"),
    makeField("accountId", "acc_1"),
    makeField("assetId", "")
  ]);
  const recurringSubmitBtn = { textContent: "Dodaj cykliczną" };
  const recurringCancelEditBtn = { hidden: true };

  hooks.setDom({
    recurringForm,
    recurringEditId,
    recurringSubmitBtn,
    recurringCancelEditBtn
  });

  hooks.startRecurringEdit("rec_1");
  assert.equal(hooks.getEditingState().recurringId, "rec_1");
  assert.equal(recurringSubmitBtn.textContent, "Zapisz cykliczną");
  assert.equal(recurringCancelEditBtn.hidden, false);
  assert.equal(recurringForm.querySelector('[name="name"]').value, "Cykliczna 1");

  recurringForm.querySelector('[name="name"]').value = "Cykliczna po edycji";
  recurringForm.querySelector('[name="amount"]').value = "250.5";
  recurringForm.querySelector('[name="frequency"]').value = "weekly";

  hooks.onRecurringSubmit({
    preventDefault() {},
    currentTarget: recurringForm
  });

  const nextState = hooks.getState();
  assert.equal(nextState.recurringOps.length, 1);
  assert.equal(nextState.recurringOps[0].id, "rec_1");
  assert.equal(nextState.recurringOps[0].name, "Cykliczna po edycji");
  assert.equal(nextState.recurringOps[0].frequency, "weekly");
  assert.equal(nextState.recurringOps[0].amount, 250.5);
  assert.equal(hooks.getEditingState().recurringId, "");
  assert.equal(recurringSubmitBtn.textContent, "Dodaj cykliczną");
  assert.equal(recurringCancelEditBtn.hidden, true);
});

test("Deleting edited alert resets edit mode and removes item", () => {
  const hooks = createHarness();
  const state = buildBaseState();
  state.alerts = [
    {
      id: "alt_1",
      assetId: "ast_1",
      direction: "gte",
      targetPrice: 123.4,
      createdAt: "2026-02-01T00:00:00.000Z",
      lastTriggerAt: ""
    }
  ];
  hooks.setState(state);

  const alertEditId = makeField("editId", "");
  const alertForm = makeForm([
    alertEditId,
    makeField("assetId", ""),
    makeField("direction", "gte"),
    makeField("targetPrice", "")
  ]);
  const alertSubmitBtn = { textContent: "Dodaj alert" };
  const alertCancelEditBtn = { hidden: true };

  hooks.setDom({
    alertForm,
    alertEditId,
    alertSubmitBtn,
    alertCancelEditBtn
  });

  hooks.startAlertEdit("alt_1");
  assert.equal(hooks.getEditingState().alertId, "alt_1");
  assert.equal(alertSubmitBtn.textContent, "Zapisz alert");
  assert.equal(alertCancelEditBtn.hidden, false);

  hooks.onActionClick(makeActionEvent("delete-alert", "alt_1"));

  const nextState = hooks.getState();
  assert.equal(nextState.alerts.length, 0);
  assert.equal(hooks.getEditingState().alertId, "");
  assert.equal(alertSubmitBtn.textContent, "Dodaj alert");
  assert.equal(alertCancelEditBtn.hidden, true);
});

test("Deleting edited liability resets edit mode and removes item", () => {
  const hooks = createHarness();
  const state = buildBaseState();
  state.liabilities = [
    {
      id: "liab_1",
      name: "Kredyt",
      amount: 10000,
      currency: "PLN",
      rate: 8.5,
      dueDate: "2030-01-01",
      createdAt: "2026-02-01T00:00:00.000Z"
    }
  ];
  hooks.setState(state);

  const liabilityEditId = makeField("editId", "");
  const liabilityForm = makeForm([
    liabilityEditId,
    makeField("name", ""),
    makeField("amount", ""),
    makeField("currency", "PLN"),
    makeField("rate", ""),
    makeField("dueDate", "")
  ]);
  const liabilitySubmitBtn = { textContent: "Dodaj zobowiązanie" };
  const liabilityCancelEditBtn = { hidden: true };

  hooks.setDom({
    liabilityForm,
    liabilityEditId,
    liabilitySubmitBtn,
    liabilityCancelEditBtn
  });

  hooks.startLiabilityEdit("liab_1");
  assert.equal(hooks.getEditingState().liabilityId, "liab_1");
  assert.equal(liabilitySubmitBtn.textContent, "Zapisz zobowiązanie");
  assert.equal(liabilityCancelEditBtn.hidden, false);

  hooks.onActionClick(makeActionEvent("delete-liability", "liab_1"));

  const nextState = hooks.getState();
  assert.equal(nextState.liabilities.length, 0);
  assert.equal(hooks.getEditingState().liabilityId, "");
  assert.equal(liabilitySubmitBtn.textContent, "Dodaj zobowiązanie");
  assert.equal(liabilityCancelEditBtn.hidden, true);
});
