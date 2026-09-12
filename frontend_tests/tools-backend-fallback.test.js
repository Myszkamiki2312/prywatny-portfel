// frontend/tools.js keeps its own catch blocks around apiRequest, and they used to switch the
// backend off on any failure — the same bug fixed in app.js, still live here until now.
//
// These tests run those catch paths for real, with the actual noteBackendFailure taken from app.js
// rather than a stand-in. A stub would only prove that some function was passed in; this proves the
// whole chain: module receives the helper, calls it, and the flag ends up where it should. Getting
// the wiring wrong would leave noteBackendFailure undefined and throw inside a catch — exactly the
// failure that a count of occurrences cannot catch.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { refreshAlertHistory, runScanner } from "../frontend/tools.js";

const APP_PATH = path.resolve(process.cwd(), "app.js");

// Only what app.js touches while loading; the tools module itself needs none of it.
function appHooks() {
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
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document: {
      addEventListener() {},
      getElementById: () => null,
      querySelectorAll: () => [],
      body: { addEventListener() {} }
    },
    window: {
      alert() {},
      confirm: () => true,
      open() {},
      setTimeout: () => 1,
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
    URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} }
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

function serverError(status) {
  const error = new Error(`Błąd API ${status}`);
  error.serverResponded = true;
  error.status = status;
  return error;
}

function unreachable() {
  const error = new Error("Failed to fetch");
  error.backendUnreachable = true;
  return error;
}

function toolsDeps(hooks, failWith) {
  const rendered = { scanner: null, alerts: null };
  return {
    rendered,
    deps: {
      backendSync: { available: true },
      apiRequest: async () => {
        throw failWith;
      },
      localScanner: () => [{ ticker: "CDR" }],
      localAlertHistory: () => [{ id: "a1" }],
      renderScannerRows: (rows) => {
        rendered.scanner = rows;
      },
      renderAlertWorkflowRows: (rows) => {
        rendered.alerts = rows;
      },
      dom: { scannerInfo: { textContent: "" } },
      updateBackendStatus() {},
      noteBackendFailure: hooks.noteBackendFailure,
      toNum: (value) => Number(value) || 0,
      windowRef: { alert() {} }
    }
  };
}

test("a scanner endpoint answering with an error keeps the backend on and still shows local rows", async () => {
  const hooks = appHooks();
  hooks.setBackendAvailable(true);
  const { deps, rendered } = toolsDeps(hooks, serverError(404));

  await runScanner(deps, { silent: true });

  assert.deepEqual(rendered.scanner, [{ ticker: "CDR" }], "The local fallback should have rendered.");
  assert.equal(
    hooks.getBackendAvailable(),
    true,
    "The server answered, so imports and tax tools must not be switched off too."
  );
});

test("an unreachable backend during a scanner run is still marked offline", async () => {
  const hooks = appHooks();
  hooks.setBackendAvailable(true);
  const { deps } = toolsDeps(hooks, unreachable());

  await runScanner(deps, { silent: true });

  assert.equal(hooks.getBackendAvailable(), false, "Nothing answered, so the backend really is gone.");
});

test("alert history follows the same rule", async () => {
  const hooks = appHooks();
  hooks.setBackendAvailable(true);
  const { deps, rendered } = toolsDeps(hooks, serverError(500));

  await refreshAlertHistory(deps, { silent: true });

  assert.deepEqual(rendered.alerts, [{ id: "a1" }], "The local fallback should have rendered.");
  assert.equal(hooks.getBackendAvailable(), true);
});

test("every tools function that handles a failure is wired to the helper", async () => {
  // Guards the wiring itself: a missing dep would surface as a TypeError thrown out of the catch.
  const hooks = appHooks();
  const calls = [];
  const { deps } = toolsDeps(hooks, serverError(404));
  deps.noteBackendFailure = (error) => {
    calls.push(error);
    return false;
  };

  await runScanner(deps, { silent: true });
  await refreshAlertHistory(deps, { silent: true });

  assert.equal(calls.length, 2, "Both catch paths must report through the shared helper.");
  assert.ok(
    calls.every((error) => error && error.serverResponded),
    "The helper must receive the original error, not a replacement."
  );
});
