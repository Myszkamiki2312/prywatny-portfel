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

test("sliceLineChartSeriesByRange keeps full series for ALL", () => {
  const hooks = createHarness();
  const view = hooks.sliceLineChartSeriesByRange(
    ["2026-01-01", "2026-02-01", "2026-03-01"],
    [100, 120, 140],
    "all"
  );

  assert.deepEqual(view.labels, ["2026-01-01", "2026-02-01", "2026-03-01"]);
  assert.deepEqual(view.values, [100, 120, 140]);
  assert.equal(view.rangeKey, "all");
});

test("sliceLineChartSeriesByRange cuts dated series to requested range", () => {
  const hooks = createHarness();
  const view = hooks.sliceLineChartSeriesByRange(
    ["2026-01-01", "2026-02-01", "2026-03-01", "2026-03-10"],
    [100, 120, 140, 150],
    "30"
  );

  assert.deepEqual(view.labels, ["2026-03-01", "2026-03-10"]);
  assert.deepEqual(view.values, [140, 150]);
});

test("sliceLineChartSeriesByRange falls back to last points when labels are not dates", () => {
  const hooks = createHarness();
  const labels = Array.from({ length: 120 }, (_, index) => `P${index + 1}`);
  const values = Array.from({ length: 120 }, (_, index) => index + 1);
  const view = hooks.sliceLineChartSeriesByRange(labels, values, "90");

  assert.equal(view.labels.length, 90);
  assert.equal(view.labels[0], "P31");
  assert.equal(view.labels[89], "P120");
});

test("computeReturnSeries normalizes window to cumulative percent", () => {
  const hooks = createHarness();
  const result = hooks.computeReturnSeries([100, 110, 90]);

  assert.deepEqual(result, [0, 10, -10]);
});

test("densifySeriesByDay fills missing calendar days with last known values", () => {
  const hooks = createHarness();
  const result = hooks.densifySeriesByDay([
    { date: "2026-03-01", value: 100, marketValue: 100, netWorth: 100, pl: 0 },
    { date: "2026-03-03", value: 120, marketValue: 120, netWorth: 120, pl: 20 }
  ]);

  assert.equal(result.length, 3);
  assert.deepEqual(
    JSON.parse(JSON.stringify(result.map((point) => [point.date, point.value]))),
    [
      ["2026-03-01", 100],
      ["2026-03-02", 100],
      ["2026-03-03", 120]
    ]
  );
});

test("computeDashboardHistorySummary returns daily monthly and missing yearly change", () => {
  const hooks = createHarness();
  const result = hooks.computeDashboardHistorySummary([
    { date: "2026-03-01", netWorth: 1000 },
    { date: "2026-03-02", netWorth: 1010 },
    { date: "2026-03-30", netWorth: 1180 },
    { date: "2026-03-31", netWorth: 1200 }
  ]);

  assert.equal(result.daily.available, true);
  assert.equal(Math.round(result.daily.amount), 20);
  assert.equal(Math.round(result.monthly.amount), 200);
  assert.equal(result.yearly.available, false);
});

test("computeDashboardHistorySummary can adjust yearly change for inflation", () => {
  const hooks = createHarness();
  const result = hooks.computeDashboardHistorySummary(
    [
      { date: "2025-03-31", netWorth: 1000 },
      { date: "2026-03-31", netWorth: 1200 }
    ],
    { inflationEnabled: true, inflationRatePct: 10 }
  );

  assert.equal(result.yearly.available, true);
  assert.equal(Math.round(result.yearly.amount), 100);
  assert.equal(Math.round(result.yearly.pct), 9);
});

test("applyInflationToSeries inflates older points to latest date terms", () => {
  const hooks = createHarness();
  const result = hooks.applyInflationToSeries(
    [
      { date: "2025-03-31", netWorth: 1000, value: 1000, marketValue: 1000 },
      { date: "2026-03-31", netWorth: 1200, value: 1200, marketValue: 1200 }
    ],
    10
  );

  assert.equal(Math.round(result[0].netWorth), 1100);
  assert.equal(Math.round(result[1].netWorth), 1200);
});

test("extractBenchmarkSeriesFromRows parses benchmark column from report rows", () => {
  const hooks = createHarness();
  const result = hooks.extractBenchmarkSeriesFromRows(
    ["Data", "Stopa zwrotu %", "Benchmark %"],
    [
      ["2026-03-01", "2,5%", "1,5%"],
      ["2026-03-02", "-1,0%", "0,25%"]
    ]
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].name, "Benchmark %");
  assert.deepEqual(result[0].values, [1.5, 0.25]);
});

test("alignBenchmarkHistoryToSeries carries forward latest close for dashboard benchmark", () => {
  const hooks = createHarness();
  const aligned = hooks.alignBenchmarkHistoryToSeries(
    [
      { date: "2026-03-01" },
      { date: "2026-03-03" },
      { date: "2026-03-05" }
    ],
    [
      { date: "2026-02-28", close: 98 },
      { date: "2026-03-02", close: 101 },
      { date: "2026-03-04", close: 105 }
    ]
  );

  assert.deepEqual(Array.from(aligned), [98, 101, 105]);
});

test("buildCandlestickTooltipContent formats date OHLC and volume", () => {
  const hooks = createHarness();
  const tooltip = hooks.buildCandlestickTooltipContent({
    date: "2026-03-10",
    open: 100.25,
    high: 105.75,
    low: 99.5,
    close: 104.5,
    volume: 12345
  });

  assert.match(tooltip.label, /2026|marca|mar/i);
  assert.match(tooltip.value, /^C /);
  assert.match(tooltip.meta, /O /);
  assert.match(tooltip.meta, /H /);
  assert.match(tooltip.meta, /L /);
  assert.match(tooltip.meta, /V /);
});
