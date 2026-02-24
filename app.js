"use strict";

const STORAGE_KEY = "myfund-solo-state-v1";
const API_BASE = "/api";
const PLAN_ORDER = ["Brak", "Basic", "Standard", "Pro", "Expert"];
const PLAN_LIMITS = {
  Brak: { portfolios: 0, groupPortfolios: 0, twinPortfolios: 0 },
  Basic: { portfolios: 1, groupPortfolios: 1, twinPortfolios: 1 },
  Standard: { portfolios: 5, groupPortfolios: 1, twinPortfolios: 1 },
  Pro: { portfolios: 20, groupPortfolios: 1, twinPortfolios: 1 },
  Expert: { portfolios: 99, groupPortfolios: 99, twinPortfolios: 99 }
};

const OPERATION_FEATURES = [
  "Operacje gotówkowe",
  "Kupno/sprzedaż walorów",
  "Przelewy gotówkowe",
  "Lokaty",
  "Pożyczki społecznościowe",
  "Konwersje walorów",
  "Konta",
  "Zobowiązania",
  "Import operacji",
  "Import operacji z mail'a",
  "Operacje cykliczne"
];

const REPORT_FEATURES = [
  "Skład i struktura",
  "Statystyki portfela",
  "Struktura kupna walorów",
  "Zysk per typ inwestycji",
  "Zysk per konto inwestycyjne",
  "Struktura portfela w czasie",
  "Udział walorów per konto",
  "Wartość jednostki w czasie",
  "Zmienność stopy zwrotu",
  "Rolling return w czasie",
  "Drawdown portfela w czasie",
  "Zysk w czasie",
  "Zmiana okresowa w czasie",
  "Wartość inwestycji w czasie",
  "Udział wartości portfeli w czasie",
  "Wartość zobowiązań w czasie",
  "Wartość majątku w czasie",
  "Struktura majątku",
  "Ekspozycja walutowa",
  "Bilans kontraktów",
  "Wkład i wartość",
  "Wkład i zysk",
  "Analiza fundamentalna",
  "Analiza ryzyka",
  "Zarządzanie ryzykiem",
  "Analiza sektorowa i branżowa",
  "Analiza indeksowa",
  "Struktura per tag",
  "Udział kont inwestycyjnych w portfelu",
  "Stopa zwrotu w czasie i benchmark",
  "Udział walorów w czasie",
  "Udział tagów w czasie",
  "Udział kont inwestycyjnych w czasie",
  "Ekspozycja walutowa w czasie",
  "Stopa zwrotu w okresach",
  "Ranking walorów portfela",
  "Porównanie walorów portfela",
  "Analiza dywidend w czasie",
  "Prowizje w czasie",
  "Mapa cieplna portfela",
  "Zamknięte inwestycje - podsumowanie",
  "Zamknięte inwestycje - szczegóły",
  "Zamknięte inwestycje - statystyki",
  "Podsumowanie portfeli",
  "Historia operacji",
  "Podsumowania na e-mail",
  "Limity IKE/IKZE/PPK"
];

const TOOL_FEATURES = [
  "Skaner spółek",
  "Wykresy liniowe",
  "Wykresy świecowe",
  "Analiza techniczna z TradingView",
  "Notowania bieżące i historyczne",
  "Notowania online (15 minut opóźnienia)",
  "Analiza obligacji Catalyst",
  "Analiza szczegółowa waloru",
  "Ranking funduszy inwestycyjnych",
  "Analiza stopa zwrotu v. ryzyko",
  "Wykresy walorów dla grup",
  "Kokpit",
  "Mapa cieplna dla grup spółek (heatmap)",
  "Portfele - stopa zwrotu w okresach",
  "Portfele - zysk w okresach",
  "Stopa zwrotu portfeli w czasie",
  "Porównanie stóp zwrotów portfeli",
  "Ulubione",
  "Alerty",
  "Strategie",
  "Porównanie stóp zwrotu walorów",
  "Porównanie walorów w okresach",
  "Analiza kupna w okresach",
  "Sygnały AT",
  "Komunikaty ESPI",
  "Rekomendacje",
  "Kalendarium spółek",
  "Notatki użytkownika",
  "Oblicz podatek",
  "Optymalizuj podatek",
  "Podatek od dywidend zagranicznych",
  "Podatek od kryptowalut",
  "Podatek od odsetek dla konta i lokat zagranicznych",
  "Podatek od odsetek obligacji",
  "Forum spółek",
  "Exercise price",
  "Dodawanie tagów",
  "Narzędzia PPK",
  "Subkonta"
];

const PORTFOLIO_FEATURES = [
  "Dodawanie/usuwanie portfeli",
  "Dodawanie/usuwanie portfeli grupowych",
  "Dodawanie/usuwanie portfeli bliźniaczych",
  "Dodawanie/usuwanie sub-portfeli",
  "Kopiowanie portfela",
  "Eksportowanie i importowanie portfela",
  "Własne nazwy walorów",
  "Własne typy walorów",
  "Własne ryzyko walorów",
  "Własne benchmarki",
  "Walory użytkownika",
  "Opcje portfela",
  "Portfel wzorcowy",
  "Cel inwestycyjny",
  "Dostęp do portfeli publicznych",
  "Zmiana waluty przeliczania składu portfela"
];

const OPERATION_TYPES = [
  "Operacja gotówkowa",
  "Kupno waloru",
  "Sprzedaż waloru",
  "Przelew gotówkowy",
  "Lokata",
  "Pożyczka społecznościowa",
  "Konwersja walorów",
  "Zobowiązanie",
  "Dywidenda",
  "Prowizja",
  "Odsetki",
  "Import operacji"
];

const ACTIVE_PLANNED = {
  implemented: "Działa",
  planned: "Do rozbudowy"
};

let state = loadState();
const dom = {};
const backendSync = {
  available: false,
  checked: false,
  pushTimer: 0,
  pushInFlight: false,
  suspendPush: false,
  reportRequestSeq: 0,
  metricsTimer: 0,
  metricsRequestSeq: 0,
  healthProbe: null
};
const candlesView = {
  all: [],
  start: 0,
  end: 0,
  ticker: "",
  signal: "",
  indicators: {}
};
const editingState = {
  portfolioId: "",
  accountId: "",
  assetId: "",
  operationId: "",
  recurringId: "",
  alertId: "",
  liabilityId: ""
};

document.addEventListener("DOMContentLoaded", () => {
  void init();
});

async function init() {
  cacheDom();
  seedStaticSelects();
  bindEvents();
  resetOperationForm();
  await hydrateFromBackend();
  renderAll();
}

function cacheDom() {
  dom.tabs = document.getElementById("tabs");
  dom.planSelect = document.getElementById("planSelect");
  dom.baseCurrencySelect = document.getElementById("baseCurrencySelect");
  dom.exportBackupBtn = document.getElementById("exportBackupBtn");
  dom.importBackupInput = document.getElementById("importBackupInput");
  dom.resetStateBtn = document.getElementById("resetStateBtn");
  dom.refreshQuotesBtn = document.getElementById("refreshQuotesBtn");
  dom.backendStatus = document.getElementById("backendStatus");

  dom.dashboardPortfolioSelect = document.getElementById("dashboardPortfolioSelect");
  dom.statMarketValue = document.getElementById("statMarketValue");
  dom.statCash = document.getElementById("statCash");
  dom.statNetWorth = document.getElementById("statNetWorth");
  dom.statTotalPl = document.getElementById("statTotalPl");
  dom.dashboardChart = document.getElementById("dashboardChart");
  dom.dashboardDetails = document.getElementById("dashboardDetails");

  dom.portfolioForm = document.getElementById("portfolioForm");
  dom.portfolioEditId = document.getElementById("portfolioEditId");
  dom.portfolioSubmitBtn = document.getElementById("portfolioSubmitBtn");
  dom.portfolioCancelEditBtn = document.getElementById("portfolioCancelEditBtn");
  dom.portfolioParentSelect = document.getElementById("portfolioParentSelect");
  dom.portfolioTwinSelect = document.getElementById("portfolioTwinSelect");
  dom.portfolioList = document.getElementById("portfolioList");

  dom.accountForm = document.getElementById("accountForm");
  dom.accountEditId = document.getElementById("accountEditId");
  dom.accountSubmitBtn = document.getElementById("accountSubmitBtn");
  dom.accountCancelEditBtn = document.getElementById("accountCancelEditBtn");
  dom.assetForm = document.getElementById("assetForm");
  dom.assetEditId = document.getElementById("assetEditId");
  dom.assetSubmitBtn = document.getElementById("assetSubmitBtn");
  dom.assetCancelEditBtn = document.getElementById("assetCancelEditBtn");
  dom.accountList = document.getElementById("accountList");
  dom.assetList = document.getElementById("assetList");

  dom.operationForm = document.getElementById("operationForm");
  dom.operationEditId = document.getElementById("operationEditId");
  dom.operationSubmitBtn = document.getElementById("operationSubmitBtn");
  dom.operationCancelEditBtn = document.getElementById("operationCancelEditBtn");
  dom.operationTypeSelect = document.getElementById("operationTypeSelect");
  dom.operationPortfolioSelect = document.getElementById("operationPortfolioSelect");
  dom.operationAccountSelect = document.getElementById("operationAccountSelect");
  dom.operationAssetSelect = document.getElementById("operationAssetSelect");
  dom.operationTargetAssetSelect = document.getElementById("operationTargetAssetSelect");
  dom.csvImportInput = document.getElementById("csvImportInput");
  dom.brokerSelect = document.getElementById("brokerSelect");
  dom.brokerCsvInput = document.getElementById("brokerCsvInput");
  dom.brokerImportInfo = document.getElementById("brokerImportInfo");
  dom.mailImportText = document.getElementById("mailImportText");
  dom.mailImportBtn = document.getElementById("mailImportBtn");
  dom.recurringForm = document.getElementById("recurringForm");
  dom.recurringEditId = document.getElementById("recurringEditId");
  dom.recurringSubmitBtn = document.getElementById("recurringSubmitBtn");
  dom.recurringCancelEditBtn = document.getElementById("recurringCancelEditBtn");
  dom.recurringTypeSelect = document.getElementById("recurringTypeSelect");
  dom.recurringPortfolioSelect = document.getElementById("recurringPortfolioSelect");
  dom.recurringAccountSelect = document.getElementById("recurringAccountSelect");
  dom.recurringAssetSelect = document.getElementById("recurringAssetSelect");
  dom.runRecurringBtn = document.getElementById("runRecurringBtn");
  dom.recurringList = document.getElementById("recurringList");
  dom.operationList = document.getElementById("operationList");

  dom.reportPortfolioSelect = document.getElementById("reportPortfolioSelect");
  dom.reportSelect = document.getElementById("reportSelect");
  dom.generateReportBtn = document.getElementById("generateReportBtn");
  dom.reportInfo = document.getElementById("reportInfo");
  dom.reportOutput = document.getElementById("reportOutput");
  dom.reportChart = document.getElementById("reportChart");

  dom.alertForm = document.getElementById("alertForm");
  dom.alertEditId = document.getElementById("alertEditId");
  dom.alertSubmitBtn = document.getElementById("alertSubmitBtn");
  dom.alertCancelEditBtn = document.getElementById("alertCancelEditBtn");
  dom.alertAssetSelect = document.getElementById("alertAssetSelect");
  dom.checkAlertsBtn = document.getElementById("checkAlertsBtn");
  dom.alertList = document.getElementById("alertList");
  dom.noteForm = document.getElementById("noteForm");
  dom.strategyForm = document.getElementById("strategyForm");
  dom.notesList = document.getElementById("notesList");
  dom.strategyList = document.getElementById("strategyList");
  dom.toolsPortfolioSelect = document.getElementById("toolsPortfolioSelect");
  dom.scannerForm = document.getElementById("scannerForm");
  dom.scannerInfo = document.getElementById("scannerInfo");
  dom.scannerList = document.getElementById("scannerList");
  dom.refreshSignalsBtn = document.getElementById("refreshSignalsBtn");
  dom.signalsInfo = document.getElementById("signalsInfo");
  dom.signalsList = document.getElementById("signalsList");
  dom.calendarForm = document.getElementById("calendarForm");
  dom.calendarInfo = document.getElementById("calendarInfo");
  dom.calendarList = document.getElementById("calendarList");
  dom.refreshRecommendationsBtn = document.getElementById("refreshRecommendationsBtn");
  dom.recommendationsInfo = document.getElementById("recommendationsInfo");
  dom.recommendationsList = document.getElementById("recommendationsList");
  dom.runAlertWorkflowBtn = document.getElementById("runAlertWorkflowBtn");
  dom.alertWorkflowInfo = document.getElementById("alertWorkflowInfo");
  dom.alertWorkflowList = document.getElementById("alertWorkflowList");
  dom.realtimeConfigForm = document.getElementById("realtimeConfigForm");
  dom.realtimeInfo = document.getElementById("realtimeInfo");
  dom.webhookUrl = document.getElementById("webhookUrl");
  dom.runRealtimeNowBtn = document.getElementById("runRealtimeNowBtn");
  dom.startRealtimeBtn = document.getElementById("startRealtimeBtn");
  dom.stopRealtimeBtn = document.getElementById("stopRealtimeBtn");
  dom.notificationConfigForm = document.getElementById("notificationConfigForm");
  dom.notificationInfo = document.getElementById("notificationInfo");
  dom.testNotificationBtn = document.getElementById("testNotificationBtn");
  dom.notificationHistoryList = document.getElementById("notificationHistoryList");
  dom.backupConfigForm = document.getElementById("backupConfigForm");
  dom.runBackupNowBtn = document.getElementById("runBackupNowBtn");
  dom.verifyBackupBtn = document.getElementById("verifyBackupBtn");
  dom.refreshBackupRunsBtn = document.getElementById("refreshBackupRunsBtn");
  dom.backupInfo = document.getElementById("backupInfo");
  dom.backupRunsList = document.getElementById("backupRunsList");
  dom.refreshMonitoringBtn = document.getElementById("refreshMonitoringBtn");
  dom.monitoringInfo = document.getElementById("monitoringInfo");
  dom.monitoringTable = document.getElementById("monitoringTable");
  dom.liabilityForm = document.getElementById("liabilityForm");
  dom.liabilityEditId = document.getElementById("liabilityEditId");
  dom.liabilitySubmitBtn = document.getElementById("liabilitySubmitBtn");
  dom.liabilityCancelEditBtn = document.getElementById("liabilityCancelEditBtn");
  dom.liabilityList = document.getElementById("liabilityList");
  dom.taxForm = document.getElementById("taxForm");
  dom.taxOutput = document.getElementById("taxOutput");
  dom.toolCatalog = document.getElementById("toolCatalog");
  dom.candlesForm = document.getElementById("candlesForm");
  dom.candlesTickerInput = document.getElementById("candlesTickerInput");
  dom.openTradingviewBtn = document.getElementById("openTradingviewBtn");
  dom.candlesInfo = document.getElementById("candlesInfo");
  dom.candlesChart = document.getElementById("candlesChart");
  dom.candlesWindowInput = document.getElementById("candlesWindowInput");
  dom.candlesOffsetInput = document.getElementById("candlesOffsetInput");
  dom.candlesResetZoomBtn = document.getElementById("candlesResetZoomBtn");
  dom.candlesRangeInfo = document.getElementById("candlesRangeInfo");
  dom.candlesTable = document.getElementById("candlesTable");
  dom.refreshCatalystBtn = document.getElementById("refreshCatalystBtn");
  dom.refreshFundsRankingBtn = document.getElementById("refreshFundsRankingBtn");
  dom.catalystInfo = document.getElementById("catalystInfo");
  dom.catalystTable = document.getElementById("catalystTable");
  dom.fundsRankingInfo = document.getElementById("fundsRankingInfo");
  dom.fundsRankingTable = document.getElementById("fundsRankingTable");
  dom.espiForm = document.getElementById("espiForm");
  dom.espiInfo = document.getElementById("espiInfo");
  dom.espiTable = document.getElementById("espiTable");
  dom.taxOptimizeForm = document.getElementById("taxOptimizeForm");
  dom.taxOptimizeOutput = document.getElementById("taxOptimizeOutput");
  dom.foreignDividendTaxForm = document.getElementById("foreignDividendTaxForm");
  dom.foreignDividendTaxOutput = document.getElementById("foreignDividendTaxOutput");
  dom.cryptoTaxForm = document.getElementById("cryptoTaxForm");
  dom.cryptoTaxOutput = document.getElementById("cryptoTaxOutput");
  dom.foreignInterestTaxForm = document.getElementById("foreignInterestTaxForm");
  dom.foreignInterestTaxOutput = document.getElementById("foreignInterestTaxOutput");
  dom.bondInterestTaxForm = document.getElementById("bondInterestTaxForm");
  dom.bondInterestTaxOutput = document.getElementById("bondInterestTaxOutput");
  dom.forumForm = document.getElementById("forumForm");
  dom.forumFilterForm = document.getElementById("forumFilterForm");
  dom.forumFilterTicker = document.getElementById("forumFilterTicker");
  dom.forumInfo = document.getElementById("forumInfo");
  dom.forumList = document.getElementById("forumList");
  dom.optionCalcForm = document.getElementById("optionCalcForm");
  dom.optionCalcOutput = document.getElementById("optionCalcOutput");
  dom.optionPositionForm = document.getElementById("optionPositionForm");
  dom.refreshOptionPositionsBtn = document.getElementById("refreshOptionPositionsBtn");
  dom.optionPositionsInfo = document.getElementById("optionPositionsInfo");
  dom.optionPositionsList = document.getElementById("optionPositionsList");
  dom.modelPortfolioForm = document.getElementById("modelPortfolioForm");
  dom.modelPortfolioWeightsInput = document.getElementById("modelPortfolioWeightsInput");
  dom.compareModelPortfolioBtn = document.getElementById("compareModelPortfolioBtn");
  dom.modelPortfolioInfo = document.getElementById("modelPortfolioInfo");
  dom.modelPortfolioTable = document.getElementById("modelPortfolioTable");
  dom.refreshPublicPortfoliosBtn = document.getElementById("refreshPublicPortfoliosBtn");
  dom.publicPortfoliosInfo = document.getElementById("publicPortfoliosInfo");
  dom.publicPortfoliosTable = document.getElementById("publicPortfoliosTable");

  dom.featureMatrix = document.getElementById("featureMatrix");
}

function seedStaticSelects() {
  fillSelect(dom.planSelect, PLAN_ORDER.map((plan) => ({ value: plan, label: plan })));
  fillSelect(dom.reportSelect, REPORT_FEATURES.map((item) => ({ value: item, label: item })));
  fillSelect(
    dom.operationTypeSelect,
    OPERATION_TYPES.map((type) => ({ value: type, label: type }))
  );
  fillSelect(
    dom.recurringTypeSelect,
    OPERATION_TYPES.map((type) => ({ value: type, label: type }))
  );
}

function bindEvents() {
  dom.tabs.addEventListener("click", onTabClick);
  dom.planSelect.addEventListener("change", onPlanChange);
  dom.baseCurrencySelect.addEventListener("change", onBaseCurrencyChange);
  dom.dashboardPortfolioSelect.addEventListener("change", renderDashboard);
  dom.reportPortfolioSelect.addEventListener("change", renderReportCurrent);

  dom.portfolioForm.addEventListener("submit", onPortfolioSubmit);
  dom.portfolioCancelEditBtn.addEventListener("click", () => {
    resetPortfolioForm();
  });
  dom.accountForm.addEventListener("submit", onAccountSubmit);
  dom.accountCancelEditBtn.addEventListener("click", () => {
    resetAccountForm();
  });
  dom.assetForm.addEventListener("submit", onAssetSubmit);
  dom.assetCancelEditBtn.addEventListener("click", () => {
    resetAssetForm();
  });
  dom.operationForm.addEventListener("submit", onOperationSubmit);
  dom.operationCancelEditBtn.addEventListener("click", () => {
    resetOperationForm();
  });
  dom.recurringForm.addEventListener("submit", onRecurringSubmit);
  dom.recurringCancelEditBtn.addEventListener("click", () => {
    resetRecurringForm();
  });
  dom.runRecurringBtn.addEventListener("click", onRunRecurring);
  dom.mailImportBtn.addEventListener("click", onMailImport);
  dom.generateReportBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void renderReportCurrent({ force: true });
  });
  dom.alertForm.addEventListener("submit", onAlertSubmit);
  dom.alertCancelEditBtn.addEventListener("click", () => {
    resetAlertForm();
  });
  dom.checkAlertsBtn.addEventListener("click", onCheckAlerts);
  dom.noteForm.addEventListener("submit", onNoteSubmit);
  dom.strategyForm.addEventListener("submit", onStrategySubmit);
  dom.toolsPortfolioSelect.addEventListener("change", () => {
    if (isViewActive("toolsView")) {
      void refreshExpertTools({ force: true });
    }
  });
  dom.scannerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void runScanner();
  });
  dom.refreshSignalsBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void refreshSignals();
  });
  dom.calendarForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void refreshCalendar();
  });
  dom.refreshRecommendationsBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void refreshRecommendations();
  });
  dom.runAlertWorkflowBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void runAlertWorkflow();
  });
  dom.realtimeConfigForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveRealtimeConfigFromForm();
  });
  dom.runRealtimeNowBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void runRealtimeNow();
  });
  dom.startRealtimeBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void toggleRealtimeCron(true);
  });
  dom.stopRealtimeBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void toggleRealtimeCron(false);
  });
  dom.notificationConfigForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveNotificationConfigFromForm();
  });
  dom.testNotificationBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void sendTestNotification();
  });
  dom.backupConfigForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveBackupConfigFromForm();
  });
  dom.runBackupNowBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void runBackupNow();
  });
  dom.verifyBackupBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void verifyBackupNow();
  });
  dom.refreshBackupRunsBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void refreshBackupRuns();
  });
  dom.refreshMonitoringBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void refreshMonitoringStatus();
  });
  dom.liabilityForm.addEventListener("submit", onLiabilitySubmit);
  dom.liabilityCancelEditBtn.addEventListener("click", () => {
    resetLiabilityForm();
  });
  dom.taxForm.addEventListener("submit", onTaxSubmit);
  dom.candlesForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void refreshCandles();
  });
  dom.openTradingviewBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void openTradingview();
  });
  dom.candlesWindowInput.addEventListener("input", () => {
    applyCandlesWindowFromInput();
  });
  dom.candlesOffsetInput.addEventListener("input", () => {
    applyCandlesOffsetFromInput();
  });
  dom.candlesResetZoomBtn.addEventListener("click", (event) => {
    event.preventDefault();
    resetCandlesViewport();
    renderCandlesViewport();
  });
  dom.candlesChart.addEventListener(
    "wheel",
    (event) => {
      onCandlesChartWheel(event);
    },
    { passive: false }
  );
  dom.refreshCatalystBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void refreshCatalyst();
  });
  dom.refreshFundsRankingBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void refreshFundsRanking();
  });
  dom.espiForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void refreshEspi();
  });
  dom.taxOptimizeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void onTaxOptimizeSubmit();
  });
  dom.foreignDividendTaxForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void onForeignDividendTaxSubmit();
  });
  dom.cryptoTaxForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void onCryptoTaxSubmit();
  });
  dom.foreignInterestTaxForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void onForeignInterestTaxSubmit();
  });
  dom.bondInterestTaxForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void onBondInterestTaxSubmit();
  });
  dom.forumForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void onForumPostSubmit();
  });
  dom.forumFilterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void refreshForum();
  });
  dom.optionCalcForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void onOptionCalcSubmit();
  });
  dom.optionPositionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void onOptionPositionSubmit();
  });
  dom.refreshOptionPositionsBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void refreshOptionPositions();
  });
  dom.modelPortfolioForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void onModelPortfolioSubmit();
  });
  dom.compareModelPortfolioBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void refreshModelPortfolioCompare();
  });
  dom.refreshPublicPortfoliosBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void refreshPublicPortfolios();
  });

  dom.csvImportInput.addEventListener("change", onCsvImport);
  dom.exportBackupBtn.addEventListener("click", onBackupExport);
  dom.importBackupInput.addEventListener("change", onBackupImport);
  dom.resetStateBtn.addEventListener("click", onResetState);
  dom.refreshQuotesBtn.addEventListener("click", onRefreshQuotes);
  dom.brokerCsvInput.addEventListener("change", onBrokerCsvImport);

  document.body.addEventListener("click", onActionClick);
}

async function hydrateFromBackend() {
  backendSync.checked = true;
  backendSync.suspendPush = true;
  try {
    await apiRequest("/health", { timeoutMs: 1400 });
    const payload = await apiRequest("/state", { timeoutMs: 5000 });
    if (payload && payload.state) {
      state = normalizeState(payload.state);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    backendSync.available = true;
    await hydrateReportCatalog();
    await hydrateBrokerCatalog();
    await hydrateRealtimeAndNotifications();
    await pullQuotesFromBackend();
  } catch (error) {
    backendSync.available = false;
  } finally {
    backendSync.suspendPush = false;
    updateBackendStatus();
  }
}

async function hydrateRealtimeAndNotifications() {
  if (!backendSync.available) {
    return;
  }
  try {
    const realtimeStatus = await apiRequest("/tools/realtime/status", { timeoutMs: 5000 });
    applyRealtimeStatus(realtimeStatus);
  } catch (error) {
    // ignore
  }
  try {
    const notificationPayload = await apiRequest("/tools/notifications/config", { timeoutMs: 5000 });
    applyNotificationConfig(notificationPayload.config || {});
    await refreshNotificationHistory({ silent: true });
  } catch (error) {
    // ignore
  }
  try {
    await refreshBackupConfig({ silent: true });
    await refreshBackupRuns({ silent: true });
    await refreshMonitoringStatus({ silent: true });
  } catch (error) {
    // ignore
  }
}

async function hydrateReportCatalog() {
  if (!backendSync.available) {
    return;
  }
  try {
    const payload = await apiRequest("/reports/catalog", { timeoutMs: 4000 });
    const reports = Array.isArray(payload.reports) ? payload.reports : [];
    if (!reports.length) {
      return;
    }
    const options = reports
      .map((item) => (item && typeof item === "object" ? item.name : item))
      .filter(Boolean)
      .map((name) => ({ value: String(name), label: String(name) }));
    if (!options.length) {
      return;
    }
    fillSelect(dom.reportSelect, options);
  } catch (error) {
    // keep built-in report list
  }
}

async function hydrateBrokerCatalog() {
  if (!backendSync.available || !dom.brokerSelect) {
    return;
  }
  try {
    const payload = await apiRequest("/import/brokers", { timeoutMs: 4000 });
    const brokers = Array.isArray(payload.brokers) ? payload.brokers : [];
    if (!brokers.length) {
      return;
    }
    const selected = dom.brokerSelect.value || "generic";
    const options = brokers
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const id = String(item.id || "").trim();
        const name = String(item.name || id).trim();
        if (!id) {
          return null;
        }
        return { value: id, label: name };
      })
      .filter(Boolean);
    if (!options.length) {
      return;
    }
    fillSelect(dom.brokerSelect, options);
    if (options.some((option) => option.value === selected)) {
      dom.brokerSelect.value = selected;
    }
  } catch (error) {
    // keep static broker list when backend is unavailable
  }
}

async function onRefreshQuotes() {
  if (!backendSync.available) {
    window.alert("Backend jest offline. Uruchom serwer, aby odświeżyć notowania.");
    return;
  }
  const tickers = state.assets.map((asset) => asset.ticker).filter(Boolean);
  if (!tickers.length) {
    window.alert("Brak walorów do odświeżenia notowań.");
    return;
  }
  backendSync.pushInFlight = true;
  updateBackendStatus();
  try {
    const payload = await apiRequest("/quotes/refresh", {
      method: "POST",
      body: { tickers }
    });
    const quotes = Array.isArray(payload.quotes) ? payload.quotes : [];
    applyQuotes(quotes);
    saveState({ skipBackend: true });
    renderAll();
    window.alert(`Zaktualizowano notowania: ${quotes.length} walorów.`);
  } catch (error) {
    backendSync.available = false;
    updateBackendStatus();
    window.alert("Nie udało się odświeżyć notowań z backendu.");
  } finally {
    backendSync.pushInFlight = false;
    updateBackendStatus();
  }
}

async function onBrokerCsvImport(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    return;
  }
  if (!backendSync.available) {
    window.alert("Import brokera działa przez backend. Uruchom serwer i spróbuj ponownie.");
    event.target.value = "";
    return;
  }
  const broker = dom.brokerSelect.value || "generic";
  try {
    const csv = await readFileAsText(file);
    const payload = await apiRequest(`/import/broker/${encodeURIComponent(broker)}`, {
      method: "POST",
      body: {
        csv,
        fileName: file.name,
        options: {
          portfolioId: dom.operationPortfolioSelect.value || "",
          accountId: dom.operationAccountSelect.value || ""
        }
      },
      timeoutMs: 20000
    });
    const summary = payload.import || {};
    const statePayload = await apiRequest("/state", { timeoutMs: 10000 });
    if (statePayload && statePayload.state) {
      state = normalizeState(statePayload.state);
      saveState({ skipBackend: true });
      renderAll();
    }
    const message = `Broker ${broker}: wiersze ${summary.rowCount || 0}, zaimportowane ${
      summary.importedCount || 0
    }`;
    dom.brokerImportInfo.textContent = message;
    window.alert(message);
  } catch (error) {
    dom.brokerImportInfo.textContent = `Błąd importu brokera: ${error.message}`;
    window.alert(`Import brokera nieudany: ${error.message}`);
  } finally {
    event.target.value = "";
  }
}

function applyQuotes(quotes) {
  if (!Array.isArray(quotes) || !quotes.length) {
    return;
  }
  const quoteByTicker = {};
  quotes.forEach((row) => {
    const ticker = String(row.ticker || "").toUpperCase();
    if (!ticker) {
      return;
    }
    quoteByTicker[ticker] = row;
  });
  state.assets.forEach((asset) => {
    const quote = quoteByTicker[String(asset.ticker || "").toUpperCase()];
    if (!quote) {
      return;
    }
    asset.currentPrice = toNum(quote.price);
    asset.currency = textOrFallback(quote.currency, asset.currency || state.meta.baseCurrency);
  });
}

async function pullQuotesFromBackend() {
  if (!backendSync.available || !state.assets.length) {
    return;
  }
  const tickers = state.assets.map((asset) => asset.ticker).filter(Boolean);
  if (!tickers.length) {
    return;
  }
  try {
    const payload = await apiRequest(`/quotes?tickers=${encodeURIComponent(tickers.join(","))}`, {
      timeoutMs: 3500
    });
    const quotes = Array.isArray(payload.quotes) ? payload.quotes : [];
    if (!quotes.length) {
      return;
    }
    applyQuotes(quotes);
    saveState({ skipBackend: true });
  } catch (error) {
    // Silent fallback to local state when backend is unavailable.
  }
}

function updateBackendStatus() {
  if (!dom.backendStatus) {
    return;
  }
  if (!backendSync.checked) {
    dom.backendStatus.textContent = "Backend: ?";
    dom.backendStatus.className = "badge off";
    return;
  }
  if (!backendSync.available) {
    dom.backendStatus.textContent = "Backend: offline";
    dom.backendStatus.className = "badge off";
    return;
  }
  if (backendSync.pushInFlight) {
    dom.backendStatus.textContent = "Backend: sync...";
    dom.backendStatus.className = "badge off";
    return;
  }
  dom.backendStatus.textContent = "Backend: online";
  dom.backendStatus.className = "badge ok";
}

async function ensureBackendAvailable(options = {}) {
  if (backendSync.available) {
    return true;
  }
  if (backendSync.healthProbe) {
    return backendSync.healthProbe;
  }
  const timeoutMs = Math.max(400, Math.round(toNum(options.timeoutMs) || 1800));
  backendSync.healthProbe = (async () => {
    try {
      await apiRequest("/health", { timeoutMs });
      backendSync.available = true;
      backendSync.checked = true;
      updateBackendStatus();
      return true;
    } catch (error) {
      backendSync.available = false;
      backendSync.checked = true;
      updateBackendStatus();
      return false;
    } finally {
      backendSync.healthProbe = null;
    }
  })();
  return backendSync.healthProbe;
}

function scheduleMetricsRefresh(portfolioId) {
  if (!backendSync.available) {
    return;
  }
  if (backendSync.metricsTimer) {
    window.clearTimeout(backendSync.metricsTimer);
  }
  backendSync.metricsTimer = window.setTimeout(() => {
    void refreshMetricsFromBackend(portfolioId);
  }, 220);
}

async function refreshMetricsFromBackend(portfolioId) {
  if (!backendSync.available || backendSync.pushInFlight) {
    return;
  }
  const reqId = ++backendSync.metricsRequestSeq;
  try {
    const query = portfolioId ? `?portfolioId=${encodeURIComponent(portfolioId)}` : "";
    const payload = await apiRequest(`/metrics/portfolio${query}`, { timeoutMs: 6000 });
    if (reqId !== backendSync.metricsRequestSeq) {
      return;
    }
    const metrics = payload.metrics || {};
    if ((dom.dashboardPortfolioSelect.value || "") !== (metrics.portfolioId || portfolioId || "")) {
      return;
    }
    if (typeof metrics.marketValue === "number") {
      dom.statMarketValue.textContent = formatMoney(metrics.marketValue);
    }
    if (typeof metrics.cashTotal === "number") {
      dom.statCash.textContent = formatMoney(metrics.cashTotal);
    }
    if (typeof metrics.netWorth === "number") {
      dom.statNetWorth.textContent = formatMoney(metrics.netWorth);
    }
    if (typeof metrics.totalPL === "number") {
      dom.statTotalPl.textContent = formatMoney(metrics.totalPL);
      dom.statTotalPl.style.color = metrics.totalPL >= 0 ? "var(--brand-strong)" : "var(--danger)";
    }
  } catch (error) {
    backendSync.available = false;
    updateBackendStatus();
  }
}

async function refreshExpertTools(options = {}) {
  const force = Boolean(options.force);
  if (!force && !isViewActive("toolsView")) {
    return;
  }
  if (!backendSync.available) {
    await ensureBackendAvailable({ timeoutMs: 1800 });
  }
  await refreshRealtimeStatus({ silent: true });
  await refreshNotificationConfig({ silent: true });
  await runScanner({ silent: true });
  await refreshSignals({ silent: true });
  await refreshCalendar({ silent: true });
  await refreshRecommendations({ silent: true });
  await refreshAlertHistory({ silent: true });
  await refreshNotificationHistory({ silent: true });
  await refreshBackupConfig({ silent: true });
  await refreshBackupRuns({ silent: true });
  await refreshMonitoringStatus({ silent: true });
  await refreshCandles({ silent: true });
  await refreshCatalyst({ silent: true });
  await refreshFundsRanking({ silent: true });
  await refreshEspi({ silent: true });
  await refreshForum({ silent: true });
  await refreshOptionPositions({ silent: true });
  await refreshModelPortfolioLoad({ silent: true });
  await refreshModelPortfolioCompare({ silent: true });
  await refreshPublicPortfolios({ silent: true });
}

function toolsPortfolioId() {
  return dom.toolsPortfolioSelect ? dom.toolsPortfolioSelect.value || "" : "";
}

function scannerFiltersFromForm() {
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

async function runScanner(options = {}) {
  const silent = Boolean(options.silent);
  const filters = scannerFiltersFromForm();
  filters.portfolioId = toolsPortfolioId();
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
      window.alert("Backend skanera niedostępny, pokazuję wyniki lokalne.");
    }
  }
}

async function refreshSignals(options = {}) {
  const silent = Boolean(options.silent);
  const portfolioId = toolsPortfolioId();
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
      window.alert("Backend sygnałów niedostępny, używam lokalnych reguł.");
    }
  }
}

async function refreshCalendar(options = {}) {
  const silent = Boolean(options.silent);
  const formData = dom.calendarForm ? formToObject(dom.calendarForm) : {};
  const days = Math.max(1, Math.min(365, Math.round(toNum(formData.days) || 60)));
  const portfolioId = toolsPortfolioId();
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
      window.alert("Backend kalendarium niedostępny, pokazuję lokalną wersję.");
    }
  }
}

async function refreshRecommendations(options = {}) {
  const silent = Boolean(options.silent);
  const portfolioId = toolsPortfolioId();
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
      window.alert("Backend rekomendacji niedostępny, używam lokalnych reguł.");
    }
  }
}

async function runAlertWorkflow(options = {}) {
  const interactive = Boolean(options.interactive);
  const portfolioId = toolsPortfolioId();
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
        state = normalizeState(refreshed.state);
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
      window.alert("Backend workflow alertów niedostępny, wykonano wersję lokalną.");
    }
    return {
      triggeredLabels: (payload.triggered || []).map(
        (row) => `${row.ticker} (${formatMoney(toNum(row.currentPrice), row.currency || state.meta.baseCurrency)})`
      )
    };
  }
}

async function refreshAlertHistory(options = {}) {
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
      window.alert("Nie udało się pobrać historii workflow alertów z backendu.");
    }
  }
}

function realtimeConfigFromForm() {
  const data = formToObject(dom.realtimeConfigForm);
  return {
    enabled: Boolean(data.enabled),
    autoRefreshQuotes: Boolean(data.autoRefreshQuotes),
    intervalMinutes: Math.max(1, Math.min(1440, Math.round(toNum(data.intervalMinutes) || 15))),
    webhookSecret: textOrFallback(data.webhookSecret, ""),
    portfolioId: toolsPortfolioId()
  };
}

async function saveRealtimeConfigFromForm() {
  if (!backendSync.available) {
    window.alert("Backend offline. Nie można zapisać realtime config.");
    return;
  }
  const payload = realtimeConfigFromForm();
  try {
    const response = await apiRequest("/tools/realtime/config", {
      method: "PUT",
      body: payload,
      timeoutMs: 8000
    });
    applyRealtimeStatus(response.status || {});
    if (dom.realtimeInfo) {
      dom.realtimeInfo.textContent = "Realtime config zapisany.";
    }
  } catch (error) {
    window.alert(`Błąd zapisu realtime config: ${error.message}`);
  }
}

async function runRealtimeNow() {
  if (!backendSync.available) {
    window.alert("Backend offline. Realtime run niedostępny.");
    return;
  }
  try {
    const payload = await apiRequest("/tools/realtime/run", {
      method: "POST",
      body: {},
      timeoutMs: 20000
    });
    applyRealtimeStatus(payload.status || {});
    await refreshAlertHistory({ silent: true });
    await refreshNotificationHistory({ silent: true });
    const summary = payload.result?.workflow?.summary || {};
    if (dom.realtimeInfo) {
      dom.realtimeInfo.textContent = `Realtime run: triggered ${summary.triggered || 0} / total ${
        summary.totalAlerts || 0
      }`;
    }
  } catch (error) {
    window.alert(`Błąd realtime run: ${error.message}`);
  }
}

async function toggleRealtimeCron(enabled) {
  if (!backendSync.available) {
    window.alert("Backend offline. Nie można zmienić stanu crona.");
    return;
  }
  try {
    const endpoint = enabled ? "/tools/realtime/start" : "/tools/realtime/stop";
    const status = await apiRequest(endpoint, {
      method: "POST",
      body: {},
      timeoutMs: 8000
    });
    applyRealtimeStatus(status || {});
    if (dom.realtimeInfo) {
      dom.realtimeInfo.textContent = enabled ? "Cron uruchomiony." : "Cron zatrzymany.";
    }
  } catch (error) {
    window.alert(`Błąd zmiany stanu crona: ${error.message}`);
  }
}

function applyRealtimeStatus(status) {
  if (!status || typeof status !== "object") {
    return;
  }
  const config = status.config || {};
  if (dom.realtimeConfigForm) {
    const enabled = dom.realtimeConfigForm.querySelector('input[name="enabled"]');
    const autoRefresh = dom.realtimeConfigForm.querySelector('input[name="autoRefreshQuotes"]');
    const interval = dom.realtimeConfigForm.querySelector('input[name="intervalMinutes"]');
    const secret = dom.realtimeConfigForm.querySelector('input[name="webhookSecret"]');
    if (enabled) enabled.checked = Boolean(config.enabled);
    if (autoRefresh) autoRefresh.checked = Boolean(config.autoRefreshQuotes);
    if (interval) interval.value = String(config.intervalMinutes ?? 15);
    if (secret) secret.value = String(config.webhookSecret || "");
  }
  if (config.portfolioId && dom.toolsPortfolioSelect) {
    const exists = Array.from(dom.toolsPortfolioSelect.options).some(
      (option) => option.value === config.portfolioId
    );
    if (exists) {
      dom.toolsPortfolioSelect.value = config.portfolioId;
    }
  }
  if (dom.realtimeInfo) {
    const cronText = status.cronEnabled ? "enabled" : "disabled";
    const workerText = status.running ? "worker on" : "worker off";
    const lastRun = status.lastRunAt ? formatDateTime(status.lastRunAt) : "-";
    dom.realtimeInfo.textContent = `Cron: ${cronText} (${workerText}), interwał ${
      config.intervalMinutes || 15
    } min, last run: ${lastRun}`;
  }
  if (dom.webhookUrl) {
    const secret = String(config.webhookSecret || "");
    const tokenPart = secret ? `?token=${encodeURIComponent(secret)}` : "";
    dom.webhookUrl.textContent = `${window.location.origin}/api/tools/alerts/webhook${tokenPart}`;
  }
}

function notificationConfigFromForm() {
  const data = formToObject(dom.notificationConfigForm);
  return {
    enabled: Boolean(data.enabled),
    cooldownMinutes: Math.max(1, Math.min(10080, Math.round(toNum(data.cooldownMinutes) || 60))),
    email: {
      enabled: Boolean(data.emailEnabled),
      smtpHost: textOrFallback(data.smtpHost, ""),
      smtpPort: Math.max(1, Math.min(65535, Math.round(toNum(data.smtpPort) || 587))),
      username: textOrFallback(data.smtpUsername, ""),
      password: textOrFallback(data.smtpPassword, ""),
      from: textOrFallback(data.smtpFrom, ""),
      to: textOrFallback(data.smtpTo, ""),
      useTls: Boolean(data.smtpUseTls)
    },
    telegram: {
      enabled: Boolean(data.telegramEnabled),
      botToken: textOrFallback(data.telegramBotToken, ""),
      chatId: textOrFallback(data.telegramChatId, "")
    }
  };
}

async function saveNotificationConfigFromForm() {
  if (!backendSync.available) {
    window.alert("Backend offline. Nie można zapisać konfiguracji powiadomień.");
    return;
  }
  const payload = notificationConfigFromForm();
  try {
    const response = await apiRequest("/tools/notifications/config", {
      method: "PUT",
      body: payload,
      timeoutMs: 10000
    });
    applyNotificationConfig(response.config || {});
    if (dom.notificationInfo) {
      dom.notificationInfo.textContent = "Konfiguracja powiadomień zapisana.";
    }
  } catch (error) {
    window.alert(`Błąd zapisu powiadomień: ${error.message}`);
  }
}

function applyNotificationConfig(config) {
  if (!config || typeof config !== "object" || !dom.notificationConfigForm) {
    return;
  }
  const email = config.email || {};
  const telegram = config.telegram || {};
  setFormField(dom.notificationConfigForm, "enabled", Boolean(config.enabled));
  setFormField(dom.notificationConfigForm, "cooldownMinutes", config.cooldownMinutes ?? 60);
  setFormField(dom.notificationConfigForm, "emailEnabled", Boolean(email.enabled));
  setFormField(dom.notificationConfigForm, "smtpHost", email.smtpHost || "");
  setFormField(dom.notificationConfigForm, "smtpPort", email.smtpPort ?? 587);
  setFormField(dom.notificationConfigForm, "smtpUsername", email.username || "");
  setFormField(dom.notificationConfigForm, "smtpPassword", email.password || "");
  setFormField(dom.notificationConfigForm, "smtpFrom", email.from || "");
  setFormField(dom.notificationConfigForm, "smtpTo", email.to || "");
  setFormField(dom.notificationConfigForm, "smtpUseTls", Boolean(email.useTls));
  setFormField(dom.notificationConfigForm, "telegramEnabled", Boolean(telegram.enabled));
  setFormField(dom.notificationConfigForm, "telegramBotToken", telegram.botToken || "");
  setFormField(dom.notificationConfigForm, "telegramChatId", telegram.chatId || "");
}

function setFormField(form, name, value) {
  const field = form.elements.namedItem(name);
  if (!field) {
    return;
  }
  if (field.type === "checkbox") {
    field.checked = Boolean(value);
  } else {
    field.value = String(value ?? "");
  }
}

async function sendTestNotification() {
  if (!backendSync.available) {
    window.alert("Backend offline. Test powiadomień niedostępny.");
    return;
  }
  try {
    const payload = await apiRequest("/tools/notifications/test", {
      method: "POST",
      body: {},
      timeoutMs: 15000
    });
    const result = payload.result || {};
    if (dom.notificationInfo) {
      dom.notificationInfo.textContent = `Test powiadomień: sent ${result.sent || 0}, errors ${
        result.errors || 0
      }`;
    }
    await refreshNotificationHistory({ silent: true });
  } catch (error) {
    window.alert(`Test powiadomień nieudany: ${error.message}`);
  }
}

async function refreshNotificationHistory(options = {}) {
  const silent = Boolean(options.silent);
  try {
    let history = [];
    if (backendSync.available) {
      const payload = await apiRequest("/tools/notifications/history?limit=80", {
        timeoutMs: 7000
      });
      history = Array.isArray(payload.history) ? payload.history : [];
    }
    renderNotificationHistoryRows(history);
  } catch (error) {
    if (!silent) {
      window.alert("Nie udało się pobrać historii powiadomień.");
    }
  }
}

async function refreshRealtimeStatus(options = {}) {
  const silent = Boolean(options.silent);
  if (!backendSync.available) {
    return;
  }
  try {
    const status = await apiRequest("/tools/realtime/status", { timeoutMs: 6000 });
    applyRealtimeStatus(status || {});
  } catch (error) {
    if (!silent) {
      window.alert("Nie udało się pobrać statusu realtime.");
    }
  }
}

async function refreshNotificationConfig(options = {}) {
  const silent = Boolean(options.silent);
  if (!backendSync.available) {
    return;
  }
  try {
    const payload = await apiRequest("/tools/notifications/config", { timeoutMs: 6000 });
    applyNotificationConfig(payload.config || {});
  } catch (error) {
    if (!silent) {
      window.alert("Nie udało się pobrać konfiguracji powiadomień.");
    }
  }
}

function backupConfigFromForm() {
  const data = formToObject(dom.backupConfigForm);
  return {
    enabled: Boolean(data.enabled),
    intervalMinutes: Math.max(1, Math.min(43200, Math.round(toNum(data.intervalMinutes) || 720))),
    keepLast: Math.max(1, Math.min(2000, Math.round(toNum(data.keepLast) || 30))),
    verifyAfterBackup: Boolean(data.verifyAfterBackup),
    includeStateJson: Boolean(data.includeStateJson),
    includeDbCopy: Boolean(data.includeDbCopy)
  };
}

function applyBackupConfig(config) {
  if (!config || typeof config !== "object" || !dom.backupConfigForm) {
    return;
  }
  setFormField(dom.backupConfigForm, "enabled", Boolean(config.enabled));
  setFormField(dom.backupConfigForm, "intervalMinutes", config.intervalMinutes ?? 720);
  setFormField(dom.backupConfigForm, "keepLast", config.keepLast ?? 30);
  setFormField(dom.backupConfigForm, "verifyAfterBackup", Boolean(config.verifyAfterBackup));
  setFormField(dom.backupConfigForm, "includeStateJson", Boolean(config.includeStateJson));
  setFormField(dom.backupConfigForm, "includeDbCopy", Boolean(config.includeDbCopy));
}

async function saveBackupConfigFromForm() {
  if (!backendSync.available) {
    window.alert("Backend offline. Nie można zapisać backup config.");
    return;
  }
  try {
    const response = await apiRequest("/tools/backup/config", {
      method: "PUT",
      body: backupConfigFromForm(),
      timeoutMs: 8000
    });
    applyBackupConfig(response.config || {});
    if (dom.backupInfo) {
      dom.backupInfo.textContent = "Backup config zapisany.";
    }
  } catch (error) {
    window.alert(`Błąd zapisu backup config: ${error.message}`);
  }
}

async function runBackupNow() {
  if (!backendSync.available) {
    window.alert("Backend offline. Backup niedostępny.");
    return;
  }
  try {
    const payload = await apiRequest("/tools/backup/run", {
      method: "POST",
      body: {},
      timeoutMs: 30000
    });
    const row = payload.backup || {};
    if (dom.backupInfo) {
      dom.backupInfo.textContent = `Backup: ${row.status || "unknown"}, verify ${row.verified ? "ok" : "skip/error"}, ${formatDateTime(
        row.createdAt || ""
      ) || "-"}`;
    }
    await refreshBackupRuns({ silent: true });
    await refreshMonitoringStatus({ silent: true });
  } catch (error) {
    window.alert(`Backup nieudany: ${error.message}`);
  }
}

async function verifyBackupNow() {
  if (!backendSync.available) {
    window.alert("Backend offline. Verify backup niedostępny.");
    return;
  }
  try {
    const payload = await apiRequest("/tools/backup/verify", {
      method: "POST",
      body: {},
      timeoutMs: 15000
    });
    const result = payload.verify || {};
    if (dom.backupInfo) {
      dom.backupInfo.textContent = `Restore-check: ${result.ok ? "OK" : "ERROR"} | ${
        result.message || "brak opisu"
      }`;
    }
    await refreshBackupRuns({ silent: true });
  } catch (error) {
    window.alert(`Verify backup nieudany: ${error.message}`);
  }
}

async function refreshBackupConfig(options = {}) {
  const silent = Boolean(options.silent);
  if (!backendSync.available) {
    return;
  }
  try {
    const payload = await apiRequest("/tools/backup/config", { timeoutMs: 6000 });
    applyBackupConfig(payload.config || {});
  } catch (error) {
    if (!silent) {
      window.alert("Nie udało się pobrać konfiguracji backupu.");
    }
  }
}

async function refreshBackupRuns(options = {}) {
  const silent = Boolean(options.silent);
  if (!backendSync.available) {
    return;
  }
  try {
    const payload = await apiRequest("/tools/backup/runs?limit=60", { timeoutMs: 9000 });
    const runs = Array.isArray(payload.runs) ? payload.runs : [];
    renderBackupRunsRows(runs);
  } catch (error) {
    if (!silent) {
      window.alert("Nie udało się pobrać historii backupów.");
    }
  }
}

async function refreshMonitoringStatus(options = {}) {
  const silent = Boolean(options.silent);
  if (!backendSync.available) {
    return;
  }
  try {
    const payload = await apiRequest("/tools/monitoring/status", { timeoutMs: 8000 });
    renderMonitoringStatus(payload || {});
  } catch (error) {
    if (!silent) {
      window.alert("Nie udało się pobrać statusu monitoringu.");
    }
  }
}

function renderBackupRunsRows(items) {
  const rows = (items || []).map((item) => [
    escapeHtml(formatDateTime(item.createdAt) || item.createdAt || "-"),
    escapeHtml(item.trigger || "-"),
    escapeHtml(item.status || "-"),
    escapeHtml(item.verified ? "tak" : "nie"),
    escapeHtml(item.stateFile ? shortPath(item.stateFile) : "-"),
    escapeHtml(item.dbFile ? shortPath(item.dbFile) : "-"),
    escapeHtml(item.message || "-")
  ]);
  renderTable(dom.backupRunsList, ["Czas", "Tryb", "Status", "Verify", "Plik JSON", "Plik DB", "Komunikat"], rows);
}

function renderMonitoringStatus(payload) {
  if (!payload || typeof payload !== "object") {
    renderTable(dom.monitoringTable, ["Miara", "Wartość"], []);
    return;
  }
  const counts = payload.counts || {};
  const quotes = payload.quotes || {};
  const realtime = payload.realtime || {};
  const backup = payload.backup || {};
  const backupLast = backup.lastRun || {};
  const backupCfg = backup.config || {};
  const rows = [
    ["Serwer UTC", escapeHtml(formatDateTime(payload.serverTime) || payload.serverTime || "-")],
    ["Portfele", String(toNum(counts.portfolios))],
    ["Konta", String(toNum(counts.accounts))],
    ["Walory", String(toNum(counts.assets))],
    ["Operacje", String(toNum(counts.operations))],
    ["Alerty", String(toNum(counts.alerts))],
    ["Zobowiązania", String(toNum(counts.liabilities))],
    ["Notowania total", String(toNum(quotes.total))],
    ["Notowania świeże", String(toNum(quotes.fresh))],
    ["Notowania nieświeże", String(toNum(quotes.stale))],
    ["Max wiek notowań (s)", String(toNum(quotes.maxAgeSeconds))],
    ["Realtime cron", realtime.cronEnabled ? "aktywny" : "wyłączony"],
    ["Realtime worker", realtime.running ? "on" : "off"],
    ["Backup cron", backupCfg.enabled ? "aktywny" : "wyłączony"],
    ["Backup interwał (min)", String(toNum(backupCfg.intervalMinutes))],
    ["Backup ostatni status", escapeHtml(backupLast.status || "-")],
    ["Backup ostatni czas", escapeHtml(formatDateTime(backupLast.createdAt) || backupLast.createdAt || "-")]
  ];
  renderTable(
    dom.monitoringTable,
    ["Miara", "Wartość"],
    rows.map((row) => [row[0], row[1]])
  );
  if (dom.monitoringInfo) {
    dom.monitoringInfo.textContent = `Monitoring: quotes fresh ${toNum(quotes.fresh)} / ${
      toNum(quotes.total)
    }, backup ${backupLast.status || "-"}`;
  }
}

function shortPath(fullPath) {
  const parts = String(fullPath || "").split(/[\\/]/).filter(Boolean);
  if (!parts.length) {
    return "";
  }
  return parts.length <= 2 ? parts.join("/") : `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

function renderNotificationHistoryRows(items) {
  const rows = (items || []).map((item) => [
    escapeHtml(formatDateTime(item.dispatchedAt) || item.dispatchedAt || "-"),
    escapeHtml(item.channel || "-"),
    escapeHtml(item.alertId || "-"),
    escapeHtml(item.status || "-"),
    escapeHtml(item.message || "-")
  ]);
  renderTable(dom.notificationHistoryList, ["Czas", "Kanał", "Alert", "Status", "Komunikat"], rows);
}

function renderScannerRows(items) {
  const rows = (items || []).map((item) => [
    escapeHtml(item.ticker || ""),
    escapeHtml(item.name || ""),
    escapeHtml(item.signal || "-"),
    formatFloat(toNum(item.score)),
    formatFloat(toNum(item.risk)),
    formatMoney(toNum(item.price), item.currency || state.meta.baseCurrency),
    formatFloat(toNum(item.share)),
    formatFloat(toNum(item.unrealizedPct)),
    escapeHtml(item.sector || "-"),
    escapeHtml(item.signalReason || "-")
  ]);
  renderTable(
    dom.scannerList,
    ["Ticker", "Nazwa", "Sygnał", "Score", "Ryzyko", "Cena", "Udział %", "P/L %", "Sektor", "Uzasadnienie"],
    rows
  );
}

function renderSignalsRows(items) {
  const rows = (items || []).map((item) => [
    escapeHtml(item.ticker || ""),
    escapeHtml(item.name || ""),
    escapeHtml(item.signal || "-"),
    `${formatFloat(toNum(item.confidence) * 100)}%`,
    formatFloat(toNum(item.risk)),
    formatFloat(toNum(item.share)),
    formatFloat(toNum(item.unrealizedPct)),
    escapeHtml(item.reason || "-")
  ]);
  renderTable(
    dom.signalsList,
    ["Ticker", "Nazwa", "Sygnał", "Pewność", "Ryzyko", "Udział %", "P/L %", "Komentarz"],
    rows
  );
}

function renderCalendarRows(items) {
  const rows = (items || []).map((item) => [
    escapeHtml(item.date || ""),
    escapeHtml(item.type || "-"),
    escapeHtml(item.title || "-"),
    escapeHtml(item.priority || "-"),
    escapeHtml(item.details || "-")
  ]);
  renderTable(dom.calendarList, ["Data", "Typ", "Wydarzenie", "Priorytet", "Szczegóły"], rows);
}

function renderRecommendationsRows(items) {
  const rows = (items || []).map((item) => [
    escapeHtml(item.priority || "-"),
    escapeHtml(item.category || "-"),
    escapeHtml(item.title || "-"),
    escapeHtml(item.action || "-"),
    escapeHtml(item.impact || "-")
  ]);
  renderTable(dom.recommendationsList, ["Priorytet", "Kategoria", "Temat", "Działanie", "Wpływ"], rows);
}

function renderAlertWorkflowRows(items) {
  const rows = (items || []).map((item) => [
    escapeHtml(formatDateTime(item.eventTime || item.checkedAt) || item.eventTime || item.checkedAt || "-"),
    escapeHtml(item.ticker || "-"),
    escapeHtml((item.direction || "-").toUpperCase()),
    formatFloat(toNum(item.targetPrice)),
    formatFloat(toNum(item.currentPrice)),
    escapeHtml(item.status || "-"),
    escapeHtml(item.message || "-")
  ]);
  renderTable(
    dom.alertWorkflowList,
    ["Czas", "Ticker", "Warunek", "Target", "Cena", "Status", "Komunikat"],
    rows
  );
}

function candlesFormValues() {
  const data = formToObject(dom.candlesForm);
  const fallbackTicker = state.assets[0] ? state.assets[0].ticker : "WIG20";
  return {
    ticker: textOrFallback(data.ticker, fallbackTicker).toUpperCase(),
    limit: Math.max(20, Math.min(3000, Math.round(toNum(data.limit) || 180)))
  };
}

function candlesVisibleRows() {
  if (!candlesView.all.length) {
    return [];
  }
  const start = Math.max(0, Math.min(candlesView.start, candlesView.all.length - 1));
  const end = Math.max(start + 1, Math.min(candlesView.end, candlesView.all.length));
  return candlesView.all.slice(start, end);
}

function updateCandlesControls() {
  const allLen = candlesView.all.length;
  const hasData = allLen > 0;
  if (!dom.candlesWindowInput || !dom.candlesOffsetInput || !dom.candlesResetZoomBtn) {
    return;
  }
  dom.candlesWindowInput.disabled = !hasData;
  dom.candlesOffsetInput.disabled = !hasData;
  dom.candlesResetZoomBtn.disabled = !hasData;
  if (!hasData) {
    dom.candlesWindowInput.min = "1";
    dom.candlesWindowInput.max = "1";
    dom.candlesWindowInput.value = "1";
    dom.candlesOffsetInput.min = "0";
    dom.candlesOffsetInput.max = "0";
    dom.candlesOffsetInput.value = "0";
    if (dom.candlesRangeInfo) {
      dom.candlesRangeInfo.textContent = "";
    }
    return;
  }

  const windowSize = Math.max(1, candlesView.end - candlesView.start);
  const minWindow = Math.min(20, allLen);
  dom.candlesWindowInput.min = String(minWindow);
  dom.candlesWindowInput.max = String(allLen);
  dom.candlesWindowInput.value = String(windowSize);

  const maxOffset = Math.max(0, allLen - windowSize);
  dom.candlesOffsetInput.min = "0";
  dom.candlesOffsetInput.max = String(maxOffset);
  dom.candlesOffsetInput.value = String(Math.min(candlesView.start, maxOffset));

  const visible = candlesVisibleRows();
  if (dom.candlesRangeInfo && visible.length) {
    dom.candlesRangeInfo.textContent = `Zakres: ${visible[0].date} -> ${
      visible[visible.length - 1].date
    } | widoczne ${visible.length}/${allLen} świec`;
  }
}

function resetCandlesViewport() {
  const allLen = candlesView.all.length;
  if (!allLen) {
    candlesView.start = 0;
    candlesView.end = 0;
    updateCandlesControls();
    return;
  }
  const windowSize = Math.min(120, allLen);
  candlesView.end = allLen;
  candlesView.start = allLen - windowSize;
  updateCandlesControls();
}

function renderCandlesViewport() {
  const visible = candlesVisibleRows();
  renderCandlesRows(visible);
  drawCandlestickChart(dom.candlesChart, visible);
  updateCandlesControls();
}

function applyCandlesWindowFromInput() {
  if (!candlesView.all.length || !dom.candlesWindowInput) {
    return;
  }
  const allLen = candlesView.all.length;
  const minWindow = Math.min(20, allLen);
  const requested = Math.max(minWindow, Math.min(allLen, Math.round(toNum(dom.candlesWindowInput.value) || minWindow)));
  const maxStart = Math.max(0, allLen - requested);
  let start = Math.min(candlesView.start, maxStart);
  if (start < 0) {
    start = 0;
  }
  candlesView.start = start;
  candlesView.end = start + requested;
  renderCandlesViewport();
}

function applyCandlesOffsetFromInput() {
  if (!candlesView.all.length || !dom.candlesOffsetInput) {
    return;
  }
  const allLen = candlesView.all.length;
  const windowSize = Math.max(1, candlesView.end - candlesView.start);
  const maxStart = Math.max(0, allLen - windowSize);
  const start = Math.max(0, Math.min(maxStart, Math.round(toNum(dom.candlesOffsetInput.value) || 0)));
  candlesView.start = start;
  candlesView.end = start + windowSize;
  renderCandlesViewport();
}

function onCandlesChartWheel(event) {
  if (!candlesView.all.length || !dom.candlesWindowInput) {
    return;
  }
  event.preventDefault();
  const direction = event.deltaY > 0 ? 1 : -1;
  const current = Math.round(toNum(dom.candlesWindowInput.value) || 120);
  const step = Math.max(2, Math.round(current * 0.08));
  const next = current + direction * step;
  dom.candlesWindowInput.value = String(next);
  applyCandlesWindowFromInput();
}

async function refreshCandles(options = {}) {
  const silent = Boolean(options.silent);
  const values = candlesFormValues();
  if (dom.candlesTickerInput && !dom.candlesTickerInput.value.trim()) {
    dom.candlesTickerInput.value = values.ticker;
  }
  const backendReady = backendSync.available || (await ensureBackendAvailable({ timeoutMs: 2200 }));
  if (!backendReady) {
    renderTable(dom.candlesTable, ["Data", "Open", "High", "Low", "Close", "Volume"], []);
    drawCandlestickChart(dom.candlesChart, []);
    candlesView.all = [];
    candlesView.start = 0;
    candlesView.end = 0;
    candlesView.ticker = values.ticker;
    candlesView.signal = "";
    candlesView.indicators = {};
    updateCandlesControls();
    if (dom.candlesInfo) {
      dom.candlesInfo.textContent = "Świece wymagają backendu (Stooq).";
    }
    if (!silent) {
      window.alert("Backend offline. Wykres świecowy niedostępny.");
    }
    return;
  }
  try {
    const query = `?ticker=${encodeURIComponent(values.ticker)}&limit=${values.limit}`;
    const payload = await apiRequest(`/tools/charts/candles${query}`, { timeoutMs: 15000 });
    const candles = Array.isArray(payload.candles) ? payload.candles : [];
    candlesView.all = candles;
    candlesView.ticker = payload.ticker || values.ticker;
    candlesView.signal = payload.signal || "-";
    candlesView.indicators = payload.indicators || {};
    resetCandlesViewport();
    renderCandlesViewport();
    const indicators = candlesView.indicators || {};
    const visible = candlesVisibleRows();
    if (dom.candlesInfo) {
      dom.candlesInfo.textContent =
        `${candlesView.ticker}: ${candles.length} świec (widok: ${visible.length}), sygnał ${candlesView.signal}, ` +
        `SMA20 ${formatFloat(toNum(indicators.sma20))}, RSI14 ${formatFloat(toNum(indicators.rsi14))}, MACD hist ${formatFloat(toNum(indicators.macdHist))}`;
    }
  } catch (error) {
    candlesView.all = [];
    candlesView.start = 0;
    candlesView.end = 0;
    updateCandlesControls();
    if (dom.candlesInfo) {
      dom.candlesInfo.textContent = `Błąd świec: ${error.message}`;
    }
    if (!silent) {
      window.alert(`Nie udało się pobrać świec: ${error.message}`);
    }
  }
}

async function openTradingview() {
  const values = candlesFormValues();
  if (!backendSync.available) {
    window.open(`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(values.ticker)}`, "_blank", "noopener");
    return;
  }
  try {
    const payload = await apiRequest(`/tools/charts/tradingview?ticker=${encodeURIComponent(values.ticker)}`, {
      timeoutMs: 10000
    });
    const url = payload.embedUrl || `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(values.ticker)}`;
    window.open(url, "_blank", "noopener");
    if (dom.candlesInfo) {
      dom.candlesInfo.textContent = `${values.ticker}: otwarto TradingView (${payload.signal || "-"})`;
    }
  } catch (error) {
    window.open(`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(values.ticker)}`, "_blank", "noopener");
    if (dom.candlesInfo) {
      dom.candlesInfo.textContent = `TradingView fallback dla ${values.ticker}`;
    }
  }
}

async function refreshCatalyst(options = {}) {
  const silent = Boolean(options.silent);
  if (!backendSync.available) {
    renderTable(dom.catalystTable, ["Ticker", "Nazwa", "Cena", "Kupon %", "Zapadalność", "Lata", "YTM %", "Duration", "Ryzyko"], []);
    if (dom.catalystInfo) {
      dom.catalystInfo.textContent = "Catalyst wymaga backendu.";
    }
    if (!silent) {
      window.alert("Backend offline. Analiza Catalyst niedostępna.");
    }
    return;
  }
  try {
    const query = `?portfolioId=${encodeURIComponent(toolsPortfolioId())}&limit=100`;
    const payload = await apiRequest(`/tools/catalyst${query}`, { timeoutMs: 15000 });
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    renderCatalystRows(rows);
    if (dom.catalystInfo) {
      dom.catalystInfo.textContent = `Catalyst: ${rows.length} obligacji`;
    }
  } catch (error) {
    if (dom.catalystInfo) {
      dom.catalystInfo.textContent = `Błąd Catalyst: ${error.message}`;
    }
    if (!silent) {
      window.alert(`Błąd analizy Catalyst: ${error.message}`);
    }
  }
}

async function refreshFundsRanking(options = {}) {
  const silent = Boolean(options.silent);
  if (!backendSync.available) {
    renderTable(dom.fundsRankingTable, ["#", "Ticker", "Nazwa", "Roczna stopa %", "Zm. skumulowana %", "Vol %", "MDD %", "Sharpe", "R/R", "Score"], []);
    if (dom.fundsRankingInfo) {
      dom.fundsRankingInfo.textContent = "Ranking funduszy wymaga backendu.";
    }
    if (!silent) {
      window.alert("Backend offline. Ranking funduszy niedostępny.");
    }
    return;
  }
  try {
    const payload = await apiRequest("/tools/funds/ranking?limit=50", { timeoutMs: 30000 });
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    renderFundsRankingRows(rows);
    if (dom.fundsRankingInfo) {
      dom.fundsRankingInfo.textContent = `Ranking funduszy: ${rows.length} pozycji`;
    }
  } catch (error) {
    if (dom.fundsRankingInfo) {
      dom.fundsRankingInfo.textContent = `Błąd rankingu funduszy: ${error.message}`;
    }
    if (!silent) {
      window.alert(`Błąd rankingu funduszy: ${error.message}`);
    }
  }
}

async function refreshEspi(options = {}) {
  const silent = Boolean(options.silent);
  if (!backendSync.available) {
    renderTable(dom.espiTable, ["Data", "Ticker", "Tytuł", "Źródło", "Link"], []);
    if (dom.espiInfo) {
      dom.espiInfo.textContent = "Komunikaty ESPI wymagają backendu.";
    }
    if (!silent) {
      window.alert("Backend offline. ESPI niedostępne.");
    }
    return;
  }
  try {
    const data = formToObject(dom.espiForm);
    const query = textOrFallback(data.query, "");
    const limit = Math.max(5, Math.min(200, Math.round(toNum(data.limit) || 40)));
    const payload = await apiRequest(
      `/tools/espi?query=${encodeURIComponent(query)}&limit=${limit}`,
      { timeoutMs: 45000 }
    );
    const items = Array.isArray(payload.items) ? payload.items : [];
    renderEspiRows(items);
    if (dom.espiInfo) {
      dom.espiInfo.textContent = `ESPI/EBI: ${items.length} komunikatów`;
    }
  } catch (error) {
    if (dom.espiInfo) {
      dom.espiInfo.textContent = `Błąd ESPI: ${error.message}`;
    }
    if (!silent) {
      window.alert(`Błąd pobierania ESPI: ${error.message}`);
    }
  }
}

async function onTaxOptimizeSubmit() {
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
          `${item.ticker}: harvest ${formatMoney(toNum(item.suggestedHarvestLoss))} (strata ${formatMoney(toNum(item.unrealizedLoss))})`
      )
      .join("<br/>");
    dom.taxOptimizeOutput.innerHTML = [
      `<p>Podstawa przed: <strong>${formatMoney(toNum(result.taxableBaseBefore))}</strong></p>`,
      `<p>Podatek przed: <strong>${formatMoney(toNum(result.taxBefore))}</strong></p>`,
      `<p>Podstawa po: <strong>${formatMoney(toNum(result.taxableBaseAfter))}</strong></p>`,
      `<p>Podatek po: <strong>${formatMoney(toNum(result.taxAfter))}</strong></p>`,
      `<p>Oszczędność: <strong>${formatMoney(toNum(result.taxSaved))}</strong></p>`,
      rows ? `<p>Proponowane transakcje:<br/>${rows}</p>` : "<p>Brak rekomendowanych transakcji loss harvesting.</p>"
    ].join("");
  } catch (error) {
    dom.taxOptimizeOutput.textContent = `Błąd optymalizacji: ${error.message}`;
  }
}

async function onForeignDividendTaxSubmit() {
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
      `<p>Podatek zagraniczny: <strong>${formatMoney(toNum(result.foreignWithheld))}</strong></p>`,
      `<p>Podatek do dopłaty w PL: <strong>${formatMoney(toNum(result.localTaxDue))}</strong></p>`,
      `<p>Potencjalny zwrot z zagranicy: <strong>${formatMoney(toNum(result.foreignRefundPotential))}</strong></p>`,
      `<p>Dywidenda netto: <strong>${formatMoney(toNum(result.netDividendAfterTax))}</strong></p>`
    ].join("");
  } catch (error) {
    dom.foreignDividendTaxOutput.textContent = `Błąd: ${error.message}`;
  }
}

async function onCryptoTaxSubmit() {
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
      `<p>Dochód krypto: <strong>${formatMoney(toNum(result.cryptoIncomeBeforeCarry))}</strong></p>`,
      `<p>Podstawa po kompensacji: <strong>${formatMoney(toNum(result.taxableBase))}</strong></p>`,
      `<p>Podatek do zapłaty: <strong>${formatMoney(toNum(result.taxDue))}</strong></p>`
    ].join("");
  } catch (error) {
    dom.cryptoTaxOutput.textContent = `Błąd: ${error.message}`;
  }
}

async function onForeignInterestTaxSubmit() {
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
      `<p>Podatek zagraniczny: <strong>${formatMoney(toNum(result.foreignWithheld))}</strong></p>`,
      `<p>Podatek do dopłaty w PL: <strong>${formatMoney(toNum(result.localTaxDue))}</strong></p>`,
      `<p>Odsetki netto: <strong>${formatMoney(toNum(result.netInterestAfterTax))}</strong></p>`
    ].join("");
  } catch (error) {
    dom.foreignInterestTaxOutput.textContent = `Błąd: ${error.message}`;
  }
}

async function onBondInterestTaxSubmit() {
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
      `<p>Podstawa: <strong>${formatMoney(toNum(result.taxableBase))}</strong></p>`,
      `<p>Podatek: <strong>${formatMoney(toNum(result.taxDue))}</strong></p>`
    ].join("");
  } catch (error) {
    dom.bondInterestTaxOutput.textContent = `Błąd: ${error.message}`;
  }
}

async function onForumPostSubmit() {
  if (!backendSync.available) {
    window.alert("Backend offline. Forum niedostępne.");
    return;
  }
  try {
    const payload = formToObject(dom.forumForm);
    await apiRequest("/tools/forum/post", {
      method: "POST",
      body: payload,
      timeoutMs: 8000
    });
    dom.forumForm.reset();
    await refreshForum({ silent: true });
  } catch (error) {
    window.alert(`Nie udało się dodać wpisu: ${error.message}`);
  }
}

async function refreshForum(options = {}) {
  const silent = Boolean(options.silent);
  if (!backendSync.available) {
    renderTable(dom.forumList, ["Data", "Ticker", "Autor", "Treść", "Akcje"], []);
    if (dom.forumInfo) {
      dom.forumInfo.textContent = "Forum wymaga backendu.";
    }
    if (!silent) {
      window.alert("Backend offline. Forum niedostępne.");
    }
    return;
  }
  try {
    const ticker = dom.forumFilterTicker ? dom.forumFilterTicker.value || "" : "";
    const payload = await apiRequest(
      `/tools/forum?ticker=${encodeURIComponent(ticker)}&limit=300`,
      { timeoutMs: 8000 }
    );
    const posts = Array.isArray(payload.posts) ? payload.posts : [];
    renderForumRows(posts);
    if (dom.forumInfo) {
      dom.forumInfo.textContent = `Forum: ${posts.length} wpisów`;
    }
  } catch (error) {
    if (dom.forumInfo) {
      dom.forumInfo.textContent = `Błąd forum: ${error.message}`;
    }
    if (!silent) {
      window.alert(`Nie udało się pobrać forum: ${error.message}`);
    }
  }
}

async function onOptionCalcSubmit() {
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
      `<p>Break-even: <strong>${formatFloat(toNum(result.breakEven))}</strong></p>`,
      `<p>Status: <strong>${escapeHtml(result.status || "-")}</strong></p>`,
      `<p>Wartość wewnętrzna: <strong>${formatFloat(toNum(result.intrinsicValue))}</strong></p>`,
      `<p>P/L pozycji: <strong>${formatMoney(toNum(result.positionPL))}</strong></p>`,
      `<p>Rekomendacja: <strong>${escapeHtml(result.recommendation || "-")}</strong></p>`
    ].join("");
  } catch (error) {
    dom.optionCalcOutput.textContent = `Błąd: ${error.message}`;
  }
}

async function onOptionPositionSubmit() {
  if (!backendSync.available) {
    window.alert("Backend offline.");
    return;
  }
  try {
    const payload = formToObject(dom.optionPositionForm);
    await apiRequest("/tools/options/positions", {
      method: "POST",
      body: payload,
      timeoutMs: 10000
    });
    dom.optionPositionForm.reset();
    await refreshOptionPositions({ silent: true, refreshQuotes: true });
  } catch (error) {
    window.alert(`Nie udało się dodać pozycji opcyjnej: ${error.message}`);
  }
}

async function refreshOptionPositions(options = {}) {
  const silent = Boolean(options.silent);
  const refreshQuotes = options.refreshQuotes !== false;
  if (!backendSync.available) {
    renderTable(
      dom.optionPositionsList,
      ["Ticker", "Typ", "Strike", "Premia", "Spot", "Break-even", "Status", "Dni do wyg.", "P/L", "Rekomendacja", "Akcje"],
      []
    );
    if (dom.optionPositionsInfo) {
      dom.optionPositionsInfo.textContent = "Pozycje opcyjne wymagają backendu.";
    }
    if (!silent) {
      window.alert("Backend offline.");
    }
    return;
  }
  try {
    const payload = await apiRequest(
      `/tools/options/positions?refresh=${refreshQuotes ? "true" : "false"}`,
      { timeoutMs: 15000 }
    );
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    renderOptionPositionsRows(rows);
    if (dom.optionPositionsInfo) {
      dom.optionPositionsInfo.textContent = `Pozycje opcyjne: ${rows.length}`;
    }
  } catch (error) {
    if (dom.optionPositionsInfo) {
      dom.optionPositionsInfo.textContent = `Błąd pozycji opcyjnych: ${error.message}`;
    }
    if (!silent) {
      window.alert(`Nie udało się pobrać pozycji opcyjnych: ${error.message}`);
    }
  }
}

function parseModelWeightsText(text) {
  const rows = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const output = [];
  rows.forEach((line) => {
    const parts = line.split(/[:;,]/).map((item) => item.trim());
    if (parts.length < 2) {
      return;
    }
    const ticker = String(parts[0] || "").toUpperCase();
    const weight = toNum(parts[1]);
    if (ticker && weight > 0) {
      output.push({ ticker, weight });
    }
  });
  return output;
}

async function refreshModelPortfolioLoad(options = {}) {
  const silent = Boolean(options.silent);
  if (!backendSync.available) {
    if (dom.modelPortfolioInfo) {
      dom.modelPortfolioInfo.textContent = "Portfel wzorcowy wymaga backendu.";
    }
    return;
  }
  try {
    const payload = await apiRequest("/tools/model-portfolio", { timeoutMs: 8000 });
    const model = payload.model || {};
    if (dom.modelPortfolioForm) {
      setFormField(dom.modelPortfolioForm, "name", model.name || "Portfel wzorcowy");
    }
    if (dom.modelPortfolioWeightsInput) {
      const text = Array.isArray(model.weights)
        ? model.weights.map((item) => `${item.ticker}:${formatFloat(toNum(item.weight))}`).join("\n")
        : "";
      if (!dom.modelPortfolioWeightsInput.value.trim() || options.force) {
        dom.modelPortfolioWeightsInput.value = text;
      }
    }
    if (dom.modelPortfolioInfo && model.updatedAt) {
      dom.modelPortfolioInfo.textContent = `Portfel wzorcowy zaktualizowany: ${formatDateTime(model.updatedAt)}`;
    }
  } catch (error) {
    if (!silent && dom.modelPortfolioInfo) {
      dom.modelPortfolioInfo.textContent = `Błąd portfela wzorcowego: ${error.message}`;
    }
  }
}

async function onModelPortfolioSubmit() {
  if (!backendSync.available) {
    window.alert("Backend offline.");
    return;
  }
  try {
    const formData = formToObject(dom.modelPortfolioForm);
    const weights = parseModelWeightsText(formData.weightsText || "");
    if (!weights.length) {
      window.alert("Wpisz co najmniej jedną wagę: ticker:waga.");
      return;
    }
    await apiRequest("/tools/model-portfolio", {
      method: "PUT",
      body: {
        name: textOrFallback(formData.name, "Portfel wzorcowy"),
        weights
      },
      timeoutMs: 10000
    });
    await refreshModelPortfolioLoad({ force: true, silent: true });
    await refreshModelPortfolioCompare({ silent: true });
  } catch (error) {
    window.alert(`Nie udało się zapisać portfela wzorcowego: ${error.message}`);
  }
}

async function refreshModelPortfolioCompare(options = {}) {
  const silent = Boolean(options.silent);
  if (!backendSync.available) {
    renderTable(
      dom.modelPortfolioTable,
      ["Ticker", "Wzorzec %", "Rzeczywisty %", "Odchylenie %", "Delta wartości", "Akcja", "Ilość ~"],
      []
    );
    return;
  }
  try {
    const query = `?portfolioId=${encodeURIComponent(toolsPortfolioId())}`;
    const payload = await apiRequest(`/tools/model-portfolio/compare${query}`, { timeoutMs: 12000 });
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    renderModelCompareRows(rows);
    const summary = payload.summary || {};
    if (dom.modelPortfolioInfo) {
      dom.modelPortfolioInfo.textContent = `${payload.modelName || "Portfel wzorcowy"} | tracking error: ${formatFloat(
        toNum(summary.trackingErrorPct)
      )}% | rebalance: ${summary.rebalanceNeeded ? "tak" : "nie"}`;
    }
  } catch (error) {
    if (!silent && dom.modelPortfolioInfo) {
      dom.modelPortfolioInfo.textContent = `Błąd porównania portfela wzorcowego: ${error.message}`;
    }
  }
}

async function refreshPublicPortfolios(options = {}) {
  const silent = Boolean(options.silent);
  if (!backendSync.available) {
    renderTable(dom.publicPortfoliosTable, ["Nazwa", "Benchmark", "Cel", "Wartość netto", "Stopa zwrotu %", "Pozycje", "Akcje"], []);
    return;
  }
  try {
    const payload = await apiRequest("/tools/public-portfolios", { timeoutMs: 10000 });
    const portfolios = Array.isArray(payload.portfolios) ? payload.portfolios : [];
    renderPublicPortfoliosRows(portfolios);
    if (dom.publicPortfoliosInfo) {
      dom.publicPortfoliosInfo.textContent = `Portfele publiczne: ${portfolios.length}`;
    }
  } catch (error) {
    if (!silent && dom.publicPortfoliosInfo) {
      dom.publicPortfoliosInfo.textContent = `Błąd portfeli publicznych: ${error.message}`;
    }
  }
}

async function clonePublicPortfolioById(sourcePortfolioId) {
  if (!backendSync.available) {
    window.alert("Backend offline.");
    return;
  }
  const name = window.prompt("Nazwa skopiowanego portfela:", "Mój portfel publiczny");
  if (name == null) {
    return;
  }
  try {
    await apiRequest("/tools/public-portfolios/clone", {
      method: "POST",
      body: {
        sourcePortfolioId,
        name: name || ""
      },
      timeoutMs: 12000
    });
    const payload = await apiRequest("/state", { timeoutMs: 8000 });
    if (payload && payload.state) {
      state = normalizeState(payload.state);
      saveState({ skipBackend: true });
      renderAll();
    }
  } catch (error) {
    window.alert(`Nie udało się sklonować portfela publicznego: ${error.message}`);
  }
}

function renderCandlesRows(candles) {
  const rows = (candles || [])
    .slice()
    .reverse()
    .slice(0, 200)
    .map((item) => [
      escapeHtml(item.date || ""),
      formatFloat(toNum(item.open)),
      formatFloat(toNum(item.high)),
      formatFloat(toNum(item.low)),
      formatFloat(toNum(item.close)),
      formatFloat(toNum(item.volume))
    ]);
  renderTable(dom.candlesTable, ["Data", "Open", "High", "Low", "Close", "Volume"], rows);
}

function renderCatalystRows(items) {
  const rows = (items || []).map((item) => [
    escapeHtml(item.ticker || ""),
    escapeHtml(item.name || ""),
    formatMoney(toNum(item.price), item.currency || state.meta.baseCurrency),
    `${formatFloat(toNum(item.couponRate))}%`,
    escapeHtml(item.maturityDate || "-"),
    formatFloat(toNum(item.yearsToMaturity)),
    `${formatFloat(toNum(item.ytmApproxPct))}%`,
    formatFloat(toNum(item.durationProxy)),
    escapeHtml(item.riskLabel || "-")
  ]);
  renderTable(
    dom.catalystTable,
    ["Ticker", "Nazwa", "Cena", "Kupon %", "Zapadalność", "Lata", "YTM %", "Duration", "Ryzyko"],
    rows
  );
}

function renderFundsRankingRows(items) {
  const rows = (items || []).map((item) => [
    String(item.rank || "-"),
    escapeHtml(item.ticker || ""),
    escapeHtml(item.name || ""),
    `${formatFloat(toNum(item.annualReturnPct))}%`,
    `${formatFloat(toNum(item.cumulativeReturnPct))}%`,
    `${formatFloat(toNum(item.volatilityPct))}%`,
    `${formatFloat(toNum(item.maxDrawdownPct))}%`,
    formatFloat(toNum(item.sharpeApprox)),
    formatFloat(toNum(item.returnRisk)),
    formatFloat(toNum(item.score))
  ]);
  renderTable(
    dom.fundsRankingTable,
    ["#", "Ticker", "Nazwa", "Roczna stopa %", "Zm. skumulowana %", "Vol %", "MDD %", "Sharpe", "R/R", "Score"],
    rows
  );
}

function renderEspiRows(items) {
  const rows = (items || []).map((item) => [
    escapeHtml(item.publishedAt || "-"),
    escapeHtml(item.ticker || "-"),
    escapeHtml(item.title || "-"),
    escapeHtml(item.source || "-"),
    item.link ? `<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener">otwórz</a>` : "-"
  ]);
  renderTable(dom.espiTable, ["Data", "Ticker", "Tytuł", "Źródło", "Link"], rows);
}

function renderForumRows(items) {
  const rows = (items || []).map((item) => [
    escapeHtml(formatDateTime(item.createdAt) || item.createdAt || "-"),
    escapeHtml(item.ticker || "-"),
    escapeHtml(item.author || "-"),
    escapeHtml(item.content || "-"),
    `<button class="btn danger" data-action="delete-forum-post" data-id="${escapeHtml(item.id)}">Usuń</button>`
  ]);
  renderTable(dom.forumList, ["Data", "Ticker", "Autor", "Treść", "Akcje"], rows);
}

function renderOptionPositionsRows(items) {
  const rows = (items || []).map((item) => [
    escapeHtml(item.ticker || ""),
    escapeHtml(String(item.optionType || "").toUpperCase()),
    formatFloat(toNum(item.strike)),
    formatFloat(toNum(item.premium)),
    formatFloat(toNum(item.spotPrice)),
    formatFloat(toNum(item.breakEven)),
    escapeHtml(item.status || "-"),
    String(item.daysToExpiry || 0),
    formatMoney(toNum(item.positionPL), item.currency || state.meta.baseCurrency),
    escapeHtml(item.recommendation || "-"),
    `<button class="btn danger" data-action="delete-option-position" data-id="${escapeHtml(item.id)}">Usuń</button>`
  ]);
  renderTable(
    dom.optionPositionsList,
    ["Ticker", "Typ", "Strike", "Premia", "Spot", "Break-even", "Status", "Dni do wyg.", "P/L", "Rekomendacja", "Akcje"],
    rows
  );
}

function renderModelCompareRows(items) {
  const rows = (items || []).map((item) => [
    escapeHtml(item.ticker || ""),
    `${formatFloat(toNum(item.targetSharePct))}%`,
    `${formatFloat(toNum(item.actualSharePct))}%`,
    `${formatFloat(toNum(item.deviationPct))}%`,
    formatMoney(toNum(item.valueDelta)),
    escapeHtml(item.action || "-"),
    formatFloat(toNum(item.qtyDeltaApprox))
  ]);
  renderTable(
    dom.modelPortfolioTable,
    ["Ticker", "Wzorzec %", "Rzeczywisty %", "Odchylenie %", "Delta wartości", "Akcja", "Ilość ~"],
    rows
  );
}

function renderPublicPortfoliosRows(items) {
  const rows = (items || []).map((item) => [
    escapeHtml(item.name || ""),
    escapeHtml(item.benchmark || "-"),
    escapeHtml(item.goal || "-"),
    formatMoney(toNum(item.netWorth)),
    `${formatFloat(toNum(item.returnPct))}%`,
    String(item.holdingsCount || 0),
    `<button class="btn secondary" data-action="clone-public-portfolio" data-id="${escapeHtml(item.id)}">Kopiuj do moich</button>`
  ]);
  renderTable(
    dom.publicPortfoliosTable,
    ["Nazwa", "Benchmark", "Cel", "Wartość netto", "Stopa zwrotu %", "Pozycje", "Akcje"],
    rows
  );
}

function localScanner(filters) {
  const metrics = computeMetrics(filters.portfolioId || "");
  const holdingsMap = {};
  metrics.holdings.forEach((holding) => {
    holdingsMap[holding.assetId] = holding;
  });
  const items = [];
  state.assets.forEach((asset) => {
    const holding = holdingsMap[asset.id];
    const price = toNum(asset.currentPrice);
    const risk = toNum(asset.risk || 5);
    const share = holding ? toNum(holding.share) : 0;
    const unrealizedPct = holding && holding.cost !== 0 ? (holding.unrealized / holding.cost) * 100 : 0;
    const score = Math.max(
      0,
      (10 - risk) * 6 + Math.min(20, Math.max(-20, unrealizedPct) + 20) + Math.min(20, price / 10) - Math.max(0, share - 20) * 1.2
    );
    if (toNum(score) < toNum(filters.minScore)) {
      return;
    }
    if (risk > toNum(filters.maxRisk)) {
      return;
    }
    if (filters.sector && !String(asset.sector || "").toLowerCase().includes(String(filters.sector).toLowerCase())) {
      return;
    }
    if (price < toNum(filters.minPrice)) {
      return;
    }
    let signal = "HOLD";
    let reason = "Brak silnego sygnału.";
    if (share > 35) {
      signal = "REBALANCE";
      reason = "Wysoka koncentracja pozycji.";
    } else if (unrealizedPct <= -8) {
      signal = "RISK_OFF";
      reason = "Głęboka strata niezrealizowana.";
    } else if (score >= 75) {
      signal = "ACCUMULATE";
      reason = "Wysoki score i akceptowalne ryzyko.";
    }
    items.push({
      ticker: asset.ticker,
      name: asset.name,
      signal,
      score: Number(score.toFixed(2)),
      risk,
      price,
      currency: asset.currency,
      share,
      unrealizedPct,
      sector: asset.sector || "-",
      signalReason: reason
    });
  });
  items.sort((a, b) => toNum(b.score) - toNum(a.score));
  return items;
}

function localSignals(portfolioId) {
  const metrics = computeMetrics(portfolioId || "");
  return metrics.holdings.map((holding) => {
    let signal = "HOLD";
    let confidence = 0.55;
    let reason = "Brak kryteriów dla silniejszego sygnału.";
    if (holding.share > 35) {
      signal = "REBALANCE";
      confidence = 0.87;
      reason = "Pozycja przekracza 35% portfela.";
    } else if (holding.unrealizedPct <= -12) {
      signal = "CUT_LOSS";
      confidence = 0.9;
      reason = "Strata przekroczyła -12%.";
    } else if (holding.unrealizedPct >= 18 && holding.risk >= 6) {
      signal = "TAKE_PROFIT";
      confidence = 0.82;
      reason = "Wysoki zysk i podwyższone ryzyko.";
    } else if (holding.risk >= 8 && holding.share >= 15) {
      signal = "REDUCE_RISK";
      confidence = 0.78;
      reason = "Duży udział waloru o wysokim ryzyku.";
    } else if (holding.unrealizedPct >= -3 && holding.unrealizedPct <= 4 && holding.risk <= 5) {
      signal = "ACCUMULATE";
      confidence = 0.65;
      reason = "Umiarkowane ryzyko i stabilna pozycja.";
    }
    return {
      ticker: holding.ticker,
      name: holding.name,
      signal,
      confidence,
      reason,
      risk: holding.risk,
      share: holding.share,
      unrealizedPct: holding.unrealizedPct
    };
  });
}

function localCalendar(days, portfolioId) {
  const now = new Date();
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const events = [];

  state.liabilities.forEach((liability) => {
    if (!liability.dueDate) {
      return;
    }
    const due = new Date(`${liability.dueDate}T00:00:00`);
    if (!Number.isFinite(due.getTime()) || due < now || due > end) {
      return;
    }
    const daysLeft = Math.round((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    events.push({
      date: liability.dueDate,
      type: "Zobowiązanie",
      title: `Termin: ${liability.name}`,
      priority: daysLeft <= 7 ? "Wysoki" : "Średni",
      details: `Kwota ${formatMoney(liability.amount, liability.currency)}`
    });
  });

  state.recurringOps.forEach((item) => {
    if (portfolioId && item.portfolioId !== portfolioId) {
      return;
    }
    const nextDate = nextOccurrence(item.startDate, item.frequency);
    const due = new Date(`${nextDate}T00:00:00`);
    if (!Number.isFinite(due.getTime()) || due < now || due > end) {
      return;
    }
    events.push({
      date: nextDate,
      type: "Operacja cykliczna",
      title: `${item.name} (${item.type})`,
      priority: "Średni",
      details: `Kwota ${formatMoney(item.amount, item.currency || state.meta.baseCurrency)}`
    });
  });

  const metrics = computeMetrics(portfolioId || "");
  metrics.holdings.slice(0, 8).forEach((holding, idx) => {
    const reportDate = new Date(now.getTime() + (15 + idx * 3) * 24 * 60 * 60 * 1000);
    if (reportDate > end) {
      return;
    }
    const reportIso = reportDate.toISOString().slice(0, 10);
    events.push({
      date: reportIso,
      type: "Kalendarium spółek",
      title: `${holding.ticker}: raport okresowy (auto)`,
      priority: "Niski",
      details: "Wydarzenie wygenerowane automatycznie."
    });
  });

  events.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return events;
}

function localRecommendations(portfolioId) {
  const metrics = computeMetrics(portfolioId || "");
  const rows = [];
  if (!metrics.holdings.length) {
    rows.push({
      priority: "Wysoki",
      category: "Portfel",
      title: "Brak aktywnych pozycji",
      action: "Dodaj pozycje lub zaimportuj historię brokera.",
      impact: "Bez pozycji narzędzia eksperckie są ograniczone."
    });
  }
  if (metrics.holdings.length) {
    const top = metrics.holdings.slice().sort((a, b) => b.share - a.share)[0];
    if (top.share > 35) {
      rows.push({
        priority: "Wysoki",
        category: "Dywersyfikacja",
        title: `Koncentracja na ${top.ticker} (${formatFloat(top.share)}%)`,
        action: "Rozważ obniżenie udziału do <25%.",
        impact: "Niższe ryzyko pojedynczej pozycji."
      });
    }
  }
  const cashRatio = metrics.netWorth !== 0 ? (metrics.cashTotal / metrics.netWorth) * 100 : 0;
  if (cashRatio > 30) {
    rows.push({
      priority: "Średni",
      category: "Alokacja",
      title: `Wysoki udział gotówki (${formatFloat(cashRatio)}%)`,
      action: "Rozważ etapowe inwestowanie części gotówki.",
      impact: "Mniejszy cash drag."
    });
  }
  const liabilitiesRatio = metrics.netWorth !== 0 ? (metrics.liabilitiesTotal / metrics.netWorth) * 100 : 0;
  if (liabilitiesRatio > 40) {
    rows.push({
      priority: "Wysoki",
      category: "Dźwignia",
      title: `Wysokie zobowiązania (${formatFloat(liabilitiesRatio)}% majątku)`,
      action: "Rozważ redukcję zadłużenia lub większy bufor gotówki.",
      impact: "Mniejsze ryzyko płynności."
    });
  }
  if (metrics.holdings.length && state.alerts.length === 0) {
    rows.push({
      priority: "Średni",
      category: "Workflow",
      title: "Brak alertów cenowych",
      action: "Dodaj alerty i uruchamiaj workflow alertów codziennie.",
      impact: "Szybsza reakcja na rynek."
    });
  }
  if (!rows.length) {
    rows.push({
      priority: "Niski",
      category: "Status",
      title: "Brak krytycznych rekomendacji",
      action: "Kontynuuj monitoring i przegląd raportów.",
      impact: "Stabilne zarządzanie portfelem."
    });
  }
  return rows;
}

function localAlertWorkflow() {
  const now = nowIso();
  const triggered = [];
  const waiting = [];
  const actions = [];
  state.alerts.forEach((alert) => {
    const asset = findById(state.assets, alert.assetId);
    if (!asset) {
      return;
    }
    const currentPrice = toNum(asset.currentPrice);
    const targetPrice = toNum(alert.targetPrice);
    const hit = alert.direction === "gte" ? currentPrice >= targetPrice : currentPrice <= targetPrice;
    if (hit) {
      alert.lastTriggerAt = now;
      triggered.push({
        alertId: alert.id,
        ticker: asset.ticker,
        direction: alert.direction,
        targetPrice,
        currentPrice,
        currency: asset.currency,
        status: "TRIGGERED",
        checkedAt: now
      });
      actions.push({
        title: `${asset.ticker}: alert aktywny`,
        action:
          alert.direction === "gte"
            ? "Rozważ realizację części zysku lub przesunięcie stop."
            : "Sprawdź scenariusz obronny / redukcję pozycji."
      });
    } else {
      waiting.push({
        alertId: alert.id,
        ticker: asset.ticker,
        direction: alert.direction,
        targetPrice,
        currentPrice,
        currency: asset.currency,
        status: "WAITING",
        checkedAt: now
      });
    }
  });
  saveState();
  return {
    summary: {
      totalAlerts: state.alerts.length,
      triggered: triggered.length,
      waiting: waiting.length
    },
    triggered,
    waiting,
    actions,
    history: localAlertHistory()
  };
}

function localAlertHistory(limit = 80) {
  return state.alerts
    .filter((alert) => alert.lastTriggerAt)
    .map((alert) => {
      const asset = findById(state.assets, alert.assetId);
      return {
        eventTime: alert.lastTriggerAt,
        ticker: asset ? asset.ticker : "N/D",
        direction: alert.direction,
        targetPrice: alert.targetPrice,
        currentPrice: asset ? asset.currentPrice : 0,
        status: "TRIGGERED",
        message: "Trigger lokalny"
      };
    })
    .sort((a, b) => String(b.eventTime).localeCompare(String(a.eventTime)))
    .slice(0, limit);
}

function scheduleBackendPush() {
  if (!backendSync.available || backendSync.suspendPush) {
    return;
  }
  if (backendSync.pushTimer) {
    window.clearTimeout(backendSync.pushTimer);
  }
  backendSync.pushTimer = window.setTimeout(() => {
    void pushStateToBackend();
  }, 280);
}

async function pushStateToBackend() {
  if (!backendSync.available || backendSync.suspendPush || backendSync.pushInFlight) {
    return;
  }
  backendSync.pushInFlight = true;
  updateBackendStatus();
  try {
    await apiRequest("/state", {
      method: "PUT",
      body: { state },
      timeoutMs: 10000
    });
  } catch (error) {
    backendSync.available = false;
  } finally {
    backendSync.pushInFlight = false;
    updateBackendStatus();
  }
}

async function apiRequest(path, options = {}) {
  const method = options.method || "GET";
  const timeoutMs = options.timeoutMs || 8000;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const headers = {};
  let body = undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
  }
  try {
    let response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body,
        signal: controller.signal
      });
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new Error(`Przekroczono czas oczekiwania (${Math.round(timeoutMs / 1000)}s) dla ${path}.`);
      }
      throw error;
    }
    const text = await response.text();
    let payload = {};
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch (error) {
        throw new Error("Backend zwrócił niepoprawny JSON.");
      }
    }
    if (!response.ok) {
      const message = payload.error || `Błąd API ${response.status}`;
      throw new Error(message);
    }
    return payload;
  } finally {
    window.clearTimeout(timer);
  }
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Nie udało się odczytać pliku."));
    reader.readAsText(file, "utf-8");
  });
}

function onTabClick(event) {
  const tab = event.target.closest(".tab");
  if (!tab) {
    return;
  }
  const target = tab.dataset.view;
  if (!target) {
    return;
  }
  document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  tab.classList.add("active");
  const targetView = document.getElementById(target);
  if (targetView) {
    targetView.classList.add("active");
  }
  if (target === "reportsView") {
    void renderReportCurrent({ force: true });
    return;
  }
  if (target === "toolsView") {
    void refreshExpertTools({ force: true });
  }
}

function onPlanChange() {
  state.meta.activePlan = dom.planSelect.value;
  saveState();
  renderFeatureMatrix();
  renderToolCatalog();
  const limit = currentPlanLimit().portfolios;
  if (state.portfolios.length > limit) {
    window.alert(
      `Masz ${state.portfolios.length} portfeli, a plan ${state.meta.activePlan} pozwala na ${limit}.`
    );
  }
}

function onBaseCurrencyChange() {
  state.meta.baseCurrency = dom.baseCurrencySelect.value;
  saveState();
  renderDashboard();
  void renderReportCurrent();
}

function resetPortfolioForm() {
  editingState.portfolioId = "";
  if (dom.portfolioEditId) {
    dom.portfolioEditId.value = "";
  }
  if (dom.portfolioSubmitBtn) {
    dom.portfolioSubmitBtn.textContent = "Dodaj portfel";
  }
  if (dom.portfolioCancelEditBtn) {
    dom.portfolioCancelEditBtn.hidden = true;
  }
  if (dom.portfolioForm) {
    dom.portfolioForm.reset();
  }
}

function startPortfolioEdit(portfolioId) {
  const portfolio = findById(state.portfolios, portfolioId);
  if (!portfolio || !dom.portfolioForm) {
    return;
  }
  editingState.portfolioId = portfolio.id;
  if (dom.portfolioEditId) {
    dom.portfolioEditId.value = portfolio.id;
  }
  if (dom.portfolioSubmitBtn) {
    dom.portfolioSubmitBtn.textContent = "Zapisz portfel";
  }
  if (dom.portfolioCancelEditBtn) {
    dom.portfolioCancelEditBtn.hidden = false;
  }

  const form = dom.portfolioForm;
  const nameInput = form.querySelector('[name="name"]');
  const currencyInput = form.querySelector('[name="currency"]');
  const benchmarkInput = form.querySelector('[name="benchmark"]');
  const goalInput = form.querySelector('[name="goal"]');
  const parentSelect = form.querySelector('[name="parentId"]');
  const twinSelect = form.querySelector('[name="twinOf"]');
  const groupInput = form.querySelector('[name="groupName"]');
  const publicInput = form.querySelector('[name="isPublic"]');
  if (nameInput) {
    nameInput.value = portfolio.name || "";
  }
  if (currencyInput) {
    currencyInput.value = portfolio.currency || state.meta.baseCurrency;
  }
  if (benchmarkInput) {
    benchmarkInput.value = portfolio.benchmark || "";
  }
  if (goalInput) {
    goalInput.value = portfolio.goal || "";
  }
  if (parentSelect) {
    parentSelect.value = portfolio.parentId || "";
  }
  if (twinSelect) {
    twinSelect.value = portfolio.twinOf || "";
  }
  if (groupInput) {
    groupInput.value = portfolio.groupName || "";
  }
  if (publicInput) {
    publicInput.checked = Boolean(portfolio.isPublic);
  }
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function onPortfolioSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = formToObject(form);
  const editId = editingState.portfolioId && data.editId === editingState.portfolioId ? editingState.portfolioId : "";

  if (!editId && !canAddPortfolio()) {
    window.alert(
      `Plan ${state.meta.activePlan} pozwala na maksymalnie ${currentPlanLimit().portfolios} portfeli.`
    );
    return;
  }

  const candidateParentId = data.parentId || "";
  const candidateTwinId = data.twinOf || "";
  if (editId && (candidateParentId === editId || candidateTwinId === editId)) {
    window.alert("Portfel nie może wskazywać samego siebie jako nadrzędny ani bliźniaczy.");
    return;
  }

  const normalizedParentId = findById(state.portfolios, candidateParentId) ? candidateParentId : "";
  const normalizedTwinId = findById(state.portfolios, candidateTwinId) ? candidateTwinId : "";
  const nextPayload = {
    name: textOrFallback(data.name, `Portfel ${state.portfolios.length + 1}`),
    currency: textOrFallback(data.currency, state.meta.baseCurrency),
    benchmark: data.benchmark || "",
    goal: data.goal || "",
    parentId: normalizedParentId,
    twinOf: normalizedTwinId,
    groupName: data.groupName || "",
    isPublic: Boolean(data.isPublic)
  };

  if (editId) {
    const existing = findById(state.portfolios, editId);
    if (!existing) {
      resetPortfolioForm();
      window.alert("Nie znaleziono portfela do edycji.");
      return;
    }
    Object.assign(existing, nextPayload);
  } else {
    state.portfolios.push({
      id: makeId("ptf"),
      ...nextPayload,
      createdAt: nowIso()
    });
  }

  saveState();
  resetPortfolioForm();
  renderAll();
}

function resetAccountForm() {
  editingState.accountId = "";
  if (dom.accountEditId) {
    dom.accountEditId.value = "";
  }
  if (dom.accountSubmitBtn) {
    dom.accountSubmitBtn.textContent = "Dodaj konto";
  }
  if (dom.accountCancelEditBtn) {
    dom.accountCancelEditBtn.hidden = true;
  }
  if (dom.accountForm) {
    dom.accountForm.reset();
  }
}

function startAccountEdit(accountId) {
  const account = findById(state.accounts, accountId);
  if (!account || !dom.accountForm) {
    return;
  }
  editingState.accountId = account.id;
  if (dom.accountEditId) {
    dom.accountEditId.value = account.id;
  }
  if (dom.accountSubmitBtn) {
    dom.accountSubmitBtn.textContent = "Zapisz konto";
  }
  if (dom.accountCancelEditBtn) {
    dom.accountCancelEditBtn.hidden = false;
  }

  const form = dom.accountForm;
  const nameInput = form.querySelector('[name="name"]');
  const typeInput = form.querySelector('[name="type"]');
  const currencyInput = form.querySelector('[name="currency"]');
  if (nameInput) {
    nameInput.value = account.name || "";
  }
  if (typeInput) {
    typeInput.value = account.type || "Broker";
  }
  if (currencyInput) {
    currencyInput.value = account.currency || state.meta.baseCurrency;
  }
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function onAccountSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = formToObject(form);
  const editId = editingState.accountId && data.editId === editingState.accountId ? editingState.accountId : "";
  if (editId) {
    const existing = findById(state.accounts, editId);
    if (!existing) {
      resetAccountForm();
      window.alert("Nie znaleziono konta do edycji.");
      return;
    }
    existing.name = textOrFallback(data.name, existing.name || "Konto");
    existing.type = textOrFallback(data.type, existing.type || "Broker");
    existing.currency = textOrFallback(data.currency, state.meta.baseCurrency);
  } else {
    state.accounts.push({
      id: makeId("acc"),
      name: textOrFallback(data.name, `Konto ${state.accounts.length + 1}`),
      type: textOrFallback(data.type, "Broker"),
      currency: textOrFallback(data.currency, state.meta.baseCurrency),
      createdAt: nowIso()
    });
  }
  saveState();
  resetAccountForm();
  renderAll();
}

function resetAssetForm() {
  editingState.assetId = "";
  if (dom.assetEditId) {
    dom.assetEditId.value = "";
  }
  if (dom.assetSubmitBtn) {
    dom.assetSubmitBtn.textContent = "Dodaj walor";
  }
  if (dom.assetCancelEditBtn) {
    dom.assetCancelEditBtn.hidden = true;
  }
  if (dom.assetForm) {
    dom.assetForm.reset();
  }
}

function startAssetEdit(assetId) {
  const asset = findById(state.assets, assetId);
  if (!asset || !dom.assetForm) {
    return;
  }
  editingState.assetId = asset.id;
  if (dom.assetEditId) {
    dom.assetEditId.value = asset.id;
  }
  if (dom.assetSubmitBtn) {
    dom.assetSubmitBtn.textContent = "Zapisz walor";
  }
  if (dom.assetCancelEditBtn) {
    dom.assetCancelEditBtn.hidden = false;
  }

  const form = dom.assetForm;
  const tickerInput = form.querySelector('[name="ticker"]');
  const nameInput = form.querySelector('[name="name"]');
  const typeInput = form.querySelector('[name="type"]');
  const currencyInput = form.querySelector('[name="currency"]');
  const currentPriceInput = form.querySelector('[name="currentPrice"]');
  const riskInput = form.querySelector('[name="risk"]');
  const sectorInput = form.querySelector('[name="sector"]');
  const industryInput = form.querySelector('[name="industry"]');
  const tagsInput = form.querySelector('[name="tags"]');
  const benchmarkInput = form.querySelector('[name="benchmark"]');
  if (tickerInput) {
    tickerInput.value = asset.ticker || "";
  }
  if (nameInput) {
    nameInput.value = asset.name || "";
  }
  if (typeInput) {
    typeInput.value = asset.type || "Inny";
  }
  if (currencyInput) {
    currencyInput.value = asset.currency || state.meta.baseCurrency;
  }
  if (currentPriceInput) {
    currentPriceInput.value = String(toNum(asset.currentPrice));
  }
  if (riskInput) {
    riskInput.value = String(clamp(toNum(asset.risk), 1, 10));
  }
  if (sectorInput) {
    sectorInput.value = asset.sector || "";
  }
  if (industryInput) {
    industryInput.value = asset.industry || "";
  }
  if (tagsInput) {
    tagsInput.value = Array.isArray(asset.tags) ? asset.tags.join(", ") : "";
  }
  if (benchmarkInput) {
    benchmarkInput.value = asset.benchmark || "";
  }
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function onAssetSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = formToObject(form);
  const editId = editingState.assetId && data.editId === editingState.assetId ? editingState.assetId : "";
  const payload = {
    ticker: (data.ticker || "").toUpperCase(),
    name: textOrFallback(data.name, "Bez nazwy"),
    type: textOrFallback(data.type, "Inny"),
    currency: textOrFallback(data.currency, state.meta.baseCurrency),
    currentPrice: toNum(data.currentPrice),
    risk: clamp(toNum(data.risk), 1, 10),
    sector: data.sector || "",
    industry: data.industry || "",
    tags: toTags(data.tags),
    benchmark: data.benchmark || ""
  };
  if (editId) {
    const existing = findById(state.assets, editId);
    if (!existing) {
      resetAssetForm();
      window.alert("Nie znaleziono waloru do edycji.");
      return;
    }
    Object.assign(existing, payload);
  } else {
    state.assets.push({
      id: makeId("ast"),
      ...payload,
      createdAt: nowIso()
    });
  }
  saveState();
  resetAssetForm();
  renderAll();
}

function resetOperationForm() {
  editingState.operationId = "";
  if (dom.operationEditId) {
    dom.operationEditId.value = "";
  }
  if (dom.operationSubmitBtn) {
    dom.operationSubmitBtn.textContent = "Dodaj operację";
  }
  if (dom.operationCancelEditBtn) {
    dom.operationCancelEditBtn.hidden = true;
  }
  if (dom.operationForm) {
    dom.operationForm.reset();
    const dateInput = dom.operationForm.querySelector('input[name="date"]');
    if (dateInput) {
      dateInput.value = todayIso();
    }
    const currencyInput = dom.operationForm.querySelector('[name="currency"]');
    if (currencyInput) {
      currencyInput.value = state.meta.baseCurrency;
    }
  }
}

function startOperationEdit(operationId) {
  const operation = findById(state.operations, operationId);
  if (!operation || !dom.operationForm) {
    return;
  }
  editingState.operationId = operation.id;
  if (dom.operationEditId) {
    dom.operationEditId.value = operation.id;
  }
  if (dom.operationSubmitBtn) {
    dom.operationSubmitBtn.textContent = "Zapisz operację";
  }
  if (dom.operationCancelEditBtn) {
    dom.operationCancelEditBtn.hidden = false;
  }

  const form = dom.operationForm;
  const dateInput = form.querySelector('[name="date"]');
  const typeInput = form.querySelector('[name="type"]');
  const portfolioInput = form.querySelector('[name="portfolioId"]');
  const accountInput = form.querySelector('[name="accountId"]');
  const assetInput = form.querySelector('[name="assetId"]');
  const targetAssetInput = form.querySelector('[name="targetAssetId"]');
  const quantityInput = form.querySelector('[name="quantity"]');
  const targetQuantityInput = form.querySelector('[name="targetQuantity"]');
  const priceInput = form.querySelector('[name="price"]');
  const amountInput = form.querySelector('[name="amount"]');
  const feeInput = form.querySelector('[name="fee"]');
  const currencyInput = form.querySelector('[name="currency"]');
  const tagsInput = form.querySelector('[name="tags"]');
  const noteInput = form.querySelector('[name="note"]');

  if (dateInput) {
    dateInput.value = operation.date || todayIso();
  }
  if (typeInput) {
    typeInput.value = operation.type || "Operacja gotówkowa";
  }
  if (portfolioInput) {
    portfolioInput.value = operation.portfolioId || "";
  }
  if (accountInput) {
    accountInput.value = operation.accountId || "";
  }
  if (assetInput) {
    assetInput.value = operation.assetId || "";
  }
  if (targetAssetInput) {
    targetAssetInput.value = operation.targetAssetId || "";
  }
  if (quantityInput) {
    quantityInput.value = String(toNum(operation.quantity));
  }
  if (targetQuantityInput) {
    targetQuantityInput.value = String(toNum(operation.targetQuantity));
  }
  if (priceInput) {
    priceInput.value = String(toNum(operation.price));
  }
  if (amountInput) {
    amountInput.value = String(toNum(operation.amount));
  }
  if (feeInput) {
    feeInput.value = String(toNum(operation.fee));
  }
  if (currencyInput) {
    currencyInput.value = operation.currency || state.meta.baseCurrency;
  }
  if (tagsInput) {
    tagsInput.value = Array.isArray(operation.tags) ? operation.tags.join(", ") : "";
  }
  if (noteInput) {
    noteInput.value = operation.note || "";
  }
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function onOperationSubmit(event) {
  event.preventDefault();
  if (!state.portfolios.length) {
    window.alert("Najpierw dodaj portfel.");
    return;
  }
  const form = event.currentTarget;
  const data = formToObject(form);
  const editId = editingState.operationId && data.editId === editingState.operationId ? editingState.operationId : "";
  const fallbackPortfolioId = state.portfolios[0] ? state.portfolios[0].id : "";
  const fallbackAccountId = state.accounts[0] ? state.accounts[0].id : "";
  const portfolioId = findById(state.portfolios, data.portfolioId || "") ? data.portfolioId : fallbackPortfolioId;
  const accountId = findById(state.accounts, data.accountId || "") ? data.accountId : fallbackAccountId;
  const assetId = findById(state.assets, data.assetId || "") ? data.assetId : "";
  const targetAssetId = findById(state.assets, data.targetAssetId || "") ? data.targetAssetId : "";
  const payload = {
    date: data.date || todayIso(),
    type: textOrFallback(data.type, "Operacja gotówkowa"),
    portfolioId,
    accountId,
    assetId,
    targetAssetId,
    quantity: toNum(data.quantity),
    targetQuantity: toNum(data.targetQuantity),
    price: toNum(data.price),
    amount: toNum(data.amount),
    fee: toNum(data.fee),
    currency: textOrFallback(data.currency, state.meta.baseCurrency),
    tags: toTags(data.tags),
    note: data.note || ""
  };
  if (editId) {
    const existing = findById(state.operations, editId);
    if (!existing) {
      resetOperationForm();
      window.alert("Nie znaleziono operacji do edycji.");
      return;
    }
    Object.assign(existing, payload);
  } else {
    state.operations.push({
      id: makeId("op"),
      ...payload,
      createdAt: nowIso()
    });
  }
  saveState();
  resetOperationForm();
  renderAll();
}

function resetRecurringForm() {
  editingState.recurringId = "";
  if (dom.recurringEditId) {
    dom.recurringEditId.value = "";
  }
  if (dom.recurringSubmitBtn) {
    dom.recurringSubmitBtn.textContent = "Dodaj cykliczną";
  }
  if (dom.recurringCancelEditBtn) {
    dom.recurringCancelEditBtn.hidden = true;
  }
  if (dom.recurringForm) {
    dom.recurringForm.reset();
  }
}

function startRecurringEdit(recurringId) {
  const recurring = findById(state.recurringOps, recurringId);
  if (!recurring || !dom.recurringForm) {
    return;
  }
  editingState.recurringId = recurring.id;
  if (dom.recurringEditId) {
    dom.recurringEditId.value = recurring.id;
  }
  if (dom.recurringSubmitBtn) {
    dom.recurringSubmitBtn.textContent = "Zapisz cykliczną";
  }
  if (dom.recurringCancelEditBtn) {
    dom.recurringCancelEditBtn.hidden = false;
  }

  const form = dom.recurringForm;
  const nameInput = form.querySelector('[name="name"]');
  const typeInput = form.querySelector('[name="type"]');
  const frequencyInput = form.querySelector('[name="frequency"]');
  const startDateInput = form.querySelector('[name="startDate"]');
  const amountInput = form.querySelector('[name="amount"]');
  const portfolioInput = form.querySelector('[name="portfolioId"]');
  const accountInput = form.querySelector('[name="accountId"]');
  const assetInput = form.querySelector('[name="assetId"]');
  if (nameInput) {
    nameInput.value = recurring.name || "";
  }
  if (typeInput) {
    typeInput.value = recurring.type || "Operacja gotówkowa";
  }
  if (frequencyInput) {
    frequencyInput.value = recurring.frequency || "monthly";
  }
  if (startDateInput) {
    startDateInput.value = recurring.startDate || todayIso();
  }
  if (amountInput) {
    amountInput.value = String(toNum(recurring.amount));
  }
  if (portfolioInput) {
    portfolioInput.value = recurring.portfolioId || "";
  }
  if (accountInput) {
    accountInput.value = recurring.accountId || "";
  }
  if (assetInput) {
    assetInput.value = recurring.assetId || "";
  }
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function onRecurringSubmit(event) {
  event.preventDefault();
  const data = formToObject(event.currentTarget);
  const editId = editingState.recurringId && data.editId === editingState.recurringId ? editingState.recurringId : "";
  const fallbackPortfolioId = state.portfolios[0] ? state.portfolios[0].id : "";
  const fallbackAccountId = state.accounts[0] ? state.accounts[0].id : "";
  const portfolioId = findById(state.portfolios, data.portfolioId || "") ? data.portfolioId : fallbackPortfolioId;
  const accountId = findById(state.accounts, data.accountId || "") ? data.accountId : fallbackAccountId;
  const assetId = findById(state.assets, data.assetId || "") ? data.assetId : "";
  const payload = {
    name: textOrFallback(data.name, `Cykliczna ${state.recurringOps.length + 1}`),
    type: textOrFallback(data.type, "Operacja gotówkowa"),
    frequency: textOrFallback(data.frequency, "monthly"),
    startDate: data.startDate || todayIso(),
    amount: toNum(data.amount),
    portfolioId,
    accountId,
    assetId,
    currency: state.meta.baseCurrency
  };
  if (editId) {
    const existing = findById(state.recurringOps, editId);
    if (!existing) {
      resetRecurringForm();
      window.alert("Nie znaleziono operacji cyklicznej do edycji.");
      return;
    }
    Object.assign(existing, payload);
  } else {
    state.recurringOps.push({
      id: makeId("rec"),
      ...payload,
      lastGeneratedDate: "",
      createdAt: nowIso()
    });
  }
  saveState();
  resetRecurringForm();
  renderAll();
}

function onRunRecurring() {
  const today = todayIso();
  let created = 0;
  state.recurringOps.forEach((rule) => {
    let cursor = rule.lastGeneratedDate || rule.startDate;
    if (!cursor) {
      cursor = today;
    }
    cursor = nextOccurrence(cursor, rule.frequency);
    while (cursor <= today) {
      state.operations.push({
        id: makeId("op"),
        date: cursor,
        type: rule.type,
        portfolioId: rule.portfolioId,
        accountId: rule.accountId,
        assetId: rule.assetId || "",
        targetAssetId: "",
        quantity: 0,
        targetQuantity: 0,
        price: 0,
        amount: rule.amount,
        fee: 0,
        currency: rule.currency || state.meta.baseCurrency,
        tags: ["cykliczna"],
        note: `Wygenerowano: ${rule.name}`,
        createdAt: nowIso()
      });
      created += 1;
      rule.lastGeneratedDate = cursor;
      cursor = nextOccurrence(cursor, rule.frequency);
    }
  });
  saveState();
  renderAll();
  if (created > 0) {
    window.alert(`Wygenerowano ${created} operacji cyklicznych.`);
  } else {
    window.alert("Brak zaległych operacji cyklicznych.");
  }
}

function onCsvImport(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const content = String(reader.result || "");
    const rows = parseDelimited(content);
    const count = importOperations(rows);
    saveState();
    renderAll();
    window.alert(`Zaimportowano ${count} operacji.`);
  };
  reader.readAsText(file, "utf-8");
  event.target.value = "";
}

function onMailImport() {
  const text = (dom.mailImportText.value || "").trim();
  if (!text) {
    window.alert("Wklej treść do importu.");
    return;
  }
  let rows = [];
  if (text.includes(",")) {
    rows = parseDelimited(text);
  } else {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    rows = lines
      .map((line) => {
        const parts = line.split(/[;|]/).map((part) => part.trim());
        if (parts.length < 3) {
          return null;
        }
        return {
          date: parts[0],
          type: parts[1],
          amount: parts[2],
          note: parts.slice(3).join(" ")
        };
      })
      .filter(Boolean);
  }
  const count = importOperations(rows);
  saveState();
  renderAll();
  dom.mailImportText.value = "";
  window.alert(`Zaimportowano ${count} operacji z treści.`);
}

function resetAlertForm() {
  editingState.alertId = "";
  if (dom.alertEditId) {
    dom.alertEditId.value = "";
  }
  if (dom.alertSubmitBtn) {
    dom.alertSubmitBtn.textContent = "Dodaj alert";
  }
  if (dom.alertCancelEditBtn) {
    dom.alertCancelEditBtn.hidden = true;
  }
  if (dom.alertForm) {
    dom.alertForm.reset();
  }
}

function startAlertEdit(alertId) {
  const alert = findById(state.alerts, alertId);
  if (!alert || !dom.alertForm) {
    return;
  }
  editingState.alertId = alert.id;
  if (dom.alertEditId) {
    dom.alertEditId.value = alert.id;
  }
  if (dom.alertSubmitBtn) {
    dom.alertSubmitBtn.textContent = "Zapisz alert";
  }
  if (dom.alertCancelEditBtn) {
    dom.alertCancelEditBtn.hidden = false;
  }
  const form = dom.alertForm;
  const assetInput = form.querySelector('[name="assetId"]');
  const directionInput = form.querySelector('[name="direction"]');
  const targetPriceInput = form.querySelector('[name="targetPrice"]');
  if (assetInput) {
    assetInput.value = alert.assetId || "";
  }
  if (directionInput) {
    directionInput.value = alert.direction || "gte";
  }
  if (targetPriceInput) {
    targetPriceInput.value = String(toNum(alert.targetPrice));
  }
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function onAlertSubmit(event) {
  event.preventDefault();
  const data = formToObject(event.currentTarget);
  const editId = editingState.alertId && data.editId === editingState.alertId ? editingState.alertId : "";
  const assetId = findById(state.assets, data.assetId || "") ? data.assetId : "";
  if (!assetId) {
    window.alert("Wybierz walor dla alertu.");
    return;
  }
  const payload = {
    assetId,
    direction: data.direction || "gte",
    targetPrice: toNum(data.targetPrice)
  };
  if (editId) {
    const existing = findById(state.alerts, editId);
    if (!existing) {
      resetAlertForm();
      window.alert("Nie znaleziono alertu do edycji.");
      return;
    }
    Object.assign(existing, payload);
  } else {
    state.alerts.push({
      id: makeId("alt"),
      ...payload,
      createdAt: nowIso(),
      lastTriggerAt: ""
    });
  }
  saveState();
  resetAlertForm();
  renderAlerts();
}

async function onCheckAlerts() {
  const result = await runAlertWorkflow({ interactive: true });
  if (!result) {
    return;
  }
  if (result.triggeredLabels && result.triggeredLabels.length) {
    window.alert(`Aktywne alerty:\n${result.triggeredLabels.join("\n")}`);
  } else {
    window.alert("Brak aktywnych alertów.");
  }
}

function onNoteSubmit(event) {
  event.preventDefault();
  const data = formToObject(event.currentTarget);
  state.notes.unshift({
    id: makeId("note"),
    content: data.content || "",
    createdAt: nowIso()
  });
  saveState();
  event.currentTarget.reset();
  renderNotes();
}

function onStrategySubmit(event) {
  event.preventDefault();
  const data = formToObject(event.currentTarget);
  state.strategies.unshift({
    id: makeId("str"),
    name: textOrFallback(data.name, "Strategia"),
    description: data.description || "",
    createdAt: nowIso()
  });
  saveState();
  event.currentTarget.reset();
  renderStrategies();
}

function resetLiabilityForm() {
  editingState.liabilityId = "";
  if (dom.liabilityEditId) {
    dom.liabilityEditId.value = "";
  }
  if (dom.liabilitySubmitBtn) {
    dom.liabilitySubmitBtn.textContent = "Dodaj zobowiązanie";
  }
  if (dom.liabilityCancelEditBtn) {
    dom.liabilityCancelEditBtn.hidden = true;
  }
  if (dom.liabilityForm) {
    dom.liabilityForm.reset();
  }
}

function startLiabilityEdit(liabilityId) {
  const liability = findById(state.liabilities, liabilityId);
  if (!liability || !dom.liabilityForm) {
    return;
  }
  editingState.liabilityId = liability.id;
  if (dom.liabilityEditId) {
    dom.liabilityEditId.value = liability.id;
  }
  if (dom.liabilitySubmitBtn) {
    dom.liabilitySubmitBtn.textContent = "Zapisz zobowiązanie";
  }
  if (dom.liabilityCancelEditBtn) {
    dom.liabilityCancelEditBtn.hidden = false;
  }
  const form = dom.liabilityForm;
  const nameInput = form.querySelector('[name="name"]');
  const amountInput = form.querySelector('[name="amount"]');
  const currencyInput = form.querySelector('[name="currency"]');
  const rateInput = form.querySelector('[name="rate"]');
  const dueDateInput = form.querySelector('[name="dueDate"]');
  if (nameInput) {
    nameInput.value = liability.name || "";
  }
  if (amountInput) {
    amountInput.value = String(toNum(liability.amount));
  }
  if (currencyInput) {
    currencyInput.value = liability.currency || state.meta.baseCurrency;
  }
  if (rateInput) {
    rateInput.value = String(toNum(liability.rate));
  }
  if (dueDateInput) {
    dueDateInput.value = liability.dueDate || "";
  }
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function onLiabilitySubmit(event) {
  event.preventDefault();
  const data = formToObject(event.currentTarget);
  const editId = editingState.liabilityId && data.editId === editingState.liabilityId ? editingState.liabilityId : "";
  const payload = {
    name: textOrFallback(data.name, "Zobowiązanie"),
    amount: toNum(data.amount),
    currency: textOrFallback(data.currency, state.meta.baseCurrency),
    rate: toNum(data.rate),
    dueDate: data.dueDate || ""
  };
  if (editId) {
    const existing = findById(state.liabilities, editId);
    if (!existing) {
      resetLiabilityForm();
      window.alert("Nie znaleziono zobowiązania do edycji.");
      return;
    }
    Object.assign(existing, payload);
  } else {
    state.liabilities.push({
      id: makeId("liab"),
      ...payload,
      createdAt: nowIso()
    });
  }
  saveState();
  resetLiabilityForm();
  renderLiabilities();
  renderDashboard();
}

function onTaxSubmit(event) {
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
    `<p>Podstawa opodatkowania: <strong>${formatMoney(taxableBase)}</strong></p>`,
    `<p>Szacowany podatek: <strong>${formatMoney(tax)}</strong></p>`,
    `<p>Potencjalna ulga po kompensacji dywidend i kosztów: <strong>${formatMoney(
      optimizationHint
    )}</strong></p>`
  ].join("");
}

function onBackupExport() {
  const payload = {
    version: 1,
    exportedAt: nowIso(),
    state
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `myfund-solo-backup-${todayIso()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function onBackupImport(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result || "{}"));
      if (!payload.state) {
        throw new Error("Niepoprawny format kopii.");
      }
      state = normalizeState(payload.state);
      saveState();
      renderAll();
      window.alert("Kopia została zaimportowana.");
    } catch (error) {
      window.alert(`Nie udało się wczytać kopii: ${error.message}`);
    }
  };
  reader.readAsText(file, "utf-8");
  event.target.value = "";
}

function onResetState() {
  const yes = window.confirm("Na pewno usunąć wszystkie dane lokalne?");
  if (!yes) {
    return;
  }
  state = defaultState();
  saveState();
  renderAll();
}

function onActionClick(event) {
  const btn = event.target.closest("[data-action]");
  if (!btn) {
    return;
  }
  const action = btn.dataset.action;
  const id = btn.dataset.id || "";
  if (!action) {
    return;
  }

  if (action === "delete-portfolio") {
    removePortfolio(id);
    return;
  }
  if (action === "edit-portfolio") {
    startPortfolioEdit(id);
    return;
  }
  if (action === "copy-portfolio") {
    copyPortfolio(id);
    return;
  }
  if (action === "export-portfolio") {
    exportPortfolio(id);
    return;
  }
  if (action === "delete-account") {
    if (editingState.accountId === id) {
      resetAccountForm();
    }
    if (
      editingState.recurringId &&
      state.recurringOps.some((item) => item.id === editingState.recurringId && item.accountId === id)
    ) {
      resetRecurringForm();
    }
    if (
      editingState.operationId &&
      state.operations.some((item) => item.id === editingState.operationId && item.accountId === id)
    ) {
      resetOperationForm();
    }
    state.accounts = state.accounts.filter((item) => item.id !== id);
    state.operations = state.operations.filter((item) => item.accountId !== id);
    saveState();
    renderAll();
    return;
  }
  if (action === "edit-account") {
    startAccountEdit(id);
    return;
  }
  if (action === "edit-asset") {
    startAssetEdit(id);
    return;
  }
  if (action === "delete-asset") {
    if (editingState.assetId === id) {
      resetAssetForm();
    }
    if (
      editingState.alertId &&
      state.alerts.some((item) => item.id === editingState.alertId && item.assetId === id)
    ) {
      resetAlertForm();
    }
    if (
      editingState.recurringId &&
      state.recurringOps.some((item) => item.id === editingState.recurringId && item.assetId === id)
    ) {
      resetRecurringForm();
    }
    if (
      editingState.operationId &&
      state.operations.some(
        (item) => item.id === editingState.operationId && (item.assetId === id || item.targetAssetId === id)
      )
    ) {
      resetOperationForm();
    }
    state.assets = state.assets.filter((item) => item.id !== id);
    state.operations = state.operations.filter(
      (item) => item.assetId !== id && item.targetAssetId !== id
    );
    state.alerts = state.alerts.filter((item) => item.assetId !== id);
    state.favorites = state.favorites.filter((item) => item !== id);
    saveState();
    renderAll();
    return;
  }
  if (action === "toggle-favorite") {
    if (state.favorites.includes(id)) {
      state.favorites = state.favorites.filter((item) => item !== id);
    } else {
      state.favorites.push(id);
    }
    saveState();
    renderAssets();
    return;
  }
  if (action === "update-asset-price") {
    const asset = findById(state.assets, id);
    if (!asset) {
      return;
    }
    const value = window.prompt(
      `Nowa cena dla ${asset.ticker} (${asset.currency})`,
      String(asset.currentPrice || 0)
    );
    if (value == null) {
      return;
    }
    asset.currentPrice = toNum(value);
    saveState();
    renderAll();
    return;
  }
  if (action === "delete-operation") {
    if (editingState.operationId === id) {
      resetOperationForm();
    }
    state.operations = state.operations.filter((item) => item.id !== id);
    saveState();
    renderAll();
    return;
  }
  if (action === "edit-operation") {
    startOperationEdit(id);
    return;
  }
  if (action === "delete-recurring") {
    if (editingState.recurringId === id) {
      resetRecurringForm();
    }
    state.recurringOps = state.recurringOps.filter((item) => item.id !== id);
    saveState();
    renderRecurring();
    return;
  }
  if (action === "edit-recurring") {
    startRecurringEdit(id);
    return;
  }
  if (action === "delete-alert") {
    if (editingState.alertId === id) {
      resetAlertForm();
    }
    state.alerts = state.alerts.filter((item) => item.id !== id);
    saveState();
    renderAlerts();
    return;
  }
  if (action === "edit-alert") {
    startAlertEdit(id);
    return;
  }
  if (action === "delete-note") {
    state.notes = state.notes.filter((item) => item.id !== id);
    saveState();
    renderNotes();
    return;
  }
  if (action === "delete-strategy") {
    state.strategies = state.strategies.filter((item) => item.id !== id);
    saveState();
    renderStrategies();
    return;
  }
  if (action === "delete-liability") {
    if (editingState.liabilityId === id) {
      resetLiabilityForm();
    }
    state.liabilities = state.liabilities.filter((item) => item.id !== id);
    saveState();
    renderLiabilities();
    renderDashboard();
    return;
  }
  if (action === "edit-liability") {
    startLiabilityEdit(id);
    return;
  }
  if (action === "delete-forum-post") {
    if (!backendSync.available) {
      window.alert("Backend offline.");
      return;
    }
    void (async () => {
      try {
        await apiRequest(`/tools/forum/post/${encodeURIComponent(id)}`, {
          method: "DELETE",
          timeoutMs: 8000
        });
        await refreshForum({ silent: true });
      } catch (error) {
        window.alert(`Nie udało się usunąć wpisu forum: ${error.message}`);
      }
    })();
    return;
  }
  if (action === "delete-option-position") {
    if (!backendSync.available) {
      window.alert("Backend offline.");
      return;
    }
    void (async () => {
      try {
        await apiRequest(`/tools/options/positions/${encodeURIComponent(id)}`, {
          method: "DELETE",
          timeoutMs: 8000
        });
        await refreshOptionPositions({ silent: true, refreshQuotes: false });
      } catch (error) {
        window.alert(`Nie udało się usunąć pozycji opcyjnej: ${error.message}`);
      }
    })();
    return;
  }
  if (action === "clone-public-portfolio") {
    void clonePublicPortfolioById(id);
    return;
  }
}

function syncEditingForms() {
  if (editingState.portfolioId && !findById(state.portfolios, editingState.portfolioId)) {
    resetPortfolioForm();
  }
  if (editingState.accountId && !findById(state.accounts, editingState.accountId)) {
    resetAccountForm();
  }
  if (editingState.assetId && !findById(state.assets, editingState.assetId)) {
    resetAssetForm();
  }
  if (editingState.operationId && !findById(state.operations, editingState.operationId)) {
    resetOperationForm();
  }
  if (editingState.recurringId && !findById(state.recurringOps, editingState.recurringId)) {
    resetRecurringForm();
  }
  if (editingState.alertId && !findById(state.alerts, editingState.alertId)) {
    resetAlertForm();
  }
  if (editingState.liabilityId && !findById(state.liabilities, editingState.liabilityId)) {
    resetLiabilityForm();
  }
}

function renderAll() {
  state = normalizeState(state);
  syncEditingForms();
  saveState();

  dom.planSelect.value = state.meta.activePlan;
  dom.baseCurrencySelect.value = state.meta.baseCurrency;

  fillPortfolioDependentSelects();
  fillAccountDependentSelects();
  fillAssetDependentSelects();

  renderPortfolioList();
  renderAccounts();
  renderAssets();
  renderOperations();
  renderRecurring();
  renderAlerts();
  renderNotes();
  renderStrategies();
  renderLiabilities();
  renderDashboard();
  renderToolCatalog();
  renderFeatureMatrix();
  void renderReportCurrent();
  if (isViewActive("toolsView")) {
    void refreshExpertTools();
  }
  updateBackendStatus();
}

function fillPortfolioDependentSelects() {
  const options = state.portfolios.map((portfolio) => ({
    value: portfolio.id,
    label: portfolio.name
  }));
  fillSelect(dom.dashboardPortfolioSelect, options, true);
  fillSelect(dom.operationPortfolioSelect, options, true);
  fillSelect(dom.recurringPortfolioSelect, options, true);
  fillSelect(dom.reportPortfolioSelect, options, true);
  fillSelect(dom.toolsPortfolioSelect, options, true);

  const parentOptions = [{ value: "", label: "Brak" }].concat(options);
  fillSelect(dom.portfolioParentSelect, parentOptions);
  fillSelect(dom.portfolioTwinSelect, parentOptions);

  const currentDashboard = dom.dashboardPortfolioSelect.value || (options[0] ? options[0].value : "");
  if (currentDashboard) {
    dom.dashboardPortfolioSelect.value = currentDashboard;
  }
  const currentReport = dom.reportPortfolioSelect.value || (options[0] ? options[0].value : "");
  if (currentReport) {
    dom.reportPortfolioSelect.value = currentReport;
  }
  const currentTools = dom.toolsPortfolioSelect.value || (options[0] ? options[0].value : "");
  if (currentTools) {
    dom.toolsPortfolioSelect.value = currentTools;
  }
}

function fillAccountDependentSelects() {
  const options = state.accounts.map((account) => ({
    value: account.id,
    label: `${account.name} (${account.currency})`
  }));
  fillSelect(dom.operationAccountSelect, options, true);
  fillSelect(dom.recurringAccountSelect, options, true);
}

function fillAssetDependentSelects() {
  const empty = [{ value: "", label: "Brak" }];
  const options = state.assets.map((asset) => ({
    value: asset.id,
    label: `${asset.ticker} - ${asset.name}`
  }));
  fillSelect(dom.operationAssetSelect, empty.concat(options));
  fillSelect(dom.operationTargetAssetSelect, empty.concat(options));
  fillSelect(dom.recurringAssetSelect, empty.concat(options));
  fillSelect(dom.alertAssetSelect, options, true);
}

function renderPortfolioList() {
  const rows = state.portfolios.map((portfolio) => {
    const parent = portfolio.parentId ? lookupName(state.portfolios, portfolio.parentId) : "-";
    const twin = portfolio.twinOf ? lookupName(state.portfolios, portfolio.twinOf) : "-";
    return [
      escapeHtml(portfolio.name),
      escapeHtml(portfolio.currency),
      escapeHtml(portfolio.benchmark || "-"),
      escapeHtml(portfolio.goal || "-"),
      escapeHtml(parent),
      escapeHtml(portfolio.groupName || "-"),
      escapeHtml(twin),
      portfolio.isPublic ? '<span class="badge ok">Tak</span>' : '<span class="badge off">Nie</span>',
      [
        `<button class="btn secondary" data-action="edit-portfolio" data-id="${portfolio.id}">Edytuj</button>`,
        `<button class="btn secondary" data-action="copy-portfolio" data-id="${portfolio.id}">Kopiuj</button>`,
        `<button class="btn secondary" data-action="export-portfolio" data-id="${portfolio.id}">Eksport</button>`,
        `<button class="btn danger" data-action="delete-portfolio" data-id="${portfolio.id}">Usuń</button>`
      ].join(" ")
    ];
  });
  renderTable(dom.portfolioList, ["Nazwa", "Waluta", "Benchmark", "Cel", "Sub", "Grupa", "Bliźniaczy", "Publiczny", "Akcje"], rows);
}

function renderAccounts() {
  const rows = state.accounts.map((account) => [
    escapeHtml(account.name),
    escapeHtml(account.type),
    escapeHtml(account.currency),
    [
      `<button class="btn secondary" data-action="edit-account" data-id="${account.id}">Edytuj</button>`,
      `<button class="btn danger" data-action="delete-account" data-id="${account.id}">Usuń</button>`
    ].join(" ")
  ]);
  renderTable(dom.accountList, ["Nazwa", "Typ", "Waluta", "Akcje"], rows);
}

function renderAssets() {
  const rows = state.assets.map((asset) => [
    escapeHtml(asset.ticker),
    escapeHtml(asset.name),
    escapeHtml(asset.type),
    formatMoney(asset.currentPrice, asset.currency),
    escapeHtml(String(asset.risk)),
    escapeHtml(asset.sector || "-"),
    escapeHtml(asset.tags.join(", ") || "-"),
    state.favorites.includes(asset.id) ? '<span class="badge ok">Ulubione</span>' : '<span class="badge off">-</span>',
    [
      `<button class="btn secondary" data-action="toggle-favorite" data-id="${asset.id}">${
        state.favorites.includes(asset.id) ? "Usuń z ulubionych" : "Dodaj do ulubionych"
      }</button>`,
      `<button class="btn secondary" data-action="edit-asset" data-id="${asset.id}">Edytuj</button>`,
      `<button class="btn secondary" data-action="update-asset-price" data-id="${asset.id}">Cena</button>`,
      `<button class="btn danger" data-action="delete-asset" data-id="${asset.id}">Usuń</button>`
    ].join(" ")
  ]);
  renderTable(dom.assetList, ["Ticker", "Nazwa", "Typ", "Cena", "Ryzyko", "Sektor", "Tagi", "Fav", "Akcje"], rows);
}

function renderOperations() {
  const rows = state.operations
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map((operation) => [
      escapeHtml(operation.date),
      escapeHtml(operation.type),
      escapeHtml(lookupName(state.portfolios, operation.portfolioId)),
      escapeHtml(lookupName(state.accounts, operation.accountId)),
      escapeHtml(lookupAssetLabel(operation.assetId)),
      escapeHtml(lookupAssetLabel(operation.targetAssetId)),
      formatFloat(operation.quantity),
      formatFloat(operation.targetQuantity),
      formatFloat(operation.price),
      formatMoney(operation.amount, operation.currency || state.meta.baseCurrency),
      formatMoney(operation.fee, operation.currency || state.meta.baseCurrency),
      escapeHtml(operation.tags.join(", ") || "-"),
      escapeHtml(operation.note || "-"),
      [
        `<button class="btn secondary" data-action="edit-operation" data-id="${operation.id}">Edytuj</button>`,
        `<button class="btn danger" data-action="delete-operation" data-id="${operation.id}">Usuń</button>`
      ].join(" ")
    ]);
  renderTable(
    dom.operationList,
    [
      "Data",
      "Typ",
      "Portfel",
      "Konto",
      "Walor",
      "Walor docelowy",
      "Ilość",
      "Ilość doc.",
      "Cena",
      "Kwota",
      "Prowizja",
      "Tagi",
      "Notatka",
      "Akcje"
    ],
    rows
  );
}

function renderRecurring() {
  const rows = state.recurringOps.map((item) => [
    escapeHtml(item.name),
    escapeHtml(item.type),
    escapeHtml(item.frequency),
    escapeHtml(item.startDate),
    formatMoney(item.amount, item.currency || state.meta.baseCurrency),
    escapeHtml(lookupName(state.portfolios, item.portfolioId)),
    escapeHtml(lookupName(state.accounts, item.accountId)),
    escapeHtml(lookupAssetLabel(item.assetId)),
    escapeHtml(item.lastGeneratedDate || "-"),
    [
      `<button class="btn secondary" data-action="edit-recurring" data-id="${item.id}">Edytuj</button>`,
      `<button class="btn danger" data-action="delete-recurring" data-id="${item.id}">Usuń</button>`
    ].join(" ")
  ]);
  renderTable(
    dom.recurringList,
    ["Nazwa", "Typ", "Częstotliwość", "Start", "Kwota", "Portfel", "Konto", "Walor", "Ostatnio", "Akcje"],
    rows
  );
}

function renderDashboard() {
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

async function renderReportCurrent(arg = null) {
  let force = false;
  if (arg && typeof arg === "object" && "force" in arg) {
    force = Boolean(arg.force);
  } else if (arg && typeof arg === "object" && typeof arg.preventDefault === "function") {
    force = true;
  }
  if (!force && !isViewActive("reportsView")) {
    return;
  }
  const reportName = dom.reportSelect.value || REPORT_FEATURES[0];
  const portfolioId = dom.reportPortfolioSelect.value || "";
  const requestId = ++backendSync.reportRequestSeq;
  if (backendSync.available) {
    try {
      const payload = await apiRequest("/reports/generate", {
        method: "POST",
        body: {
          reportName,
          portfolioId
        },
        timeoutMs: 20000
      });
      if (requestId !== backendSync.reportRequestSeq) {
        return;
      }
      const remote = normalizeRemoteReport(payload.report);
      dom.reportInfo.textContent = remote.info;
      renderTable(dom.reportOutput, remote.headers, remote.rows);
      drawLineChart(dom.reportChart, remote.chart.labels, remote.chart.values, {
        color: remote.chart.color || "#ff7f32"
      });
      return;
    } catch (error) {
      backendSync.available = false;
      updateBackendStatus();
    }
  }
  const report = buildReport(reportName, portfolioId);
  if (requestId !== backendSync.reportRequestSeq) {
    return;
  }
  dom.reportInfo.textContent = report.info;
  renderTable(dom.reportOutput, report.headers, report.rows);
  drawLineChart(dom.reportChart, report.chart.labels || [], report.chart.values || [], {
    color: report.chart.color || "#ff7f32"
  });
}

function isViewActive(viewId) {
  const element = document.getElementById(viewId);
  return Boolean(element && element.classList.contains("active"));
}

function normalizeRemoteReport(raw) {
  const fallback = {
    info: "Brak danych raportu.",
    headers: ["Kolumna", "Wartość"],
    rows: [],
    chart: {
      labels: [],
      values: [],
      color: "#0e7a64"
    }
  };
  if (!raw || typeof raw !== "object") {
    return fallback;
  }
  const headers = Array.isArray(raw.headers)
    ? raw.headers.map((item) => String(item))
    : fallback.headers;
  const rows = Array.isArray(raw.rows)
    ? raw.rows.map((row) => {
        if (Array.isArray(row)) {
          return row.map((cell) => escapeHtml(formatRemoteCell(cell)));
        }
        return [escapeHtml(formatRemoteCell(row))];
      })
    : [];
  const chartRaw = raw.chart && typeof raw.chart === "object" ? raw.chart : {};
  const chart = {
    labels: Array.isArray(chartRaw.labels) ? chartRaw.labels.map((item) => String(item)) : [],
    values: Array.isArray(chartRaw.values) ? chartRaw.values.map((item) => toNum(item)) : [],
    color: textOrFallback(chartRaw.color, "#0e7a64")
  };
  return {
    info: textOrFallback(raw.info, fallback.info),
    headers,
    rows,
    chart
  };
}

function formatRemoteCell(cell) {
  if (cell == null) {
    return "-";
  }
  if (typeof cell === "number") {
    return formatFloat(cell);
  }
  if (typeof cell === "boolean") {
    return cell ? "Tak" : "Nie";
  }
  return String(cell);
}

function renderAlerts() {
  const rows = state.alerts.map((alert) => {
    const asset = findById(state.assets, alert.assetId);
    const current = asset ? toNum(asset.currentPrice) : 0;
    const triggered = alert.direction === "gte" ? current >= alert.targetPrice : current <= alert.targetPrice;
    return [
      escapeHtml(asset ? `${asset.ticker} - ${asset.name}` : "Brak waloru"),
      escapeHtml(alert.direction === "gte" ? ">=" : "<="),
      formatMoney(alert.targetPrice, asset ? asset.currency : state.meta.baseCurrency),
      formatMoney(current, asset ? asset.currency : state.meta.baseCurrency),
      triggered ? '<span class="badge ok">Tak</span>' : '<span class="badge off">Nie</span>',
      escapeHtml(formatDateTime(alert.lastTriggerAt) || "-"),
      [
        `<button class="btn secondary" data-action="edit-alert" data-id="${alert.id}">Edytuj</button>`,
        `<button class="btn danger" data-action="delete-alert" data-id="${alert.id}">Usuń</button>`
      ].join(" ")
    ];
  });
  renderTable(dom.alertList, ["Walor", "Warunek", "Poziom", "Cena", "Aktywny", "Ostatnie trafienie", "Akcje"], rows);
}

function renderNotes() {
  const rows = state.notes.map((note) => [
    escapeHtml(formatDateTime(note.createdAt)),
    escapeHtml(note.content),
    `<button class="btn danger" data-action="delete-note" data-id="${note.id}">Usuń</button>`
  ]);
  renderTable(dom.notesList, ["Data", "Treść", "Akcje"], rows);
}

function renderStrategies() {
  const rows = state.strategies.map((strategy) => [
    escapeHtml(formatDateTime(strategy.createdAt)),
    escapeHtml(strategy.name),
    escapeHtml(strategy.description),
    `<button class="btn danger" data-action="delete-strategy" data-id="${strategy.id}">Usuń</button>`
  ]);
  renderTable(dom.strategyList, ["Data", "Nazwa", "Opis", "Akcje"], rows);
}

function renderLiabilities() {
  const rows = state.liabilities.map((liability) => [
    escapeHtml(liability.name),
    formatMoney(liability.amount, liability.currency),
    `${formatFloat(liability.rate)}%`,
    escapeHtml(liability.dueDate || "-"),
    [
      `<button class="btn secondary" data-action="edit-liability" data-id="${liability.id}">Edytuj</button>`,
      `<button class="btn danger" data-action="delete-liability" data-id="${liability.id}">Usuń</button>`
    ].join(" ")
  ]);
  renderTable(dom.liabilityList, ["Nazwa", "Kwota", "Oprocentowanie", "Termin", "Akcje"], rows);
}

function renderToolCatalog() {
  const rows = TOOL_FEATURES.map((feature) => {
    const minPlan = inferMinPlan(feature, "tool");
    const available = isFeatureAvailable(minPlan, state.meta.activePlan);
    const status = available
      ? '<span class="badge ok">Działa lokalnie</span>'
      : '<span class="badge off">Niedostępne w planie</span>';
    return [escapeHtml(feature), escapeHtml(minPlan), status];
  });
  renderTable(dom.toolCatalog, ["Narzędzie", "Od planu", "Status"], rows);
}

function renderFeatureMatrix() {
  const rows = [];

  rows.push([
    "<strong>Portfele</strong>",
    "-",
    "-",
    "-",
    "-",
    "-",
    "-"
  ]);
  rows.push([
    "Maksymalna liczba portfeli",
    String(PLAN_LIMITS.Brak.portfolios),
    String(PLAN_LIMITS.Basic.portfolios),
    String(PLAN_LIMITS.Standard.portfolios),
    String(PLAN_LIMITS.Pro.portfolios),
    String(PLAN_LIMITS.Expert.portfolios),
    '<span class="badge ok">Limit aktywny</span>'
  ]);

  PORTFOLIO_FEATURES.forEach((feature) => {
    rows.push(featureRow(feature, "portfolio"));
  });

  rows.push([
    "<strong>Operacje</strong>",
    "-",
    "-",
    "-",
    "-",
    "-",
    "-"
  ]);
  OPERATION_FEATURES.forEach((feature) => {
    rows.push(featureRow(feature, "operation"));
  });

  rows.push([
    "<strong>Raporty</strong>",
    "-",
    "-",
    "-",
    "-",
    "-",
    "-"
  ]);
  REPORT_FEATURES.forEach((feature) => {
    rows.push(featureRow(feature, "report"));
  });

  rows.push([
    "<strong>Narzędzia</strong>",
    "-",
    "-",
    "-",
    "-",
    "-",
    "-"
  ]);
  TOOL_FEATURES.forEach((feature) => {
    rows.push(featureRow(feature, "tool"));
  });

  renderTable(
    dom.featureMatrix,
    ["Funkcja", "Brak", "Basic", "Standard", "Pro", "Expert", "Status w Solo"],
    rows
  );
}

function featureRow(feature, category) {
  const minPlan = inferMinPlan(feature, category);
  const active = isFeatureAvailable(minPlan, state.meta.activePlan);
  return [
    escapeHtml(feature),
    planCell(minPlan, "Brak"),
    planCell(minPlan, "Basic"),
    planCell(minPlan, "Standard"),
    planCell(minPlan, "Pro"),
    planCell(minPlan, "Expert"),
    active ? '<span class="badge ok">Aktywne</span>' : '<span class="badge off">Nieaktywne</span>'
  ];
}

function planCell(minPlan, plan) {
  return isFeatureAvailable(minPlan, plan) ? "✓" : "·";
}

function buildReport(reportName, portfolioId) {
  const metrics = computeMetrics(portfolioId);
  const series = buildSeries(portfolioId);
  const lower = reportName.toLowerCase();
  const baseInfo = `${reportName} | Portfel: ${
    portfolioId ? lookupName(state.portfolios, portfolioId) : "wszystkie"
  }`;

  if (lower.includes("historia operacji")) {
    const rows = state.operations
      .filter((op) => !portfolioId || op.portfolioId === portfolioId)
      .slice()
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .map((op) => [
        escapeHtml(op.date),
        escapeHtml(op.type),
        escapeHtml(lookupAssetLabel(op.assetId)),
        formatFloat(op.quantity),
        formatFloat(op.price),
        formatMoney(op.amount, op.currency || state.meta.baseCurrency),
        formatMoney(op.fee, op.currency || state.meta.baseCurrency)
      ]);
    return {
      info: baseInfo,
      headers: ["Data", "Typ", "Walor", "Ilość", "Cena", "Kwota", "Prowizja"],
      rows,
      chart: emptyChart()
    };
  }

  if (lower.includes("podsumowanie portfeli")) {
    const rows = state.portfolios.map((portfolio) => {
      const data = computeMetrics(portfolio.id);
      return [
        escapeHtml(portfolio.name),
        formatMoney(data.marketValue),
        formatMoney(data.cashTotal),
        formatMoney(data.netWorth),
        formatMoney(data.totalPL),
        `${formatFloat(data.returnPct)}%`
      ];
    });
    return {
      info: baseInfo,
      headers: ["Portfel", "Wartość rynkowa", "Gotówka", "Majątek netto", "P/L", "Stopa zwrotu"],
      rows,
      chart: emptyChart()
    };
  }

  if (lower.includes("zamknięte inwestycje")) {
    const sells = state.operations
      .filter((op) => (!portfolioId || op.portfolioId === portfolioId) && op.type.toLowerCase().includes("sprzeda"))
      .map((op) => [
        escapeHtml(op.date),
        escapeHtml(lookupAssetLabel(op.assetId)),
        formatFloat(op.quantity),
        formatMoney(op.price, op.currency || state.meta.baseCurrency),
        formatMoney(op.amount, op.currency || state.meta.baseCurrency),
        formatMoney(op.fee, op.currency || state.meta.baseCurrency)
      ]);
    return {
      info: `${baseInfo} | Liczba zamknięć: ${sells.length}`,
      headers: ["Data", "Walor", "Ilość", "Cena", "Kwota", "Prowizja"],
      rows: sells,
      chart: emptyChart()
    };
  }

  if (lower.includes("skład i struktura") || lower.includes("struktura majątku")) {
    const rows = metrics.holdings.map((holding) => [
      escapeHtml(holding.ticker),
      escapeHtml(holding.type),
      formatFloat(holding.qty),
      formatMoney(holding.value),
      `${formatFloat(holding.share)}%`,
      formatMoney(holding.unrealized)
    ]);
    rows.push(["<strong>Gotówka</strong>", "-", "-", formatMoney(metrics.cashTotal), "-", "-"]);
    rows.push(["<strong>Zobowiązania</strong>", "-", "-", formatMoney(-metrics.liabilitiesTotal), "-", "-"]);
    return {
      info: baseInfo,
      headers: ["Walor", "Typ", "Ilość", "Wartość", "Udział", "P/L"],
      rows,
      chart: emptyChart()
    };
  }

  if (lower.includes("statystyki portfela")) {
    const rows = [
      ["Wartość rynkowa", formatMoney(metrics.marketValue)],
      ["Gotówka", formatMoney(metrics.cashTotal)],
      ["Wartość majątku netto", formatMoney(metrics.netWorth)],
      ["Niezrealizowany zysk", formatMoney(metrics.unrealized)],
      ["Zrealizowany zysk", formatMoney(metrics.realized)],
      ["Dywidendy", formatMoney(metrics.dividends)],
      ["Prowizje", formatMoney(metrics.fees)],
      ["Całkowity P/L", formatMoney(metrics.totalPL)],
      ["Stopa zwrotu", `${formatFloat(metrics.returnPct)}%`]
    ];
    return {
      info: baseInfo,
      headers: ["Miara", "Wartość"],
      rows,
      chart: emptyChart()
    };
  }

  if (
    lower.includes("zysk per typ inwestycji") ||
    lower.includes("analiza sektorowa") ||
    lower.includes("analiza indeksowa")
  ) {
    const buckets = lower.includes("sektor")
      ? groupBy(metrics.holdings, (item) => item.sector || "Brak sektora")
      : lower.includes("indeks")
      ? groupBy(metrics.holdings, (item) => item.benchmark || "Brak benchmarku")
      : groupBy(metrics.holdings, (item) => item.type || "Inny");
    const rows = Object.entries(buckets)
      .map(([key, list]) => {
        const value = sum(list.map((item) => item.value));
        const pl = sum(list.map((item) => item.unrealized));
        return [escapeHtml(key), formatMoney(value), formatMoney(pl), `${formatFloat((pl / Math.max(1, value - pl)) * 100)}%`];
      })
      .sort((a, b) => toNum(stripMoney(b[1])) - toNum(stripMoney(a[1])));
    return {
      info: baseInfo,
      headers: ["Grupa", "Wartość", "P/L", "Rentowność"],
      rows,
      chart: emptyChart()
    };
  }

  if (lower.includes("zysk per konto inwestycyjne") || lower.includes("udział kont inwestycyjnych")) {
    const rows = metrics.byAccount.map((account) => [
      escapeHtml(account.name),
      formatMoney(account.cash),
      formatMoney(account.buyGross),
      formatMoney(account.sellGross),
      formatMoney(account.fees),
      formatMoney(account.realized),
      formatMoney(account.balance)
    ]);
    return {
      info: baseInfo,
      headers: ["Konto", "Gotówka", "Kupno", "Sprzedaż", "Prowizje", "Realized P/L", "Bilans"],
      rows,
      chart: emptyChart()
    };
  }

  if (lower.includes("ekspozycja walutowa")) {
    const rows = metrics.byCurrency.map((item) => [
      escapeHtml(item.currency),
      formatMoney(item.value, item.currency),
      `${formatFloat(item.share)}%`
    ]);
    return {
      info: baseInfo,
      headers: ["Waluta", "Wartość", "Udział"],
      rows,
      chart: lower.includes("w czasie")
        ? {
            labels: series.map((item) => item.date),
            values: series.map((item) => item.value),
            color: "#0f7c66"
          }
        : emptyChart()
    };
  }

  if (lower.includes("struktura per tag") || lower.includes("udział tagów")) {
    const rows = metrics.byTag.map((item) => [
      escapeHtml(item.tag),
      formatMoney(item.value),
      `${formatFloat(item.share)}%`
    ]);
    return {
      info: baseInfo,
      headers: ["Tag", "Wartość", "Udział"],
      rows,
      chart: emptyChart()
    };
  }

  if (lower.includes("ranking walorów") || lower.includes("porównanie walorów")) {
    const rows = metrics.holdings
      .slice()
      .sort((a, b) => b.unrealizedPct - a.unrealizedPct)
      .map((holding) => [
        escapeHtml(holding.ticker),
        escapeHtml(holding.name),
        escapeHtml(holding.type),
        formatMoney(holding.value),
        formatMoney(holding.unrealized),
        `${formatFloat(holding.unrealizedPct)}%`,
        `${formatFloat(holding.share)}%`
      ]);
    return {
      info: baseInfo,
      headers: ["Ticker", "Nazwa", "Typ", "Wartość", "P/L", "P/L %", "Udział %"],
      rows,
      chart: emptyChart()
    };
  }

  if (lower.includes("analiza dywidend")) {
    const divSeries = aggregateOpsByDate(
      state.operations.filter(
        (op) => (!portfolioId || op.portfolioId === portfolioId) && op.type.toLowerCase().includes("dywid")
      ),
      (op) => toNum(op.amount)
    );
    return {
      info: baseInfo,
      headers: ["Data", "Dywidendy"],
      rows: divSeries.map((item) => [escapeHtml(item.date), formatMoney(item.value)]),
      chart: {
        labels: divSeries.map((item) => item.date),
        values: divSeries.map((item) => item.value),
        color: "#ff7f32"
      }
    };
  }

  if (lower.includes("prowizje")) {
    const feeSeries = aggregateOpsByDate(
      state.operations.filter((op) => !portfolioId || op.portfolioId === portfolioId),
      (op) => toNum(op.fee) + (op.type.toLowerCase().includes("prowiz") ? Math.max(0, toNum(op.amount)) : 0)
    );
    return {
      info: baseInfo,
      headers: ["Data", "Prowizje"],
      rows: feeSeries.map((item) => [escapeHtml(item.date), formatMoney(item.value)]),
      chart: {
        labels: feeSeries.map((item) => item.date),
        values: feeSeries.map((item) => item.value),
        color: "#995728"
      }
    };
  }

  if (lower.includes("analiza fundamentalna") || lower.includes("analiza ryzyka") || lower.includes("zarządzanie ryzykiem")) {
    const rows = metrics.holdings.map((holding) => [
      escapeHtml(holding.ticker),
      escapeHtml(holding.name),
      escapeHtml(holding.sector || "-"),
      escapeHtml(holding.industry || "-"),
      formatFloat(holding.risk),
      `${formatFloat(holding.share)}%`,
      formatMoney(holding.value)
    ]);
    return {
      info: `${baseInfo} | Dane zdefiniowane lokalnie dla walorów.`,
      headers: ["Ticker", "Nazwa", "Sektor", "Branża", "Ryzyko", "Udział", "Wartość"],
      rows,
      chart: emptyChart()
    };
  }

  if (lower.includes("limity ike")) {
    const ike = sum(
      state.operations
        .filter(
          (op) =>
            (!portfolioId || op.portfolioId === portfolioId) &&
            lookupName(state.accounts, op.accountId).toLowerCase().includes("ike") &&
            (op.type.toLowerCase().includes("operacja gotówk") || op.type.toLowerCase().includes("przelew"))
        )
        .map((op) => toNum(op.amount))
    );
    const ikze = sum(
      state.operations
        .filter(
          (op) =>
            (!portfolioId || op.portfolioId === portfolioId) &&
            lookupName(state.accounts, op.accountId).toLowerCase().includes("ikze") &&
            (op.type.toLowerCase().includes("operacja gotówk") || op.type.toLowerCase().includes("przelew"))
        )
        .map((op) => toNum(op.amount))
    );
    const ppk = sum(
      state.operations
        .filter(
          (op) =>
            (!portfolioId || op.portfolioId === portfolioId) &&
            lookupName(state.accounts, op.accountId).toLowerCase().includes("ppk") &&
            (op.type.toLowerCase().includes("operacja gotówk") || op.type.toLowerCase().includes("przelew"))
        )
        .map((op) => toNum(op.amount))
    );
    return {
      info: `${baseInfo} | Kwoty limitów ustawiasz samodzielnie wg aktualnych przepisów.`,
      headers: ["Konto", "Wpłaty w roku (z operacji gotówkowych)"],
      rows: [
        ["IKE", formatMoney(ike)],
        ["IKZE", formatMoney(ikze)],
        ["PPK", formatMoney(ppk)]
      ],
      chart: emptyChart()
    };
  }

  if (lower.includes("podsumowania na e-mail")) {
    const rows = [
      ["Tryb", "Lokalny (manualny eksport JSON)"],
      ["Dane w raporcie", "Wartość, P/L, operacje, alerty"],
      ["Status", "Gotowe do podpięcia wysyłki SMTP/API"]
    ];
    return {
      info: `${baseInfo} | Wersja Solo bez automatycznej wysyłki.`,
      headers: ["Parametr", "Wartość"],
      rows,
      chart: emptyChart()
    };
  }

  if (lower.includes("drawdown")) {
    const drawdown = computeDrawdownSeries(series);
    return {
      info: baseInfo,
      headers: ["Data", "Drawdown %"],
      rows: drawdown.map((item) => [escapeHtml(item.date), `${formatFloat(item.value)}%`]),
      chart: {
        labels: drawdown.map((item) => item.date),
        values: drawdown.map((item) => item.value),
        color: "#aa2a2a"
      }
    };
  }

  if (lower.includes("rolling return")) {
    const rolling = computeRollingReturnSeries(series, 5);
    return {
      info: `${baseInfo} | Okno 5 punktów czasowych.`,
      headers: ["Data", "Rolling return %"],
      rows: rolling.map((item) => [escapeHtml(item.date), `${formatFloat(item.value)}%`]),
      chart: {
        labels: rolling.map((item) => item.date),
        values: rolling.map((item) => item.value),
        color: "#14705c"
      }
    };
  }

  if (lower.includes("zmienność stopy zwrotu")) {
    const returns = computePeriodReturns(series).map((item) => item.value);
    const volatility = stddev(returns);
    return {
      info: baseInfo,
      headers: ["Miara", "Wartość"],
      rows: [
        ["Liczba okresów", String(returns.length)],
        ["Średnia stopa zwrotu", `${formatFloat(average(returns))}%`],
        ["Zmienność (odchylenie std.)", `${formatFloat(volatility)}%`]
      ],
      chart: emptyChart()
    };
  }

  if (lower.includes("stopa zwrotu")) {
    const periodReturns = computePeriodReturns(series);
    return {
      info: `${baseInfo} | Benchmark możesz ustawić w portfelu i walorach.`,
      headers: ["Data", "Stopa zwrotu %"],
      rows: periodReturns.map((item) => [escapeHtml(item.date), `${formatFloat(item.value)}%`]),
      chart: {
        labels: periodReturns.map((item) => item.date),
        values: periodReturns.map((item) => item.value),
        color: "#0d6f5d"
      }
    };
  }

  if (lower.includes("w czasie")) {
    const values = series.map((point) => {
      if (lower.includes("zysk")) {
        return point.pl;
      }
      if (lower.includes("zmiana okresowa")) {
        return 0;
      }
      if (lower.includes("wartość zobowiązań")) {
        return metrics.liabilitiesTotal;
      }
      if (lower.includes("wartość majątku")) {
        return point.value;
      }
      if (lower.includes("wartość jednostki")) {
        return point.value / Math.max(1, metrics.units);
      }
      return point.value;
    });
    if (lower.includes("zmiana okresowa")) {
      const per = computePeriodReturns(series);
      return {
        info: baseInfo,
        headers: ["Data", "Zmiana okresowa %"],
        rows: per.map((item) => [escapeHtml(item.date), `${formatFloat(item.value)}%`]),
        chart: {
          labels: per.map((item) => item.date),
          values: per.map((item) => item.value),
          color: "#ff7f32"
        }
      };
    }
    return {
      info: baseInfo,
      headers: ["Data", "Wartość"],
      rows: series.map((item, idx) => [escapeHtml(item.date), formatMoney(values[idx])]),
      chart: {
        labels: series.map((item) => item.date),
        values,
        color: "#0e7a64"
      }
    };
  }

  if (lower.includes("wkład i wartość") || lower.includes("wkład i zysk")) {
    const rows = [
      ["Suma wpłat netto", formatMoney(metrics.netContribution)],
      ["Wartość netto", formatMoney(metrics.netWorth)],
      ["Całkowity zysk/strata", formatMoney(metrics.totalPL)]
    ];
    const values = [metrics.netContribution, metrics.netWorth, metrics.totalPL];
    return {
      info: baseInfo,
      headers: ["Miara", "Wartość"],
      rows,
      chart: {
        labels: ["Wpłaty", "Wartość", "P/L"],
        values,
        color: "#ff7f32"
      }
    };
  }

  const fallbackRows = metrics.holdings.map((holding) => [
    escapeHtml(holding.ticker),
    formatMoney(holding.value),
    `${formatFloat(holding.share)}%`
  ]);
  return {
    info: `${baseInfo} | Raport automatycznie przypisany do modułu składu portfela.`,
    headers: ["Walor", "Wartość", "Udział"],
    rows: fallbackRows,
    chart: {
      labels: series.map((point) => point.date),
      values: series.map((point) => point.value),
      color: "#0e7a64"
    }
  };
}

function computeMetrics(portfolioId, options = {}) {
  const untilDate = options.untilDate || "";
  const useCurrentPrices = options.useCurrentPrices !== false;
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
  const cashByAccount = new Map();
  const accountStats = new Map();
  const lastPriceByAsset = new Map();

  let realized = 0;
  let dividends = 0;
  let fees = 0;
  let netContribution = 0;

  const addCash = (accountId, amount) => {
    if (!accountId) {
      accountId = "__global";
    }
    cashByAccount.set(accountId, (cashByAccount.get(accountId) || 0) + amount);
    const stat = accountStats.get(accountId) || {
      accountId,
      name: accountId === "__global" ? "N/D" : lookupName(state.accounts, accountId),
      cash: 0,
      buyGross: 0,
      sellGross: 0,
      fees: 0,
      realized: 0,
      balance: 0
    };
    stat.cash += amount;
    stat.balance += amount;
    accountStats.set(accountId, stat);
  };

  const addAccountStat = (accountId, field, amount) => {
    if (!accountId) {
      accountId = "__global";
    }
    const stat = accountStats.get(accountId) || {
      accountId,
      name: accountId === "__global" ? "N/D" : lookupName(state.accounts, accountId),
      cash: 0,
      buyGross: 0,
      sellGross: 0,
      fees: 0,
      realized: 0,
      balance: 0
    };
    stat[field] = (stat[field] || 0) + amount;
    accountStats.set(accountId, stat);
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
    const qty = toNum(operation.quantity);
    const targetQty = toNum(operation.targetQuantity);
    const price = toNum(operation.price);
    const amount = toNum(operation.amount);
    const fee = toNum(operation.fee);

    if (operation.assetId && price > 0) {
      lastPriceByAsset.set(operation.assetId, price);
    }

    if (type.includes("kupno")) {
      const gross = qty * price;
      const total = gross + fee;
      addHolding(operation.assetId, qty, total);
      addCash(accountId, -total);
      addAccountStat(accountId, "buyGross", gross);
      addAccountStat(accountId, "fees", fee);
      fees += fee;
      return;
    }

    if (type.includes("sprzeda")) {
      const holding = ensureHolding(operation.assetId);
      const avg = holding.qty > 0 ? holding.cost / holding.qty : 0;
      const soldQty = qty;
      const costOut = avg * soldQty;
      const proceeds = soldQty * price - fee;
      addHolding(operation.assetId, -soldQty, -costOut);
      addCash(accountId, proceeds);
      addAccountStat(accountId, "sellGross", soldQty * price);
      addAccountStat(accountId, "fees", fee);
      const realizedDelta = proceeds - costOut;
      addAccountStat(accountId, "realized", realizedDelta);
      realized += realizedDelta;
      fees += fee;
      return;
    }

    if (type.includes("konwers")) {
      const source = ensureHolding(operation.assetId);
      const avg = source.qty > 0 ? source.cost / source.qty : price;
      const sourceQty = qty;
      const costOut = avg * sourceQty;
      addHolding(operation.assetId, -sourceQty, -costOut);
      const receivedQty = targetQty || sourceQty;
      addHolding(operation.targetAssetId, receivedQty, costOut);
      if (fee > 0) {
        addCash(accountId, -fee);
        addAccountStat(accountId, "fees", fee);
        fees += fee;
      }
      return;
    }

    if (type.includes("dywid")) {
      addCash(accountId, amount);
      dividends += amount;
      return;
    }

    if (type.includes("prowiz")) {
      const feeAmount = Math.max(Math.abs(amount), fee);
      addCash(accountId, -feeAmount);
      addAccountStat(accountId, "fees", feeAmount);
      fees += feeAmount;
      return;
    }

    if (
      type.includes("operacja gotówk") ||
      type.includes("przelew") ||
      type.includes("lokat") ||
      type.includes("pożyczk") ||
      type.includes("zobowiąz")
    ) {
      addCash(accountId, amount);
      netContribution += amount;
      if (fee > 0) {
        addCash(accountId, -fee);
        addAccountStat(accountId, "fees", fee);
        fees += fee;
      }
      return;
    }

    if (amount !== 0) {
      addCash(accountId, amount);
      netContribution += amount;
    }
    if (fee > 0) {
      addCash(accountId, -fee);
      addAccountStat(accountId, "fees", fee);
      fees += fee;
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
    const value = holding.qty * price;
    const unrealized = value - holding.cost;
    bookValue += holding.cost;
    marketValue += value;
    holdingsList.push({
      assetId: holding.assetId,
      ticker: asset ? asset.ticker : "N/A",
      name: asset ? asset.name : "Usunięty walor",
      type: asset ? asset.type : "Inny",
      currency: asset ? asset.currency : state.meta.baseCurrency,
      risk: asset ? asset.risk : 5,
      sector: asset ? asset.sector : "",
      industry: asset ? asset.industry : "",
      benchmark: asset ? asset.benchmark : "",
      tags: asset ? asset.tags : [],
      qty: holding.qty,
      price,
      value,
      cost: holding.cost,
      unrealized,
      unrealizedPct: holding.cost !== 0 ? (unrealized / holding.cost) * 100 : 0,
      share: 0
    });
  });

  const cashTotal = sum(Array.from(cashByAccount.values()));
  const liabilitiesTotal = sum(state.liabilities.map((item) => toNum(item.amount)));
  const unrealized = marketValue - bookValue;
  const totalPL = unrealized + realized + dividends - fees;
  const netWorth = marketValue + cashTotal - liabilitiesTotal;

  holdingsList.forEach((holding) => {
    holding.share = marketValue > 0 ? (holding.value / marketValue) * 100 : 0;
  });

  const byCurrencyMap = {};
  holdingsList.forEach((holding) => {
    byCurrencyMap[holding.currency] = (byCurrencyMap[holding.currency] || 0) + holding.value;
  });
  Array.from(cashByAccount.entries()).forEach(([accountId, value]) => {
    const account = findById(state.accounts, accountId);
    const currency = account ? account.currency : state.meta.baseCurrency;
    byCurrencyMap[currency] = (byCurrencyMap[currency] || 0) + value;
  });
  const byCurrency = Object.entries(byCurrencyMap).map(([currency, value]) => ({
    currency,
    value,
    share: netWorth !== 0 ? (value / netWorth) * 100 : 0
  }));

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

function buildSeries(portfolioId) {
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
  return series;
}

function computeDrawdownSeries(series) {
  let peak = Number.NEGATIVE_INFINITY;
  return series.map((point) => {
    peak = Math.max(peak, point.value);
    const value = peak !== 0 ? ((point.value - peak) / peak) * 100 : 0;
    return { date: point.date, value };
  });
}

function computeRollingReturnSeries(series, window) {
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

function computePeriodReturns(series) {
  const output = [];
  for (let i = 1; i < series.length; i += 1) {
    const prev = series[i - 1].value;
    const curr = series[i].value;
    const value = prev !== 0 ? ((curr - prev) / prev) * 100 : 0;
    output.push({ date: series[i].date, value });
  }
  return output;
}

function aggregateOpsByDate(operations, valueFn) {
  const map = {};
  operations.forEach((operation) => {
    const date = operation.date || todayIso();
    map[date] = (map[date] || 0) + valueFn(operation);
  });
  return Object.entries(map)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function drawLineChart(canvas, labels, values, options = {}) {
  if (!canvas || !canvas.getContext) {
    return;
  }
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  if (!values || values.length === 0) {
    ctx.fillStyle = "#4b6056";
    ctx.font = "14px Space Grotesk";
    ctx.fillText("Brak danych do wykresu.", 20, 26);
    return;
  }

  const color = options.color || "#0e7a64";
  const padding = { left: 44, right: 14, top: 14, bottom: 26 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  ctx.strokeStyle = "rgba(168, 185, 163, 0.6)";
  ctx.lineWidth = 1;
  const lines = 4;
  for (let i = 0; i <= lines; i += 1) {
    const y = padding.top + (chartHeight / lines) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  const points = values.map((value, idx) => {
    const x = padding.left + (chartWidth * idx) / Math.max(1, values.length - 1);
    const y = padding.top + chartHeight - ((value - minVal) / range) * chartHeight;
    return { x, y, value, label: labels[idx] || "" };
  });

  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, color + "66");
  gradient.addColorStop(1, color + "08");

  ctx.beginPath();
  points.forEach((point, idx) => {
    if (idx === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
  ctx.lineTo(points[0].x, height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  points.forEach((point, idx) => {
    if (idx === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.stroke();

  const last = points[points.length - 1];
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(last.x, last.y, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#30473e";
  ctx.font = "12px IBM Plex Mono";
  ctx.fillText(formatMoney(maxVal), 4, padding.top + 10);
  ctx.fillText(formatMoney(minVal), 4, height - padding.bottom);

  ctx.font = "12px Space Grotesk";
  ctx.fillText(
    labels[0] || "",
    padding.left,
    height - 7
  );
  ctx.fillText(
    labels[labels.length - 1] || "",
    width - padding.right - 90,
    height - 7
  );
}

function drawCandlestickChart(canvas, candles) {
  if (!canvas || !canvas.getContext) {
    return;
  }
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  if (!candles || candles.length === 0) {
    ctx.fillStyle = "#4b6056";
    ctx.font = "14px Space Grotesk";
    ctx.fillText("Brak danych świecowych.", 20, 26);
    return;
  }

  const sample = candles.slice();
  const highs = sample.map((item) => toNum(item.high));
  const lows = sample.map((item) => toNum(item.low));
  const minVal = Math.min(...lows);
  const maxVal = Math.max(...highs);
  const range = maxVal - minVal || 1;

  const pad = { left: 44, right: 12, top: 12, bottom: 24 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const candleSpace = chartWidth / sample.length;
  const candleWidth = Math.max(2, candleSpace * 0.55);

  ctx.strokeStyle = "rgba(168, 185, 163, 0.5)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
  }

  sample.forEach((item, idx) => {
    const open = toNum(item.open);
    const close = toNum(item.close);
    const high = toNum(item.high);
    const low = toNum(item.low);
    const x = pad.left + idx * candleSpace + candleSpace / 2;
    const yHigh = pad.top + chartHeight - ((high - minVal) / range) * chartHeight;
    const yLow = pad.top + chartHeight - ((low - minVal) / range) * chartHeight;
    const yOpen = pad.top + chartHeight - ((open - minVal) / range) * chartHeight;
    const yClose = pad.top + chartHeight - ((close - minVal) / range) * chartHeight;
    const up = close >= open;
    ctx.strokeStyle = up ? "#0e7a64" : "#b04444";
    ctx.fillStyle = up ? "#0e7a64" : "#b04444";
    ctx.beginPath();
    ctx.moveTo(x, yHigh);
    ctx.lineTo(x, yLow);
    ctx.stroke();
    const top = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(1.5, Math.abs(yClose - yOpen));
    ctx.fillRect(x - candleWidth / 2, top, candleWidth, bodyHeight);
  });

  ctx.fillStyle = "#30473e";
  ctx.font = "12px IBM Plex Mono";
  ctx.fillText(formatFloat(maxVal), 4, pad.top + 10);
  ctx.fillText(formatFloat(minVal), 4, height - pad.bottom);

  const first = sample[0];
  const last = sample[sample.length - 1];
  ctx.font = "12px Space Grotesk";
  ctx.fillText(first.date || "", pad.left, height - 6);
  ctx.fillText(last.date || "", width - pad.right - 96, height - 6);
}

function renderTable(container, headers, rows) {
  if (!container) {
    return;
  }
  if (!rows || rows.length === 0) {
    container.innerHTML = '<p class="muted">Brak danych.</p>';
    return;
  }
  const head = `<tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`;
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("");
  container.innerHTML = `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

function importOperations(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }
  let imported = 0;
  rows.forEach((row) => {
    const type = textOrFallback(
      row.type || row.operation_type || row.rodzaj || row.operation,
      "Operacja gotówkowa"
    );
    const portfolioId = resolvePortfolio(row.portfolio || row.portfel || "");
    const accountId = resolveAccount(row.account || row.konto || "");
    const assetId = resolveAsset(row.asset || row.walor || row.ticker || "");
    const targetAssetId = resolveAsset(row.targetAsset || row.target_asset || row.walorDocelowy || "");

    const date = normalizeDate(row.date || row.data || todayIso());
    const currency = textOrFallback(row.currency || row.waluta, state.meta.baseCurrency);
    const quantity = toNum(row.quantity || row.ilosc);
    const targetQuantity = toNum(row.targetQuantity || row.iloscDocelowa);
    const price = toNum(row.price || row.cena);
    const amount = toNum(row.amount || row.kwota);
    const fee = toNum(row.fee || row.prowizja);
    const tags = toTags(row.tags || row.tagi);
    const note = row.note || row.notatka || "";

    state.operations.push({
      id: makeId("op"),
      date,
      type,
      portfolioId,
      accountId,
      assetId,
      targetAssetId,
      quantity,
      targetQuantity,
      price,
      amount,
      fee,
      currency,
      tags,
      note,
      createdAt: nowIso()
    });
    imported += 1;
  });
  return imported;
}

function parseDelimited(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    return [];
  }
  const delimiter = detectDelimiter(lines[0]);
  const headers = splitLine(lines[0], delimiter).map((header) => header.trim());
  const output = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitLine(lines[i], delimiter);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = cols[idx] != null ? cols[idx].trim() : "";
    });
    output.push(row);
  }
  return output;
}

function detectDelimiter(line) {
  const options = [",", ";", "\t", "|"];
  let best = ",";
  let bestCount = 0;
  options.forEach((option) => {
    const count = splitLine(line, option).length;
    if (count > bestCount) {
      best = option;
      bestCount = count;
    }
  });
  return best;
}

function splitLine(line, delimiter) {
  const out = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === delimiter && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  out.push(current);
  return out;
}

function resolvePortfolio(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return state.portfolios[0] ? state.portfolios[0].id : "";
  }
  const existing = state.portfolios.find(
    (portfolio) => portfolio.id === trimmed || portfolio.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (existing) {
    return existing.id;
  }
  if (!canAddPortfolio()) {
    return state.portfolios[0] ? state.portfolios[0].id : "";
  }
  const created = {
    id: makeId("ptf"),
    name: trimmed,
    currency: state.meta.baseCurrency,
    benchmark: "",
    goal: "",
    parentId: "",
    twinOf: "",
    groupName: "",
    isPublic: false,
    createdAt: nowIso()
  };
  state.portfolios.push(created);
  return created.id;
}

function resolveAccount(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return state.accounts[0] ? state.accounts[0].id : "";
  }
  const existing = state.accounts.find(
    (account) => account.id === trimmed || account.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (existing) {
    return existing.id;
  }
  const created = {
    id: makeId("acc"),
    name: trimmed,
    type: "Broker",
    currency: state.meta.baseCurrency,
    createdAt: nowIso()
  };
  state.accounts.push(created);
  return created.id;
}

function resolveAsset(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return "";
  }
  const existing = state.assets.find(
    (asset) =>
      asset.id === trimmed ||
      asset.ticker.toLowerCase() === trimmed.toLowerCase() ||
      asset.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (existing) {
    return existing.id;
  }
  const created = {
    id: makeId("ast"),
    ticker: trimmed.toUpperCase(),
    name: trimmed.toUpperCase(),
    type: "Inny",
    currency: state.meta.baseCurrency,
    currentPrice: 0,
    risk: 5,
    sector: "",
    industry: "",
    tags: [],
    benchmark: "",
    createdAt: nowIso()
  };
  state.assets.push(created);
  return created.id;
}

function removePortfolio(portfolioId) {
  if (!portfolioId) {
    return;
  }
  if (state.portfolios.length <= 1) {
    window.alert("Musi zostać co najmniej jeden portfel.");
    return;
  }
  const yes = window.confirm("Usunąć portfel i jego operacje?");
  if (!yes) {
    return;
  }
  if (editingState.portfolioId === portfolioId) {
    resetPortfolioForm();
  }
  if (
    editingState.recurringId &&
    state.recurringOps.some((item) => item.id === editingState.recurringId && item.portfolioId === portfolioId)
  ) {
    resetRecurringForm();
  }
  if (
    editingState.operationId &&
    state.operations.some((operation) => operation.id === editingState.operationId && operation.portfolioId === portfolioId)
  ) {
    resetOperationForm();
  }
  state.portfolios = state.portfolios.filter((portfolio) => portfolio.id !== portfolioId);
  state.portfolios.forEach((portfolio) => {
    if (portfolio.parentId === portfolioId) {
      portfolio.parentId = "";
    }
    if (portfolio.twinOf === portfolioId) {
      portfolio.twinOf = "";
    }
  });
  state.operations = state.operations.filter((operation) => operation.portfolioId !== portfolioId);
  state.recurringOps = state.recurringOps.filter((item) => item.portfolioId !== portfolioId);
  saveState();
  renderAll();
}

function copyPortfolio(portfolioId) {
  if (!canAddPortfolio()) {
    window.alert(
      `Nie możesz skopiować portfela. Plan ${state.meta.activePlan} ma limit ${currentPlanLimit().portfolios}.`
    );
    return;
  }
  const original = findById(state.portfolios, portfolioId);
  if (!original) {
    return;
  }
  const copy = {
    ...original,
    id: makeId("ptf"),
    name: `${original.name} (kopia)`,
    createdAt: nowIso()
  };
  state.portfolios.push(copy);
  state.operations
    .filter((operation) => operation.portfolioId === portfolioId)
    .forEach((operation) => {
      state.operations.push({
        ...operation,
        id: makeId("op"),
        portfolioId: copy.id,
        note: `${operation.note || ""} [kopia portfela]`.trim(),
        createdAt: nowIso()
      });
    });
  saveState();
  renderAll();
}

function exportPortfolio(portfolioId) {
  const portfolio = findById(state.portfolios, portfolioId);
  if (!portfolio) {
    return;
  }
  const payload = {
    version: 1,
    exportedAt: nowIso(),
    portfolio,
    operations: state.operations.filter((operation) => operation.portfolioId === portfolioId)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `portfolio-${slugify(portfolio.name)}-${todayIso()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function inferMinPlan(feature, category) {
  const label = (feature || "").toLowerCase();

  const expertKeywords = [
    "analiza fundamentalna",
    "analiza ryzyka",
    "zarządzanie ryzykiem",
    "analiza sektorowa",
    "analiza indeksowa",
    "mapa cieplna",
    "optymalizuj podatek",
    "podatek od kryptowalut",
    "forum spółek",
    "sygnały at"
  ];
  if (expertKeywords.some((keyword) => label.includes(keyword))) {
    return "Expert";
  }

  const proKeywords = [
    "alerty",
    "strategie",
    "notowania online",
    "komunikaty espi",
    "rekomendacje",
    "kalendarium",
    "rolling return",
    "drawdown",
    "podsumowania na e-mail"
  ];
  if (proKeywords.some((keyword) => label.includes(keyword))) {
    return "Pro";
  }

  const standardKeywords = [
    "import operacji z mail",
    "operacje cykliczne",
    "ranking",
    "porównanie",
    "ulubione",
    "subkonta",
    "zamknięte inwestycje",
    "kopiowanie portfela"
  ];
  if (standardKeywords.some((keyword) => label.includes(keyword))) {
    return "Standard";
  }

  if (category === "portfolio" && label.includes("portfeli grupowych")) {
    return "Basic";
  }
  if (category === "portfolio" && label.includes("portfeli bliźniaczych")) {
    return "Basic";
  }

  return "Basic";
}

function isFeatureAvailable(minPlan, activePlan) {
  return planRank(activePlan) >= planRank(minPlan);
}

function currentPlanLimit() {
  return PLAN_LIMITS[state.meta.activePlan] || PLAN_LIMITS.Basic;
}

function canAddPortfolio() {
  return state.portfolios.length < currentPlanLimit().portfolios;
}

function defaultState() {
  return {
    meta: {
      activePlan: "Expert",
      baseCurrency: "PLN",
      createdAt: nowIso()
    },
    portfolios: [
      {
        id: makeId("ptf"),
        name: "Główny",
        currency: "PLN",
        benchmark: "WIG20",
        goal: "Długoterminowy wzrost",
        parentId: "",
        twinOf: "",
        groupName: "",
        isPublic: false,
        createdAt: nowIso()
      }
    ],
    accounts: [
      {
        id: makeId("acc"),
        name: "Konto podstawowe",
        type: "Broker",
        currency: "PLN",
        createdAt: nowIso()
      }
    ],
    assets: [],
    operations: [],
    recurringOps: [],
    liabilities: [],
    alerts: [],
    notes: [],
    strategies: [],
    favorites: []
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState();
    }
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch (error) {
    return defaultState();
  }
}

function normalizeState(input) {
  const stateValue = input || {};
  const fallback = defaultState();
  const normalized = {
    meta: {
      activePlan: PLAN_ORDER.includes(stateValue.meta && stateValue.meta.activePlan)
        ? stateValue.meta.activePlan
        : fallback.meta.activePlan,
      baseCurrency: textOrFallback(stateValue.meta && stateValue.meta.baseCurrency, fallback.meta.baseCurrency),
      createdAt: (stateValue.meta && stateValue.meta.createdAt) || fallback.meta.createdAt
    },
    portfolios: Array.isArray(stateValue.portfolios) && stateValue.portfolios.length
      ? stateValue.portfolios.map((portfolio) => ({
          id: portfolio.id || makeId("ptf"),
          name: textOrFallback(portfolio.name, "Portfel"),
          currency: textOrFallback(portfolio.currency, fallback.meta.baseCurrency),
          benchmark: portfolio.benchmark || "",
          goal: portfolio.goal || "",
          parentId: portfolio.parentId || "",
          twinOf: portfolio.twinOf || "",
          groupName: portfolio.groupName || "",
          isPublic: Boolean(portfolio.isPublic),
          createdAt: portfolio.createdAt || nowIso()
        }))
      : fallback.portfolios,
    accounts: Array.isArray(stateValue.accounts) && stateValue.accounts.length
      ? stateValue.accounts.map((account) => ({
          id: account.id || makeId("acc"),
          name: textOrFallback(account.name, "Konto"),
          type: textOrFallback(account.type, "Broker"),
          currency: textOrFallback(account.currency, fallback.meta.baseCurrency),
          createdAt: account.createdAt || nowIso()
        }))
      : fallback.accounts,
    assets: Array.isArray(stateValue.assets)
      ? stateValue.assets.map((asset) => ({
          id: asset.id || makeId("ast"),
          ticker: textOrFallback(asset.ticker, "N/A").toUpperCase(),
          name: textOrFallback(asset.name, "Brak nazwy"),
          type: textOrFallback(asset.type, "Inny"),
          currency: textOrFallback(asset.currency, fallback.meta.baseCurrency),
          currentPrice: toNum(asset.currentPrice),
          risk: clamp(toNum(asset.risk) || 5, 1, 10),
          sector: asset.sector || "",
          industry: asset.industry || "",
          tags: Array.isArray(asset.tags) ? asset.tags : toTags(asset.tags),
          benchmark: asset.benchmark || "",
          createdAt: asset.createdAt || nowIso()
        }))
      : [],
    operations: Array.isArray(stateValue.operations)
      ? stateValue.operations.map((operation) => ({
          id: operation.id || makeId("op"),
          date: normalizeDate(operation.date || todayIso()),
          type: textOrFallback(operation.type, "Operacja gotówkowa"),
          portfolioId: operation.portfolioId || "",
          accountId: operation.accountId || "",
          assetId: operation.assetId || "",
          targetAssetId: operation.targetAssetId || "",
          quantity: toNum(operation.quantity),
          targetQuantity: toNum(operation.targetQuantity),
          price: toNum(operation.price),
          amount: toNum(operation.amount),
          fee: toNum(operation.fee),
          currency: textOrFallback(operation.currency, fallback.meta.baseCurrency),
          tags: Array.isArray(operation.tags) ? operation.tags : toTags(operation.tags),
          note: operation.note || "",
          createdAt: operation.createdAt || nowIso()
        }))
      : [],
    recurringOps: Array.isArray(stateValue.recurringOps)
      ? stateValue.recurringOps.map((item) => ({
          id: item.id || makeId("rec"),
          name: textOrFallback(item.name, "Operacja cykliczna"),
          type: textOrFallback(item.type, "Operacja gotówkowa"),
          frequency: textOrFallback(item.frequency, "monthly"),
          startDate: normalizeDate(item.startDate || todayIso()),
          amount: toNum(item.amount),
          portfolioId: item.portfolioId || "",
          accountId: item.accountId || "",
          assetId: item.assetId || "",
          currency: textOrFallback(item.currency, fallback.meta.baseCurrency),
          lastGeneratedDate: item.lastGeneratedDate || "",
          createdAt: item.createdAt || nowIso()
        }))
      : [],
    liabilities: Array.isArray(stateValue.liabilities)
      ? stateValue.liabilities.map((item) => ({
          id: item.id || makeId("liab"),
          name: textOrFallback(item.name, "Zobowiązanie"),
          amount: toNum(item.amount),
          currency: textOrFallback(item.currency, fallback.meta.baseCurrency),
          rate: toNum(item.rate),
          dueDate: item.dueDate || "",
          createdAt: item.createdAt || nowIso()
        }))
      : [],
    alerts: Array.isArray(stateValue.alerts)
      ? stateValue.alerts.map((item) => ({
          id: item.id || makeId("alt"),
          assetId: item.assetId || "",
          direction: item.direction === "lte" ? "lte" : "gte",
          targetPrice: toNum(item.targetPrice),
          createdAt: item.createdAt || nowIso(),
          lastTriggerAt: item.lastTriggerAt || ""
        }))
      : [],
    notes: Array.isArray(stateValue.notes)
      ? stateValue.notes.map((item) => ({
          id: item.id || makeId("note"),
          content: item.content || "",
          createdAt: item.createdAt || nowIso()
        }))
      : [],
    strategies: Array.isArray(stateValue.strategies)
      ? stateValue.strategies.map((item) => ({
          id: item.id || makeId("str"),
          name: textOrFallback(item.name, "Strategia"),
          description: item.description || "",
          createdAt: item.createdAt || nowIso()
        }))
      : [],
    favorites: Array.isArray(stateValue.favorites) ? stateValue.favorites : []
  };
  if (!normalized.portfolios.length) {
    normalized.portfolios = fallback.portfolios;
  }
  if (!normalized.accounts.length) {
    normalized.accounts = fallback.accounts;
  }
  return normalized;
}

function saveState(options = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (!options.skipBackend) {
    scheduleBackendPush();
  }
}

function fillSelect(select, options, includeEmpty = false) {
  if (!select) {
    return;
  }
  const previous = select.value;
  const normalized = includeEmpty ? [{ value: "", label: "Wszystkie" }].concat(options) : options;
  select.innerHTML = normalized
    .map((item) => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`)
    .join("");
  if (normalized.some((item) => item.value === previous)) {
    select.value = previous;
  } else if (normalized.length) {
    select.value = normalized[0].value;
  }
}

function formToObject(form) {
  const data = new FormData(form);
  const output = {};
  for (const [key, value] of data.entries()) {
    output[key] = value;
  }
  const checkboxInputs = form.querySelectorAll('input[type="checkbox"]');
  checkboxInputs.forEach((input) => {
    output[input.name] = input.checked;
  });
  return output;
}

function findById(collection, id) {
  return collection.find((item) => item.id === id);
}

function lookupName(collection, id) {
  const found = collection.find((item) => item.id === id);
  return found ? found.name : "N/D";
}

function lookupAssetLabel(assetId) {
  if (!assetId) {
    return "-";
  }
  const asset = findById(state.assets, assetId);
  if (!asset) {
    return "Usunięty walor";
  }
  return `${asset.ticker} - ${asset.name}`;
}

function makeId(prefix) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${random}`;
}

function toNum(value) {
  if (typeof value === "number") {
    if (Number.isFinite(value)) {
      return value;
    }
    return 0;
  }
  const normalized = String(value || "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function toTags(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeDate(value) {
  if (!value) {
    return todayIso();
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }
  const date = new Date(text);
  if (!Number.isFinite(date.getTime())) {
    return todayIso();
  }
  return date.toISOString().slice(0, 10);
}

function formatMoney(value, currency = state.meta.baseCurrency) {
  const safeValue = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency,
      maximumFractionDigits: 2
    }).format(safeValue);
  } catch (error) {
    return `${safeValue.toFixed(2)} ${currency}`;
  }
}

function formatFloat(value) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  }).format(safeValue);
}

function planRank(plan) {
  return PLAN_ORDER.indexOf(plan);
}

function nowIso() {
  return new Date().toISOString();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "";
  }
  return date.toLocaleString("pl-PL");
}

function textOrFallback(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

function nextOccurrence(date, frequency) {
  const value = new Date(`${date}T00:00:00`);
  if (!Number.isFinite(value.getTime())) {
    return todayIso();
  }
  if (frequency === "weekly") {
    value.setDate(value.getDate() + 7);
  } else if (frequency === "quarterly") {
    value.setMonth(value.getMonth() + 3);
  } else {
    value.setMonth(value.getMonth() + 1);
  }
  return value.toISOString().slice(0, 10);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sum(values) {
  return values.reduce((acc, value) => acc + toNum(value), 0);
}

function average(values) {
  if (!values.length) {
    return 0;
  }
  return sum(values) / values.length;
}

function stddev(values) {
  if (!values.length) {
    return 0;
  }
  const avg = average(values);
  const variance = average(values.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance);
}

function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});
}

function emptyChart() {
  return { labels: [], values: [], color: "#0e7a64" };
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function stripMoney(value) {
  return String(value || "").replace(/[^\d,\-]/g, "").replace(",", ".");
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

if (typeof globalThis !== "undefined" && globalThis.__MYFUND_ENABLE_TEST_HOOKS__) {
  globalThis.__MYFUND_TEST__ = {
    setState(nextState) {
      state = normalizeState(nextState);
    },
    getState() {
      return state;
    },
    setDom(partialDom) {
      Object.assign(dom, partialDom || {});
    },
    getEditingState() {
      return { ...editingState };
    },
    disableRendering() {
      renderAll = () => {};
      renderRecurring = () => {};
      renderAlerts = () => {};
      renderLiabilities = () => {};
      renderDashboard = () => {};
    },
    startRecurringEdit,
    startAlertEdit,
    startLiabilityEdit,
    onRecurringSubmit,
    onAlertSubmit,
    onLiabilitySubmit,
    onActionClick,
    syncEditingForms
  };
}
