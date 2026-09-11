// JavaScript half of the shared ticker-resolution contract, driven by the same fixture as
// tests/test_ticker_alias_spec.py. quoteTickerAliases matches a returned quote back onto an
// asset, so if it stops agreeing with the backend on what a symbol can be called, quotes are
// silently dropped instead of failing loudly.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { wireModules } from "./modules.js";

const APP_PATH = path.resolve(process.cwd(), "app.js");
const SPEC_PATH = path.resolve(process.cwd(), "tests", "fixtures", "ticker-alias-spec.json");

function loadSpec() {
  return JSON.parse(fs.readFileSync(SPEC_PATH, "utf8")).cases;
}

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

test("the shared spec has cases", () => {
  assert.ok(loadSpec().length > 0, "The shared spec has no cases.");
});

test("quoteTickerAliases covers every shared case", () => {
  const hooks = createHarness();
  const failures = [];

  for (const testCase of loadSpec()) {
    const aliases = hooks
      .quoteTickerAliases(testCase.symbol, testCase.currency || "")
      .map((alias) => String(alias).toUpperCase());
    for (const expected of testCase.mustInclude) {
      if (!aliases.includes(String(expected).toUpperCase())) {
        failures.push(
          `${testCase.symbol} (${testCase.currency}) is missing ${expected} — ${testCase.why}\n` +
            `    got: ${aliases.join(", ")}`
        );
      }
    }
  }

  assert.deepEqual(
    failures,
    [],
    `The frontend disagrees with the shared ticker spec:\n  ${failures.join("\n  ")}`
  );
});

test("aliasing is reflexive, so a quote and its asset always meet", () => {
  // applyQuotes expands both the returned quote and the asset, then intersects. If the expansion
  // of an alias does not lead back to the original symbol, that intersection can come up empty.
  const hooks = createHarness();

  for (const testCase of loadSpec()) {
    const aliases = hooks.quoteTickerAliases(testCase.symbol, testCase.currency || "");
    for (const alias of aliases) {
      const back = hooks
        .quoteTickerAliases(alias, testCase.currency || "")
        .map((value) => String(value).toUpperCase());
      assert.ok(
        back.includes(String(testCase.symbol).toUpperCase()) ||
          aliases.some((candidate) => back.includes(String(candidate).toUpperCase())),
        `${testCase.symbol} -> ${alias} does not lead back to an overlapping alias set.`
      );
    }
  }
});
