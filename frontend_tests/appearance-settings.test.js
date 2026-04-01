import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const APP_PATH = path.resolve(process.cwd(), "app.js");

function makeTab(iconKey) {
  const iconNode = { textContent: "" };
  return {
    dataset: { iconKey },
    querySelector(selector) {
      return selector === ".tab-icon" ? iconNode : null;
    },
    iconNode
  };
}

function createHarness() {
  const source = fs.readFileSync(APP_PATH, "utf8");
  const tabs = ["dashboard", "reports", "tools", "appearance"].map(makeTab);
  const body = {
    dataset: {},
    addEventListener() {},
    setAttribute(name, value) {
      this.dataset[name.replace(/^data-/, "").replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = value;
    }
  };
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
      querySelectorAll(selector) {
        return selector === ".tab[data-icon-key]" ? tabs : [];
      },
      body,
      documentElement: {
        style: {}
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
    getComputedStyle() {
      return {
        getPropertyValue() {
          return "";
        }
      };
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
  return { hooks, body, tabs, documentElement: context.document.documentElement };
}

test("normalizeState keeps valid appearance settings and defaults invalid ones", () => {
  const { hooks } = createHarness();
  const normalized = hooks.normalizeState({
    meta: {
      activePlan: "Expert",
      baseCurrency: "PLN",
      createdAt: "2026-01-01T00:00:00.000Z",
      theme: "midnight",
      lastLightTheme: "gold",
      iconSet: "market",
      fontScale: "large"
    },
    portfolios: [],
    accounts: [],
    assets: [],
    operations: [],
    recurringOps: [],
    liabilities: [],
    alerts: [],
    notes: [],
    strategies: [],
    favorites: []
  });
  assert.equal(normalized.meta.theme, "midnight");
  assert.equal(normalized.meta.lastLightTheme, "gold");
  assert.equal(normalized.meta.iconSet, "market");
  assert.equal(normalized.meta.fontScale, "large");

  const fallback = hooks.normalizeState({
    meta: {
      activePlan: "Expert",
      baseCurrency: "PLN",
      createdAt: "2026-01-01T00:00:00.000Z",
      theme: "unknown",
      lastLightTheme: "midnight",
      iconSet: "bad",
      fontScale: "huge"
    }
  });
  assert.equal(fallback.meta.theme, "forest");
  assert.equal(fallback.meta.lastLightTheme, "forest");
  assert.equal(fallback.meta.iconSet, "classic");
  assert.equal(fallback.meta.fontScale, "comfortable");
});

test("applyAppearanceSettings updates body attributes, font size and tab icons", () => {
  const { hooks, body, tabs, documentElement } = createHarness();
  hooks.setState({
    meta: {
      activePlan: "Expert",
      baseCurrency: "PLN",
      createdAt: "2026-01-01T00:00:00.000Z",
      theme: "gold",
      lastLightTheme: "gold",
      iconSet: "market",
      fontScale: "large"
    },
    portfolios: [],
    accounts: [],
    assets: [],
    operations: [],
    recurringOps: [],
    liabilities: [],
    alerts: [],
    notes: [],
    strategies: [],
    favorites: []
  });

  hooks.applyAppearanceSettings();

  assert.equal(body.dataset.theme, "gold");
  assert.equal(body.dataset.iconSet, "market");
  assert.equal(body.dataset.fontScale, "large");
  assert.equal(documentElement.style.fontSize, "17.5px");
  assert.equal(tabs[0].iconNode.textContent, "◈");
  assert.equal(tabs[1].iconNode.textContent, "◪");
  assert.equal(tabs[2].iconNode.textContent, "✹");
  assert.equal(tabs[3].iconNode.textContent, "✷");
});

test("onThemeToggle switches to dark mode and back to remembered light theme", () => {
  const { hooks } = createHarness();
  hooks.setState({
    meta: {
      activePlan: "Expert",
      baseCurrency: "PLN",
      createdAt: "2026-01-01T00:00:00.000Z",
      theme: "ice",
      lastLightTheme: "ice",
      iconSet: "classic",
      fontScale: "comfortable"
    },
    portfolios: [],
    accounts: [],
    assets: [],
    operations: [],
    recurringOps: [],
    liabilities: [],
    alerts: [],
    notes: [],
    strategies: [],
    favorites: []
  });

  hooks.disableRendering();
  hooks.onThemeToggle();
  let state = hooks.getState();
  assert.equal(state.meta.theme, "midnight");
  assert.equal(state.meta.lastLightTheme, "ice");

  hooks.onThemeToggle();
  state = hooks.getState();
  assert.equal(state.meta.theme, "ice");
  assert.equal(state.meta.lastLightTheme, "ice");
});
