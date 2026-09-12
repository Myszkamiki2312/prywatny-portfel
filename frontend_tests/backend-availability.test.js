// A failing request used to switch the whole backend off.
//
// Every catch around apiRequest set backendSync.available = false, and nothing polls for recovery:
// the flag only comes back when the user refreshes quotes, opens the expert tools or draws a
// candlestick chart. So one unsupported endpoint — /reports/generate on the phone, say — silently
// disabled imports, tax tools, backups and quote refreshes until the user happened to hit one of
// those three. These tests pin the distinction apiRequest now makes between "the server answered
// with an error" and "nothing answered".
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
  wireModules(hooks);
  return hooks;
}

function serverError(status) {
  const error = new Error(`Błąd API ${status}`);
  error.serverResponded = true;
  error.status = status;
  return error;
}

test("an endpoint answering with an error leaves the backend switched on", () => {
  const hooks = createHarness();
  hooks.setBackendAvailable(true);

  const flipped = hooks.noteBackendFailure(serverError(404));

  assert.equal(flipped, false, "A 404 must not be treated as the backend going away.");
  assert.equal(
    hooks.getBackendAvailable(),
    true,
    "The server answered, so quotes, imports and tax tools must keep working."
  );
});

test("a server error on any status keeps the backend switched on", () => {
  const hooks = createHarness();

  for (const status of [400, 404, 422, 500]) {
    hooks.setBackendAvailable(true);
    hooks.noteBackendFailure(serverError(status));
    assert.equal(hooks.getBackendAvailable(), true, `status ${status} should not disable the backend`);
  }
});

test("an unreachable backend is still marked offline", () => {
  const hooks = createHarness();
  hooks.setBackendAvailable(true);

  const unreachable = new Error("Failed to fetch");
  unreachable.backendUnreachable = true;
  const flipped = hooks.noteBackendFailure(unreachable);

  assert.equal(flipped, true);
  assert.equal(hooks.getBackendAvailable(), false, "Nothing answered, so the backend really is gone.");
});

test("an unrecognised failure keeps the cautious behaviour", () => {
  const hooks = createHarness();
  hooks.setBackendAvailable(true);

  hooks.noteBackendFailure(new Error("something unexpected"));

  assert.equal(
    hooks.getBackendAvailable(),
    false,
    "Without evidence the server replied, assume it is gone — the safer of the two mistakes."
  );
});
