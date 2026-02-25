export function renderDashboard(deps) {
  const {
    dom,
    state,
    computeMetrics,
    buildSeries,
    formatMoney,
    drawLineChart,
    escapeHtml,
    formatFloat,
    renderTable,
    scheduleMetricsRefresh
  } = deps;

  const portfolioId = dom.dashboardPortfolioSelect.value || "";
  const metrics = computeMetrics(portfolioId);
  const series = buildSeries(portfolioId);

  dom.statMarketValue.textContent = formatMoney(metrics.marketValue);
  dom.statCash.textContent = formatMoney(metrics.cashTotal);
  dom.statNetWorth.textContent = formatMoney(metrics.netWorth);
  dom.statTotalPl.textContent = formatMoney(metrics.totalPL);
  dom.statTotalPl.style.color = metrics.totalPL >= 0 ? "var(--brand-strong)" : "var(--danger)";

  drawLineChart(
    dom.dashboardChart,
    series.map((point) => point.date),
    series.map((point) => point.marketValue),
    { color: "#0e7a64" }
  );

  const rows = metrics.holdings.map((holding) => [
    escapeHtml(holding.ticker),
    escapeHtml(holding.name),
    escapeHtml(holding.type),
    formatFloat(holding.qty),
    formatMoney(holding.price, holding.currency),
    formatMoney(holding.value),
    formatMoney(holding.unrealized),
    `${formatFloat(holding.share)}%`
  ]);
  renderTable(
    dom.dashboardDetails,
    ["Ticker", "Nazwa", "Typ", "Ilość", "Cena", "Wartość", "Niezrealizowany P/L", "Udział"],
    rows
  );

  scheduleMetricsRefresh(portfolioId);
}
