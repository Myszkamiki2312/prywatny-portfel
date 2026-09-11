// Tax and option calculators, extracted from app.js.
// Receives its app.js collaborators through `deps` — same dependency-injection shape as
// dashboard.js / operations.js / tools.js, which keeps app.js loadable as a classic script.

export async function onTaxOptimizeSubmit(deps) {
  const {
    apiRequest,
    backendSync,
    dom,
    escapeHtml,
    formToObject,
    formatFloat,
    formatMoney,
    toNum
  } = deps;
  if (!backendSync.available) {
    window.alert("Backend offline. Optymalizacja podatku niedostępna.");
    return;
  }
  try {
    const payload = formToObject(dom.taxOptimizeForm);
    const result = await apiRequest("/tools/tax/optimize", {
      method: "POST",
      body: payload,
      timeoutMs: 10000
    });
    const rows = (result.actions || [])
      .map(
        (item) =>
          `${escapeHtml(String(item.ticker || ""))}: harvest ${escapeHtml(formatMoney(toNum(item.suggestedHarvestLoss)))} (strata ${escapeHtml(formatMoney(toNum(item.unrealizedLoss)))})`
      )
      .join("<br/>");
    dom.taxOptimizeOutput.innerHTML = [
      `<p>Podstawa przed: <strong>${escapeHtml(formatMoney(toNum(result.taxableBaseBefore)))}</strong></p>`,
      `<p>Podatek przed: <strong>${escapeHtml(formatMoney(toNum(result.taxBefore)))}</strong></p>`,
      `<p>Podstawa po: <strong>${escapeHtml(formatMoney(toNum(result.taxableBaseAfter)))}</strong></p>`,
      `<p>Podatek po: <strong>${escapeHtml(formatMoney(toNum(result.taxAfter)))}</strong></p>`,
      `<p>Oszczędność: <strong>${escapeHtml(formatMoney(toNum(result.taxSaved)))}</strong></p>`,
      rows ? `<p>Proponowane transakcje:<br/>${rows}</p>` : "<p>Brak rekomendowanych transakcji loss harvesting.</p>"
    ].join("");
  } catch (error) {
    dom.taxOptimizeOutput.textContent = `Błąd optymalizacji: ${error.message}`;
  }
}

export async function onForeignDividendTaxSubmit(deps) {
  const {
    apiRequest,
    backendSync,
    dom,
    escapeHtml,
    formToObject,
    formatFloat,
    formatMoney,
    toNum
  } = deps;
  if (!backendSync.available) {
    window.alert("Backend offline.");
    return;
  }
  try {
    const payload = formToObject(dom.foreignDividendTaxForm);
    const result = await apiRequest("/tools/tax/foreign-dividend", {
      method: "POST",
      body: payload,
      timeoutMs: 10000
    });
    dom.foreignDividendTaxOutput.innerHTML = [
      `<p>Podatek zagraniczny: <strong>${escapeHtml(formatMoney(toNum(result.foreignWithheld)))}</strong></p>`,
      `<p>Podatek do dopłaty w PL: <strong>${escapeHtml(formatMoney(toNum(result.localTaxDue)))}</strong></p>`,
      `<p>Potencjalny zwrot z zagranicy: <strong>${escapeHtml(formatMoney(toNum(result.foreignRefundPotential)))}</strong></p>`,
      `<p>Dywidenda netto: <strong>${escapeHtml(formatMoney(toNum(result.netDividendAfterTax)))}</strong></p>`
    ].join("");
  } catch (error) {
    dom.foreignDividendTaxOutput.textContent = `Błąd: ${error.message}`;
  }
}

export async function onCryptoTaxSubmit(deps) {
  const {
    apiRequest,
    backendSync,
    dom,
    escapeHtml,
    formToObject,
    formatFloat,
    formatMoney,
    toNum
  } = deps;
  if (!backendSync.available) {
    window.alert("Backend offline.");
    return;
  }
  try {
    const payload = formToObject(dom.cryptoTaxForm);
    const result = await apiRequest("/tools/tax/crypto", {
      method: "POST",
      body: payload,
      timeoutMs: 10000
    });
    dom.cryptoTaxOutput.innerHTML = [
      `<p>Dochód krypto: <strong>${escapeHtml(formatMoney(toNum(result.cryptoIncomeBeforeCarry)))}</strong></p>`,
      `<p>Podstawa po kompensacji: <strong>${escapeHtml(formatMoney(toNum(result.taxableBase)))}</strong></p>`,
      `<p>Podatek do zapłaty: <strong>${escapeHtml(formatMoney(toNum(result.taxDue)))}</strong></p>`
    ].join("");
  } catch (error) {
    dom.cryptoTaxOutput.textContent = `Błąd: ${error.message}`;
  }
}

export async function onForeignInterestTaxSubmit(deps) {
  const {
    apiRequest,
    backendSync,
    dom,
    escapeHtml,
    formToObject,
    formatFloat,
    formatMoney,
    toNum
  } = deps;
  if (!backendSync.available) {
    window.alert("Backend offline.");
    return;
  }
  try {
    const payload = formToObject(dom.foreignInterestTaxForm);
    const result = await apiRequest("/tools/tax/foreign-interest", {
      method: "POST",
      body: payload,
      timeoutMs: 10000
    });
    dom.foreignInterestTaxOutput.innerHTML = [
      `<p>Podatek zagraniczny: <strong>${escapeHtml(formatMoney(toNum(result.foreignWithheld)))}</strong></p>`,
      `<p>Podatek do dopłaty w PL: <strong>${escapeHtml(formatMoney(toNum(result.localTaxDue)))}</strong></p>`,
      `<p>Odsetki netto: <strong>${escapeHtml(formatMoney(toNum(result.netInterestAfterTax)))}</strong></p>`
    ].join("");
  } catch (error) {
    dom.foreignInterestTaxOutput.textContent = `Błąd: ${error.message}`;
  }
}

export async function onBondInterestTaxSubmit(deps) {
  const {
    apiRequest,
    backendSync,
    dom,
    escapeHtml,
    formToObject,
    formatFloat,
    formatMoney,
    toNum
  } = deps;
  if (!backendSync.available) {
    window.alert("Backend offline.");
    return;
  }
  try {
    const payload = formToObject(dom.bondInterestTaxForm);
    const result = await apiRequest("/tools/tax/bond-interest", {
      method: "POST",
      body: payload,
      timeoutMs: 10000
    });
    dom.bondInterestTaxOutput.innerHTML = [
      `<p>Podstawa: <strong>${escapeHtml(formatMoney(toNum(result.taxableBase)))}</strong></p>`,
      `<p>Podatek: <strong>${escapeHtml(formatMoney(toNum(result.taxDue)))}</strong></p>`
    ].join("");
  } catch (error) {
    dom.bondInterestTaxOutput.textContent = `Błąd: ${error.message}`;
  }
}

export async function onOptionCalcSubmit(deps) {
  const {
    apiRequest,
    backendSync,
    dom,
    escapeHtml,
    formToObject,
    formatFloat,
    formatMoney,
    toNum
  } = deps;
  if (!backendSync.available) {
    window.alert("Backend offline.");
    return;
  }
  try {
    const payload = formToObject(dom.optionCalcForm);
    const result = await apiRequest("/tools/options/exercise-price", {
      method: "POST",
      body: payload,
      timeoutMs: 10000
    });
    dom.optionCalcOutput.innerHTML = [
      `<p>Break-even: <strong>${escapeHtml(formatFloat(toNum(result.breakEven)))}</strong></p>`,
      `<p>Status: <strong>${escapeHtml(result.status || "-")}</strong></p>`,
      `<p>Wartość wewnętrzna: <strong>${escapeHtml(formatFloat(toNum(result.intrinsicValue)))}</strong></p>`,
      `<p>P/L pozycji: <strong>${escapeHtml(formatMoney(toNum(result.positionPL)))}</strong></p>`,
      `<p>Rekomendacja: <strong>${escapeHtml(result.recommendation || "-")}</strong></p>`
    ].join("");
  } catch (error) {
    dom.optionCalcOutput.textContent = `Błąd: ${error.message}`;
  }
}

export function onTaxSubmit(deps, event) {
  const {
    apiRequest,
    backendSync,
    dom,
    escapeHtml,
    formToObject,
    formatFloat,
    formatMoney,
    toNum
  } = deps;
  event.preventDefault();
  const data = formToObject(event.currentTarget);
  const realized = toNum(data.realized);
  const dividends = toNum(data.dividends);
  const costs = toNum(data.costs);
  const rate = toNum(data.rate) / 100;
  const taxableBase = Math.max(0, realized + dividends - costs);
  const tax = taxableBase * rate;
  const optimizationHint = Math.max(0, tax - Math.max(0, realized - costs) * rate);
  dom.taxOutput.innerHTML = [
    `<p>Podstawa opodatkowania: <strong>${escapeHtml(formatMoney(taxableBase))}</strong></p>`,
    `<p>Szacowany podatek: <strong>${escapeHtml(formatMoney(tax))}</strong></p>`,
    `<p>Potencjalna ulga po kompensacji dywidend i kosztów: <strong>${escapeHtml(formatMoney(optimizationHint))}</strong></p>`
  ].join("");
}
