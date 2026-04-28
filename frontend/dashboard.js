export function renderDashboard(deps) {
  const {
    dom,
    state,
    computeMetrics,
    dashboardSeries,
    dashboardSummary,
    dashboardComparisonSeries,
    applyInflationToSeries,
    computeDashboardHistorySummary,
    formatMoney,
    formatPercent,
    drawLineChart,
    getVisibleLineChartModel,
    escapeHtml,
    formatFloat,
    renderTable,
    scheduleMetricsRefresh
  } = deps;

  const portfolioId = dom.dashboardPortfolioSelect.value || "";
  const metrics = computeMetrics(portfolioId);
  const nominalSeries = Array.isArray(dashboardSeries) ? dashboardSeries : [];
  const inflationEnabled = Boolean(state.meta && state.meta.dashboardInflationEnabled);
  const inflationRatePct = Number(state.meta && state.meta.dashboardInflationRatePct) || 0;
  const chartSeries =
    inflationEnabled && inflationRatePct > 0
      ? applyInflationToSeries(nominalSeries, inflationRatePct)
      : nominalSeries;
  const summary =
    computeDashboardHistorySummary(
      nominalSeries,
      inflationEnabled ? { inflationEnabled: true, inflationRatePct } : {}
    ) || (dashboardSummary && typeof dashboardSummary === "object" ? dashboardSummary : {});

  dom.statMarketValue.textContent = formatMoney(metrics.marketValue);
  dom.statCash.textContent = formatMoney(metrics.cashTotal);
  dom.statNetWorth.textContent = formatMoney(metrics.netWorth);
  dom.statTotalPl.textContent = formatMoney(metrics.totalPL);
  dom.statTotalPl.style.color = metrics.totalPL >= 0 ? "var(--brand-strong)" : "var(--danger)";
  const emptyDashboard =
    metrics.holdings.length === 0 &&
    Math.abs(Number(metrics.cashTotal || 0)) < 0.000001 &&
    Math.abs(Number(metrics.marketValue || 0)) < 0.000001;
  if (dom.dashboardEmptyState) {
    dom.dashboardEmptyState.hidden = !emptyDashboard;
  }
  if (dom.onboardingCard) {
    const needsOnboarding = state.assets.length === 0 || state.operations.length === 0;
    dom.onboardingCard.hidden = !needsOnboarding;
  }

  applyTrendCard(dom.statDailyChangePct, dom.statDailyChangeValue, summary.daily, formatPercent, formatMoney);
  applyTrendCard(dom.statMonthlyChangePct, dom.statMonthlyChangeValue, summary.monthly, formatPercent, formatMoney);
  applyTrendCard(dom.statYearlyChangePct, dom.statYearlyChangeValue, summary.yearly, formatPercent, formatMoney);

  const chartView = getVisibleLineChartModel(
    "dashboard",
    chartSeries.map((point) => point.date),
    chartSeries.map((point) => point.netWorth ?? point.value ?? point.marketValue),
    {
      comparisonSeries: Array.isArray(dashboardComparisonSeries) ? dashboardComparisonSeries : [],
      comparisonVisibility: "return-only"
    }
  );

  drawLineChart(
    dom.dashboardChart,
    chartView.labels,
    chartView.values,
    {
      color: "#0e7a64",
      valueFormatter: (value) => (chartView.mode === "return" ? formatPercent(value) : formatMoney(value)),
      seriesName: "Portfel",
      series: chartView.comparisonSeries,
      interaction: chartView.interaction
    }
  );

  if (dom.dashboardDetails) {
    dom.dashboardDetails.innerHTML = metrics.holdings.length
      ? `<div class="record-list">${metrics.holdings
          .map(
            (holding) => `
              <article class="record-card" data-action="show-record" data-kind="holding" data-id="${holding.assetId}">
                <div class="record-main">
                  <span class="record-kicker">${escapeHtml(holding.type || "Pozycja")}</span>
                  <h3 class="record-title">${escapeHtml(holding.ticker)} · ${escapeHtml(holding.name)}</h3>
                  <p class="record-subtitle">Ilość: ${escapeHtml(formatFloat(holding.qty))} · udział ${escapeHtml(
                    formatFloat(holding.share)
                  )}%</p>
                </div>
                <div class="record-value">
                  <strong>${formatMoney(holding.value)}</strong>
                  <span>P/L ${formatMoney(holding.unrealized)}</span>
                </div>
              </article>
            `
          )
          .join("")}</div>`
      : '<p class="muted">Brak pozycji w portfelu.</p>';
  }

  scheduleMetricsRefresh(portfolioId);
}

function applyTrendCard(pctNode, valueNode, payload, formatPercent, formatMoney) {
  const change = payload && typeof payload === "object" ? payload : {};
  const available = Boolean(change.available);
  const pct = Number.isFinite(change.pct) ? change.pct : 0;
  const amount = Number.isFinite(change.amount) ? change.amount : 0;
  if (pctNode) {
    pctNode.textContent = available ? formatPercent(pct) : "—";
    pctNode.style.color = !available ? "var(--text)" : pct >= 0 ? "var(--brand-strong)" : "var(--danger)";
  }
  if (valueNode) {
    valueNode.textContent = available ? formatMoney(amount) : "Brak pełnego zakresu";
    valueNode.style.color = !available ? "var(--muted)" : pct >= 0 ? "var(--brand-strong)" : "var(--danger)";
  }
}
