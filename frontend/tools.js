export function toolsPortfolioId(deps) {
  const { dom } = deps;
  return dom.toolsPortfolioSelect ? dom.toolsPortfolioSelect.value || "" : "";
}

export function scannerFiltersFromForm(deps) {
  const { dom, formToObject, toNum, textOrFallback } = deps;
  if (!dom.scannerForm) {
    return {
      minScore: 0,
      maxRisk: 10,
      sector: "",
      minPrice: 0
    };
  }
  const data = formToObject(dom.scannerForm);
  return {
    minScore: toNum(data.minScore),
    maxRisk: Math.max(1, Math.min(10, toNum(data.maxRisk) || 10)),
    sector: textOrFallback(data.sector, ""),
    minPrice: Math.max(0, toNum(data.minPrice))
  };
}

export async function runScanner(deps, options = {}) {
  const { backendSync, apiRequest, localScanner, renderScannerRows, dom, updateBackendStatus, toNum, windowRef } = deps;
  const silent = Boolean(options.silent);
  const filters = scannerFiltersFromForm(deps);
  filters.portfolioId = toolsPortfolioId(deps);
  try {
    let items = [];
    let mode = "local";
    if (backendSync.available) {
      const payload = await apiRequest("/tools/scanner", {
        method: "POST",
        body: filters,
        timeoutMs: 12000
      });
      items = Array.isArray(payload.items) ? payload.items : [];
      mode = "backend";
    } else {
      items = localScanner(filters);
    }
    renderScannerRows(items);
    if (dom.scannerInfo) {
      dom.scannerInfo.textContent = `Skaner ${mode}: ${items.length} wyników`;
    }
  } catch (error) {
    backendSync.available = false;
    updateBackendStatus();
    const local = localScanner(filters);
    renderScannerRows(local);
    if (dom.scannerInfo) {
      dom.scannerInfo.textContent = `Skaner fallback lokalny: ${local.length} wyników`;
    }
    if (!silent) {
      windowRef.alert("Backend skanera niedostępny, pokazuję wyniki lokalne.");
    }
  }
}

export async function refreshSignals(deps, options = {}) {
  const { backendSync, apiRequest, localSignals, renderSignalsRows, dom, updateBackendStatus, windowRef } = deps;
  const silent = Boolean(options.silent);
  const portfolioId = toolsPortfolioId(deps);
  try {
    let signals = [];
    let mode = "local";
    if (backendSync.available) {
      const query = portfolioId ? `?portfolioId=${encodeURIComponent(portfolioId)}` : "";
      const payload = await apiRequest(`/tools/signals${query}`, { timeoutMs: 10000 });
      signals = Array.isArray(payload.signals) ? payload.signals : [];
      mode = "backend";
    } else {
      signals = localSignals(portfolioId);
    }
    renderSignalsRows(signals);
    if (dom.signalsInfo) {
      dom.signalsInfo.textContent = `Sygnały ${mode}: ${signals.length} pozycji`;
    }
  } catch (error) {
    backendSync.available = false;
    updateBackendStatus();
    const signals = localSignals(portfolioId);
    renderSignalsRows(signals);
    if (dom.signalsInfo) {
      dom.signalsInfo.textContent = `Sygnały fallback lokalny: ${signals.length} pozycji`;
    }
    if (!silent) {
      windowRef.alert("Backend sygnałów niedostępny, używam lokalnych reguł.");
    }
  }
}

export async function refreshCalendar(deps, options = {}) {
  const { backendSync, apiRequest, localCalendar, renderCalendarRows, dom, updateBackendStatus, formToObject, toNum, windowRef } = deps;
  const silent = Boolean(options.silent);
  const formData = dom.calendarForm ? formToObject(dom.calendarForm) : {};
  const days = Math.max(1, Math.min(365, Math.round(toNum(formData.days) || 60)));
  const portfolioId = toolsPortfolioId(deps);
  try {
    let events = [];
    let mode = "local";
    if (backendSync.available) {
      const query = `?portfolioId=${encodeURIComponent(portfolioId)}&days=${days}`;
      const payload = await apiRequest(`/tools/calendar${query}`, { timeoutMs: 10000 });
      events = Array.isArray(payload.events) ? payload.events : [];
      mode = "backend";
    } else {
      events = localCalendar(days, portfolioId);
    }
    renderCalendarRows(events);
    if (dom.calendarInfo) {
      dom.calendarInfo.textContent = `Kalendarium ${mode}: ${events.length} wydarzeń w ${days} dni`;
    }
  } catch (error) {
    backendSync.available = false;
    updateBackendStatus();
    const events = localCalendar(days, portfolioId);
    renderCalendarRows(events);
    if (dom.calendarInfo) {
      dom.calendarInfo.textContent = `Kalendarium fallback lokalny: ${events.length} wydarzeń`;
    }
    if (!silent) {
      windowRef.alert("Backend kalendarium niedostępny, pokazuję lokalną wersję.");
    }
  }
}

export async function refreshRecommendations(deps, options = {}) {
  const { backendSync, apiRequest, localRecommendations, renderRecommendationsRows, dom, updateBackendStatus, windowRef } = deps;
  const silent = Boolean(options.silent);
  const portfolioId = toolsPortfolioId(deps);
  try {
    let items = [];
    let mode = "local";
    if (backendSync.available) {
      const query = portfolioId ? `?portfolioId=${encodeURIComponent(portfolioId)}` : "";
      const payload = await apiRequest(`/tools/recommendations${query}`, { timeoutMs: 9000 });
      items = Array.isArray(payload.recommendations) ? payload.recommendations : [];
      mode = "backend";
    } else {
      items = localRecommendations(portfolioId);
    }
    renderRecommendationsRows(items);
    if (dom.recommendationsInfo) {
      dom.recommendationsInfo.textContent = `Rekomendacje ${mode}: ${items.length}`;
    }
  } catch (error) {
    backendSync.available = false;
    updateBackendStatus();
    const items = localRecommendations(portfolioId);
    renderRecommendationsRows(items);
    if (dom.recommendationsInfo) {
      dom.recommendationsInfo.textContent = `Rekomendacje fallback lokalny: ${items.length}`;
    }
    if (!silent) {
      windowRef.alert("Backend rekomendacji niedostępny, używam lokalnych reguł.");
    }
  }
}

export async function runAlertWorkflow(deps, options = {}) {
  const {
    backendSync,
    apiRequest,
    localAlertWorkflow,
    renderAlerts,
    renderAlertWorkflowRows,
    dom,
    updateBackendStatus,
    formatMoney,
    toNum,
    normalizeState,
    setState,
    getState,
    saveState,
    windowRef
  } = deps;
  const interactive = Boolean(options.interactive);
  const portfolioId = toolsPortfolioId(deps);
  try {
    let payload;
    if (backendSync.available) {
      payload = await apiRequest("/tools/alerts/run", {
        method: "POST",
        body: { portfolioId },
        timeoutMs: 12000
      });
      const refreshed = await apiRequest("/state", { timeoutMs: 8000 });
      if (refreshed && refreshed.state) {
        setState(normalizeState(refreshed.state));
        saveState({ skipBackend: true });
      }
    } else {
      payload = localAlertWorkflow();
    }
    renderAlerts();
    renderAlertWorkflowRows(payload.history || []);
    const summary = payload.summary || {};
    if (dom.alertWorkflowInfo) {
      dom.alertWorkflowInfo.textContent = `Workflow: ${summary.triggered || 0} trafionych / ${
        summary.totalAlerts || 0
      } alertów`;
    }
    const state = getState();
    return {
      triggeredLabels: (payload.triggered || []).map(
        (row) => `${row.ticker} (${formatMoney(toNum(row.currentPrice), row.currency || state.meta.baseCurrency)})`
      )
    };
  } catch (error) {
    backendSync.available = false;
    updateBackendStatus();
    const payload = localAlertWorkflow();
    renderAlerts();
    renderAlertWorkflowRows(payload.history || []);
    if (dom.alertWorkflowInfo) {
      dom.alertWorkflowInfo.textContent = `Workflow lokalny: ${payload.summary.triggered} trafionych`;
    }
    if (interactive) {
      windowRef.alert("Backend workflow alertów niedostępny, wykonano wersję lokalną.");
    }
    const state = getState();
    return {
      triggeredLabels: (payload.triggered || []).map(
        (row) => `${row.ticker} (${formatMoney(toNum(row.currentPrice), row.currency || state.meta.baseCurrency)})`
      )
    };
  }
}

export async function refreshAlertHistory(deps, options = {}) {
  const { backendSync, apiRequest, localAlertHistory, renderAlertWorkflowRows, updateBackendStatus, windowRef } = deps;
  const silent = Boolean(options.silent);
  try {
    let history = [];
    if (backendSync.available) {
      const payload = await apiRequest("/tools/alerts/history?limit=80", { timeoutMs: 7000 });
      history = Array.isArray(payload.history) ? payload.history : [];
    } else {
      history = localAlertHistory();
    }
    renderAlertWorkflowRows(history);
  } catch (error) {
    backendSync.available = false;
    updateBackendStatus();
    renderAlertWorkflowRows(localAlertHistory());
    if (!silent) {
      windowRef.alert("Nie udało się pobrać historii workflow alertów z backendu.");
    }
  }
}
