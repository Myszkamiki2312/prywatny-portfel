// JavaScript half of the shared currency-conversion contract, reading the same
// tests/fixtures/fx-spec.json as the Python and Kotlin tests.
//
// The web has always converted; this pins it so the other two cannot drift away from it again.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  configureMetrics,
  findCurrencyConversionRate,
  normalizeFxRates
} from "../frontend/metrics.js";

const SPEC_PATH = path.resolve(process.cwd(), "tests", "fixtures", "fx-spec.json");

// frontend/metrics.js takes its collaborators through configureMetrics. Of the six, the currency
// helpers touch only toNum, and every rate in the fixture is a plain number — so this minimal
// coercion is equivalent to the app's for these inputs. Deliberately not a copy of app.js's toNum:
// that one parses thousand separators and decimal commas, has its own coverage, and duplicating it
// here would be a fourth implementation of the thing this fixture exists to prevent.
const unusedOutsideCurrencyHelpers = () => {
  throw new Error("The currency helpers should not need this collaborator.");
};

configureMetrics({
  toNum: (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  },
  findById: unusedOutsideCurrencyHelpers,
  lookupName: unusedOutsideCurrencyHelpers,
  sum: unusedOutsideCurrencyHelpers,
  todayIso: unusedOutsideCurrencyHelpers,
  getState: unusedOutsideCurrencyHelpers
});

function loadSpec() {
  return JSON.parse(fs.readFileSync(SPEC_PATH, "utf8"));
}

function ratesFor(testCase, spec) {
  if ("ratesJson" in testCase) {
    return testCase.ratesJson;
  }
  return testCase.rates || spec.rates;
}

function applicable(spec) {
  return spec.cases.filter((testCase) =>
    (testCase.appliesTo || ["python", "js", "kotlin"]).includes("js")
  );
}

test("the shared FX spec has cases for this implementation", () => {
  assert.ok(applicable(loadSpec()).length > 0, "The shared FX spec is empty.");
});

test("conversion rates match the shared spec", () => {
  const spec = loadSpec();
  const failures = [];

  for (const testCase of applicable(spec)) {
    const actual = findCurrencyConversionRate(testCase.from, testCase.to, ratesFor(testCase, spec));
    if (Math.abs(actual - testCase.expectRate) > spec.tolerance) {
      failures.push(
        `${testCase.id}: rate ${actual}, spec says ${testCase.expectRate} — ${testCase.why}`
      );
    }
  }

  assert.deepEqual(failures, [], `Rates disagree with the shared spec:\n  ${failures.join("\n  ")}`);
});

test("a missing rate never zeroes a holding", () => {
  const spec = loadSpec();

  for (const testCase of applicable(spec)) {
    if (testCase.expectRate !== 0) {
      continue;
    }
    const rate = findCurrencyConversionRate(testCase.from, testCase.to, ratesFor(testCase, spec));
    assert.equal(rate, 0, `${testCase.id}: expected no usable rate — ${testCase.why}`);
  }
});

test("corrupt rate payloads are dropped", () => {
  for (const payload of [{ "USD/PLN": -1 }, "not-json", null, ["list"], { NOTAPAIR: 4 }]) {
    assert.deepEqual(
      normalizeFxRates(payload),
      {},
      `${JSON.stringify(payload)} should normalise to an empty rate table`
    );
  }
});
