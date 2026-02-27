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

test("shouldUseBackendMetrics blocks backend zero overwrite when local holdings exist", () => {
  const hooks = createHarness();
  const allowed = hooks.shouldUseBackendMetrics(
    {
      marketValue: 272.95,
      holdings: [{ assetId: "ast-1" }]
    },
    {
      marketValue: 0
    }
  );
  assert.equal(allowed, false);
});

test("shouldUseBackendMetrics allows backend metrics when values are coherent", () => {
  const hooks = createHarness();
  const allowed = hooks.shouldUseBackendMetrics(
    {
      marketValue: 272.95,
      holdings: [{ assetId: "ast-1" }]
    },
    {
      marketValue: 273
    }
  );
  assert.equal(allowed, true);
});

test("shouldUseBackendMetrics allows zero backend when there are no local holdings", () => {
  const hooks = createHarness();
  const allowed = hooks.shouldUseBackendMetrics(
    {
      marketValue: 0,
      holdings: []
    },
    {
      marketValue: 0
    }
  );
  assert.equal(allowed, true);
});
