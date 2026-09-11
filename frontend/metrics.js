// Portfolio metrics, FX conversion and time-series computation. Extracted from app.js.
//
// Pure computation: no DOM, no network, no module state of its own. The five stable helpers are
// injected once through configureMetrics(), but `state` is NOT — it is a live binding that app.js
// reassigns on every load and cloud sync, so capturing it once would freeze a stale portfolio.
// It is read through getState() at the top of each function that needs it.

let findById;
let lookupName;
let sum;
let toNum;
let todayIso;
let getState;

export function configureMetrics(deps) {
  ({ findById, lookupName, sum, toNum, todayIso, getState } = deps);
}

export function normalizeCurrency(value, fallback = "PLN") {
  const text = String(value || "").toUpperCase().trim();
  return /^[A-Z]{3}$/.test(text) ? text : fallback;
}

export function normalizeFxPairKey(value, quoteCurrency) {
  if (quoteCurrency !== undefined) {
    const base = normalizeCurrency(value, "");
    const quote = normalizeCurrency(quoteCurrency, "");
    return base && quote && base !== quote ? `${base}/${quote}` : "";
  }
  const text = String(value || "").toUpperCase().trim().replace(/^FX:/, "");
  if (!text) {
    return "";
  }
  let match = /^([A-Z]{3})\/([A-Z]{3})$/.exec(text);
  if (match && match[1] !== match[2]) {
    return `${match[1]}/${match[2]}`;
  }
  match = /^([A-Z]{3})([A-Z]{3})(?:=X)?$/.exec(text);
  if (match && match[1] !== match[2]) {
    return `${match[1]}/${match[2]}`;
  }
  return "";
}

export function normalizeFxRates(raw) {
  let payload = raw;
  if (typeof raw === "string") {
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      payload = {};
    }
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }
  const output = {};
  Object.entries(payload).forEach(([key, value]) => {
    const pairKey = normalizeFxPairKey(key);
    const rate = toNum(value);
    if (pairKey && rate > 0) {
      output[pairKey] = rate;
    }
  });
  return output;
}

export function findCurrencyConversionRate(fromCurrency, toCurrency, fxRates) {
  const base = normalizeCurrency(fromCurrency, "");
  const quote = normalizeCurrency(toCurrency, "");
  if (!base || !quote) {
    return 0;
  }
  if (base === quote) {
    return 1;
  }
  const rates = normalizeFxRates(fxRates);
  const queue = [{ currency: base, rate: 1 }];
  const visited = new Set([base]);
  while (queue.length) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    if (current.currency === quote) {
      return current.rate;
    }
    Object.entries(rates).forEach(([pairKey, pairRate]) => {
      const [src, dst] = pairKey.split("/");
      if (src === current.currency && !visited.has(dst)) {
        visited.add(dst);
        queue.push({ currency: dst, rate: current.rate * pairRate });
      } else if (dst === current.currency && !visited.has(src)) {
        visited.add(src);
        queue.push({ currency: src, rate: current.rate / pairRate });
      }
    });
  }
  return 0;
}

function convertCurrencyValue(amount, fromCurrency, toCurrency, fxRates) {
  const numeric = toNum(amount);
  const base = normalizeCurrency(fromCurrency, "");
  const quote = normalizeCurrency(toCurrency, "");
  if (!base || !quote || base === quote) {
    return numeric;
  }
  const rate = findCurrencyConversionRate(base, quote, fxRates);
  return rate > 0 ? numeric * rate : numeric;
}

function buildFxQuoteTicker(fromCurrency, toCurrency) {
  const pairKey = normalizeFxPairKey(fromCurrency, toCurrency);
  return pairKey ? `FX:${pairKey}` : "";
}

export function extractFxRatesFromQuotes(quotes) {
  const output = {};
  if (!Array.isArray(quotes)) {
    return output;
  }
  quotes.forEach((row) => {
    const pairKey = normalizeFxPairKey(row && row.ticker);
    const price = toNum(row && row.price);
    if (pairKey && price > 0) {
      output[pairKey] = price;
    }
  });
  return output;
}

function relevantCurrenciesForState() {
  const state = getState();
  const currencies = new Set([normalizeCurrency(state.meta.baseCurrency, "PLN")]);
  state.assets.forEach((asset) => {
    currencies.add(normalizeCurrency(asset.currency, state.meta.baseCurrency));
  });
  state.accounts.forEach((account) => {
    currencies.add(normalizeCurrency(account.currency, state.meta.baseCurrency));
  });
  state.operations.forEach((operation) => {
    currencies.add(normalizeCurrency(operation.currency, state.meta.baseCurrency));
  });
  state.liabilities.forEach((item) => {
    currencies.add(normalizeCurrency(item.currency, state.meta.baseCurrency));
  });
  return Array.from(currencies).filter(Boolean);
}

export function requiredFxQuoteTickers() {
  const state = getState();
  const baseCurrency = normalizeCurrency(state.meta.baseCurrency, "PLN");
  return relevantCurrenciesForState()
    .filter((currency) => currency !== baseCurrency)
    .map((currency) => buildFxQuoteTicker(currency, baseCurrency))
    .filter(Boolean);
}

export function computeMetrics(portfolioId, options = {}) {
  const state = getState();
  const untilDate = options.untilDate || "";
  const useCurrentPrices = options.useCurrentPrices !== false;
  const baseCurrency = normalizeCurrency(state.meta.baseCurrency, "PLN");
  const fxRates = normalizeFxRates(state.meta.fxRates);
  const operations = state.operations
    .filter((operation) => {
      if (portfolioId && operation.portfolioId !== portfolioId) {
        return false;
      }
      if (untilDate && operation.date > untilDate) {
        return false;
      }
      return true;
    })
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const holdings = new Map();
  const cashBuckets = new Map();
  const accountStats = new Map();
  const lastPriceByAsset = new Map();

  let realized = 0;
  let dividends = 0;
  let fees = 0;
  let netContribution = 0;

  const toBase = (amount, currency) => convertCurrencyValue(amount, currency, baseCurrency, fxRates);

  const resolveOperationCurrency = (operation) => {
    const asset = findById(state.assets, operation.assetId || "");
    const account = findById(state.accounts, operation.accountId || "");
    return normalizeCurrency(
      (asset && asset.currency) || (account && account.currency) || operation.currency || baseCurrency,
      baseCurrency
    );
  };

  const ensureAccountStat = (accountId) => {
    const key = accountId || "__global";
    const existing = accountStats.get(key);
    if (existing) {
      return existing;
    }
    const next = {
      accountId: key,
      name: key === "__global" ? "N/D" : lookupName(state.accounts, key),
      cash: 0,
      buyGross: 0,
      sellGross: 0,
      fees: 0,
      realized: 0,
      balance: 0
    };
    accountStats.set(key, next);
    return next;
  };

  const addCash = (accountId, amount, currency) => {
    const key = accountId || "__global";
    const normalizedCurrency = normalizeCurrency(currency, baseCurrency);
    const bucketKey = `${key}::${normalizedCurrency}`;
    cashBuckets.set(bucketKey, {
      accountId: key,
      currency: normalizedCurrency,
      amount: (cashBuckets.get(bucketKey)?.amount || 0) + amount
    });
    const stat = ensureAccountStat(key);
    const baseAmount = toBase(amount, normalizedCurrency);
    stat.cash += baseAmount;
    stat.balance += baseAmount;
  };

  const addAccountStat = (accountId, field, amount, currency) => {
    const stat = ensureAccountStat(accountId);
    stat[field] = (stat[field] || 0) + toBase(amount, currency);
  };

  const ensureHolding = (assetId) => {
    if (!holdings.has(assetId)) {
      holdings.set(assetId, { assetId, qty: 0, cost: 0 });
    }
    return holdings.get(assetId);
  };

  const addHolding = (assetId, qtyDelta, costDelta) => {
    if (!assetId) {
      return;
    }
    const row = ensureHolding(assetId);
    row.qty += qtyDelta;
    row.cost += costDelta;
    if (Math.abs(row.qty) < 1e-12) {
      row.qty = 0;
    }
    if (Math.abs(row.cost) < 1e-8) {
      row.cost = 0;
    }
  };

  operations.forEach((operation) => {
    const type = (operation.type || "").toLowerCase();
    const accountId = operation.accountId || "";
    const currency = resolveOperationCurrency(operation);
    const qty = toNum(operation.quantity);
    const targetQty = toNum(operation.targetQuantity);
    const price = toNum(operation.price);
    const amount = toNum(operation.amount);
    const fee = toNum(operation.fee);

    if (operation.assetId && price > 0) {
      lastPriceByAsset.set(operation.assetId, price);
    }

    if (type.includes("kupno")) {
      const gross = qty * price || Math.abs(amount);
      const total = gross + fee;
      addHolding(operation.assetId, qty, toBase(total, currency));
      addCash(accountId, -total, currency);
      addAccountStat(accountId, "buyGross", gross, currency);
      addAccountStat(accountId, "fees", fee, currency);
      fees += toBase(fee, currency);
      return;
    }

    if (type.includes("sprzeda")) {
      const holding = ensureHolding(operation.assetId);
      const avg = holding.qty > 0 ? holding.cost / holding.qty : 0;
      const soldQty = qty;
      const costOut = avg * soldQty;
      const gross = soldQty * price || Math.abs(amount);
      const netProceeds = (amount !== 0 ? amount : gross) - fee;
      addHolding(operation.assetId, -soldQty, -costOut);
      addCash(accountId, netProceeds, currency);
      addAccountStat(accountId, "sellGross", gross, currency);
      addAccountStat(accountId, "fees", fee, currency);
      const realizedDelta = toBase(netProceeds, currency) - costOut;
      addAccountStat(accountId, "realized", realizedDelta, baseCurrency);
      realized += realizedDelta;
      fees += toBase(fee, currency);
      return;
    }

    if (type.includes("konwers")) {
      const source = ensureHolding(operation.assetId);
      const avg = source.qty > 0 ? source.cost / source.qty : price;
      const sourceQty = qty;
      const costOut = avg * sourceQty;
      addHolding(operation.assetId, -sourceQty, -costOut);
      const receivedQty = targetQty || sourceQty;
      addHolding(operation.targetAssetId, receivedQty, costOut + toBase(fee, currency));
      if (fee > 0) {
        addCash(accountId, -fee, currency);
        addAccountStat(accountId, "fees", fee, currency);
        fees += toBase(fee, currency);
      }
      return;
    }

    if (type.includes("dywid")) {
      addCash(accountId, amount, currency);
      dividends += toBase(amount, currency);
      return;
    }

    if (type.includes("prowiz")) {
      const feeAmount = Math.max(Math.abs(amount), fee);
      addCash(accountId, -feeAmount, currency);
      addAccountStat(accountId, "fees", feeAmount, currency);
      fees += toBase(feeAmount, currency);
      return;
    }

    if (
      type.includes("operacja gotówk") ||
      type.includes("przelew") ||
      type.includes("lokat") ||
      type.includes("pożyczk") ||
      type.includes("zobowiąz")
    ) {
      addCash(accountId, amount, currency);
      netContribution += toBase(amount, currency);
      if (fee > 0) {
        addCash(accountId, -fee, currency);
        addAccountStat(accountId, "fees", fee, currency);
        fees += toBase(fee, currency);
      }
      return;
    }

    if (amount !== 0) {
      addCash(accountId, amount, currency);
      netContribution += toBase(amount, currency);
    }
    if (fee > 0) {
      addCash(accountId, -fee, currency);
      addAccountStat(accountId, "fees", fee, currency);
      fees += toBase(fee, currency);
    }
  });

  const holdingsList = [];
  let marketValue = 0;
  let bookValue = 0;

  holdings.forEach((holding) => {
    if (!holding.assetId || (holding.qty === 0 && holding.cost === 0)) {
      return;
    }
    const asset = findById(state.assets, holding.assetId);
    const fallbackPrice = lastPriceByAsset.get(holding.assetId) || 0;
    const currentPrice = useCurrentPrices ? toNum(asset ? asset.currentPrice : fallbackPrice) : fallbackPrice;
    const price = currentPrice || fallbackPrice || 0;
    const assetCurrency = normalizeCurrency(asset ? asset.currency : baseCurrency, baseCurrency);
    const nativeValue = holding.qty * price;
    const value = toBase(nativeValue, assetCurrency);
    const unrealized = value - holding.cost;
    bookValue += holding.cost;
    marketValue += value;
    holdingsList.push({
      assetId: holding.assetId,
      ticker: asset ? asset.ticker : "N/A",
      name: asset ? asset.name : "Usunięty walor",
      type: asset ? asset.type : "Inny",
      currency: assetCurrency,
      risk: asset ? asset.risk : 5,
      sector: asset ? asset.sector : "",
      industry: asset ? asset.industry : "",
      benchmark: asset ? asset.benchmark : "",
      tags: asset ? asset.tags : [],
      qty: holding.qty,
      price,
      value,
      nativeValue,
      cost: holding.cost,
      unrealized,
      unrealizedPct: holding.cost !== 0 ? (unrealized / holding.cost) * 100 : 0,
      share: 0
    });
  });

  const cashTotal = sum(Array.from(cashBuckets.values()).map((bucket) => toBase(bucket.amount, bucket.currency)));
  const liabilitiesTotal = sum(
    state.liabilities.map((item) => toBase(toNum(item.amount), normalizeCurrency(item.currency, baseCurrency)))
  );
  const unrealized = marketValue - bookValue;
  const totalPL = unrealized + realized + dividends - fees;
  const netWorth = marketValue + cashTotal - liabilitiesTotal;

  holdingsList.forEach((holding) => {
    holding.share = marketValue > 0 ? (holding.value / marketValue) * 100 : 0;
  });

  const byCurrencyMap = {};
  holdingsList.forEach((holding) => {
    byCurrencyMap[holding.currency] = byCurrencyMap[holding.currency] || { value: 0, baseValue: 0 };
    byCurrencyMap[holding.currency].value += holding.nativeValue;
    byCurrencyMap[holding.currency].baseValue += holding.value;
  });
  Array.from(cashBuckets.values()).forEach((bucket) => {
    byCurrencyMap[bucket.currency] = byCurrencyMap[bucket.currency] || { value: 0, baseValue: 0 };
    byCurrencyMap[bucket.currency].value += bucket.amount;
    byCurrencyMap[bucket.currency].baseValue += toBase(bucket.amount, bucket.currency);
  });
  const byCurrency = Object.entries(byCurrencyMap).map(([currency, item]) => ({
    currency,
    value: item.value,
    baseValue: item.baseValue,
    share: netWorth !== 0 ? (item.baseValue / netWorth) * 100 : 0
  })).sort((left, right) => right.baseValue - left.baseValue);

  const byTagMap = {};
  holdingsList.forEach((holding) => {
    const tags = holding.tags.length ? holding.tags : ["brak-tagu"];
    tags.forEach((tag) => {
      byTagMap[tag] = (byTagMap[tag] || 0) + holding.value;
    });
  });
  const byTag = Object.entries(byTagMap).map(([tag, value]) => ({
    tag,
    value,
    share: marketValue !== 0 ? (value / marketValue) * 100 : 0
  }));

  const byAccount = Array.from(accountStats.values());
  byAccount.forEach((account) => {
    account.name = account.accountId === "__global" ? "N/D" : lookupName(state.accounts, account.accountId);
  });

  const units = Math.max(1, Math.round(Math.max(1, Math.abs(netContribution) / 100)));
  const returnPct = netContribution !== 0 ? (totalPL / Math.abs(netContribution)) * 100 : 0;

  return {
    holdings: holdingsList,
    cashTotal,
    liabilitiesTotal,
    marketValue,
    bookValue,
    unrealized,
    realized,
    dividends,
    fees,
    totalPL,
    netWorth,
    netContribution,
    returnPct,
    byCurrency,
    byTag,
    byAccount,
    units
  };
}

export function buildSeries(portfolioId) {
  const state = getState();
  const operations = state.operations
    .filter((operation) => !portfolioId || operation.portfolioId === portfolioId)
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const dates = Array.from(new Set(operations.map((operation) => operation.date))).filter(Boolean);
  const series = dates.map((date) => {
    const metrics = computeMetrics(portfolioId, { untilDate: date, useCurrentPrices: false });
    return {
      date,
      value: metrics.netWorth,
      marketValue: metrics.marketValue,
      netWorth: metrics.netWorth,
      pl: metrics.totalPL
    };
  });
  const today = todayIso();
  const current = computeMetrics(portfolioId, { useCurrentPrices: true });
  if (!series.length || series[series.length - 1].date !== today) {
    series.push({
      date: today,
      value: current.netWorth,
      marketValue: current.marketValue,
      netWorth: current.netWorth,
      pl: current.totalPL
    });
  }
  return densifySeriesByDay(series);
}

export function computeDrawdownSeries(series) {
  let peak = Number.NEGATIVE_INFINITY;
  return series.map((point) => {
    peak = Math.max(peak, point.value);
    const value = peak !== 0 ? ((point.value - peak) / peak) * 100 : 0;
    return { date: point.date, value };
  });
}

export function computeRollingReturnSeries(series, window) {
  const output = [];
  for (let i = 0; i < series.length; i += 1) {
    if (i < window) {
      output.push({ date: series[i].date, value: 0 });
      continue;
    }
    const base = series[i - window].value;
    const current = series[i].value;
    const value = base !== 0 ? ((current - base) / base) * 100 : 0;
    output.push({ date: series[i].date, value });
  }
  return output;
}

export function computePeriodReturns(series) {
  const output = [];
  for (let i = 1; i < series.length; i += 1) {
    const prev = series[i - 1].value;
    const curr = series[i].value;
    const value = prev !== 0 ? ((curr - prev) / prev) * 100 : 0;
    output.push({ date: series[i].date, value });
  }
  return output;
}

export function parseSeriesIsoDate(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }
  const parsed = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function densifySeriesByDay(series) {
  if (!Array.isArray(series) || series.length < 2) {
    return Array.isArray(series) ? series.slice() : [];
  }
  const normalized = series
    .map((point) => ({
      ...point,
      date: String(point.date || "").slice(0, 10)
    }))
    .filter((point) => parseSeriesIsoDate(point.date));
  if (normalized.length < 2) {
    return normalized;
  }

  const firstDate = parseSeriesIsoDate(normalized[0].date);
  const lastDate = parseSeriesIsoDate(normalized[normalized.length - 1].date);
  const spanDays = firstDate && lastDate ? Math.round((lastDate.getTime() - firstDate.getTime()) / 86400000) : 0;
  if (spanDays > 4000) {
    return normalized;
  }

  const output = [{ ...normalized[0] }];
  let previousPoint = normalized[0];
  let previousDate = parseSeriesIsoDate(previousPoint.date);
  for (let index = 1; index < normalized.length; index += 1) {
    const currentPoint = normalized[index];
    const currentDate = parseSeriesIsoDate(currentPoint.date);
    if (!previousDate || !currentDate) {
      output.push({ ...currentPoint });
      previousPoint = currentPoint;
      previousDate = currentDate;
      continue;
    }

    let cursor = new Date(previousDate.getTime());
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    while (cursor < currentDate) {
      output.push({
        ...previousPoint,
        date: cursor.toISOString().slice(0, 10)
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    output.push({ ...currentPoint });
    previousPoint = currentPoint;
    previousDate = currentDate;
  }
  return output;
}

export function aggregateOpsByDate(operations, valueFn) {
  const map = {};
  operations.forEach((operation) => {
    const date = operation.date || todayIso();
    map[date] = (map[date] || 0) + valueFn(operation);
  });
  return Object.entries(map)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
