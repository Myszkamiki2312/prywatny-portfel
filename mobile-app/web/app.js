"use strict";

const STORAGE_KEY = "prywatny-portfel-state-v1";
const LEGACY_STORAGE_KEYS = ["myfund-solo-state-v1"];
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

const LINE_CHART_RANGES = [
  { key: "30", days: 30 },
  { key: "90", days: 90 },
  { key: "180", days: 180 },
  { key: "365", days: 365 },
  { key: "all", days: null }
];

const APPEARANCE_DEFAULTS = {
  theme: "forest",
  lastLightTheme: "forest",
  iconSet: "classic",
  fontScale: "comfortable"
};

const APPEARANCE_THEMES = {
  forest: {
    label: "Leśny klasyk",
    description: "Spokojny zielony motyw do codziennej pracy nad portfelem.",
    swatches: ["#0e7a64", "#ff7f32", "#f3f6f1"]
  },
  midnight: {
    label: "Giełdowa noc",
    description: "Ciemny, kontrastowy układ pod dłuższe sesje i wykresy.",
    swatches: ["#7ad8c7", "#f5b24d", "#0d1319"]
  },
  gold: {
    label: "Złoty parkiet",
    description: "Jaśniejsza skórka z mocniejszym akcentem premium i ciepłą typografią.",
    swatches: ["#c69212", "#2146c7", "#f7f0dd"]
  },
  ice: {
    label: "Polarna sesja",
    description: "Chłodny, czysty interfejs z dobrą czytelnością tabel i raportów.",
    swatches: ["#2a7ab6", "#ff9152", "#eef5fb"]
  }
};

const APPEARANCE_ICON_SETS = {
  minimal: {
    label: "Minimalne",
    description: "Lekkie, spokojne znaki bez wizualnego szumu.",
    icons: {
      dashboard: "◌",
      portfolios: "▤",
      accounts: "◫",
      operations: "↻",
      reports: "◔",
      tools: "✦",
      appearance: "◐",
      features: "▦"
    }
  },
  classic: {
    label: "Klasyczne",
    description: "Bardziej wyraźne ikony do codziennej pracy na desktopie.",
    icons: {
      dashboard: "◎",
      portfolios: "▥",
      accounts: "⌘",
      operations: "⇄",
      reports: "◉",
      tools: "✶",
      appearance: "✺",
      features: "▧"
    }
  },
  market: {
    label: "Giełdowe",
    description: "Mocniejszy, bardziej techniczny zestaw pod raporty i analitykę.",
    icons: {
      dashboard: "◈",
      portfolios: "▣",
      accounts: "⌬",
      operations: "⇆",
      reports: "◪",
      tools: "✹",
      appearance: "✷",
      features: "▩"
    }
  }
};

const APPEARANCE_FONT_SCALES = {
  compact: {
    label: "Kompaktowa",
    description: "Więcej danych na ekranie, ciaśniejszy rytm interfejsu.",
    rootPx: 15
  },
  comfortable: {
    label: "Podstawowa",
    description: "Najbardziej zbalansowany układ do codziennej pracy.",
    rootPx: 16
  },
  large: {
    label: "Duża",
    description: "Wygodniejszy tekst i większe elementy klikalne.",
    rootPx: 17.5
  }
};

let state = loadState();
const dom = {};
const backendSync = {
  available: false,
  checked: false,
  pushTimer: 0,
  pushInFlight: false,
  fxSyncTimer: 0,
  fxSyncInFlight: false,
  suspendPush: false,
  reportRequestSeq: 0,
  metricsTimer: 0,
  metricsRequestSeq: 0,
  healthProbe: null,
  resizeTimer: 0
};
const candlesView = {
  all: [],
  start: 0,
  end: 0,
  ticker: "",
  signal: "",
  indicators: {}
};
const lineChartViews = {
  dashboard: {
    rangeKey: "all",
    mode: "value",
    manualViewport: null,
    historySeries: [],
    historySummary: null,
    historyKey: "",
    historyLoading: false,
    historyResolvedKey: "",
    comparisonSeries: [],
    comparisonKey: "",
    comparisonLoading: false,
    comparisonResolvedKey: ""
  },
  report: {
    rangeKey: "all",
    mode: "value",
    manualViewport: null,
    comparisonSeries: [],
    comparisonKey: ""
  }
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
const uiModules = {
  dashboard: null,
  operations: null,
  tools: null
};
const clientErrorTracker = {
  bound: false,
  recent: new Map(),
  ttlMs: 15000
};

document.addEventListener("DOMContentLoaded", () => {
  void init().catch((error) => {
    console.error("Błąd inicjalizacji aplikacji.", error);
    window.alert("Nie udało się uruchomić aplikacji. Sprawdź konsolę przeglądarki.");
  });
});

async function init() {
  await loadUiModules();
  setupGlobalErrorReporting();
  cacheDom();
  applyAppearanceSettings();
  seedStaticSelects();
  bindEvents();
  resetOperationForm();
  await hydrateFromBackend();
  renderAll();
}

async function loadUiModules() {
  const [dashboardModule, operationsModule, toolsModule] = await Promise.all([
    import("./frontend/dashboard.js"),
    import("./frontend/operations.js"),
    import("./frontend/tools.js")
  ]);
  uiModules.dashboard = dashboardModule;
  uiModules.operations = operationsModule;
  uiModules.tools = toolsModule;
}

function cacheDom() {
  dom.tabs = document.getElementById("tabs");
  dom.planSelect = document.getElementById("planSelect");
  dom.baseCurrencySelect = document.getElementById("baseCurrencySelect");
  dom.themeToggleBtn = document.getElementById("themeToggleBtn");
  dom.exportBackupBtn = document.getElementById("exportBackupBtn");
  dom.importBackupInput = document.getElementById("importBackupInput");
  dom.resetStateBtn = document.getElementById("resetStateBtn");
  dom.refreshQuotesBtn = document.getElementById("refreshQuotesBtn");
  dom.backendStatus = document.getElementById("backendStatus");

  dom.dashboardPortfolioSelect = document.getElementById("dashboardPortfolioSelect");
  dom.dashboardInflationEnabled = document.getElementById("dashboardInflationEnabled");
  dom.dashboardInflationRateInput = document.getElementById("dashboardInflationRateInput");
  dom.statMarketValue = document.getElementById("statMarketValue");
  dom.statCash = document.getElementById("statCash");
  dom.statNetWorth = document.getElementById("statNetWorth");
  dom.statTotalPl = document.getElementById("statTotalPl");
  dom.statDailyChangePct = document.getElementById("statDailyChangePct");
  dom.statDailyChangeValue = document.getElementById("statDailyChangeValue");
  dom.statMonthlyChangePct = document.getElementById("statMonthlyChangePct");
  dom.statMonthlyChangeValue = document.getElementById("statMonthlyChangeValue");
  dom.statYearlyChangePct = document.getElementById("statYearlyChangePct");
  dom.statYearlyChangeValue = document.getElementById("statYearlyChangeValue");
  dom.dashboardChart = document.getElementById("dashboardChart");
  dom.dashboardChartRangeControls = document.getElementById("dashboardChartRangeControls");
  dom.dashboardChartModeControls = document.getElementById("dashboardChartModeControls");
  dom.dashboardChartRangeInfo = document.getElementById("dashboardChartRangeInfo");
  dom.dashboardChartResetZoomBtn = document.getElementById("dashboardChartResetZoomBtn");
  dom.dashboardChartExportBtn = document.getElementById("dashboardChartExportBtn");
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
  dom.operationHistorySearchInput = document.getElementById("operationHistorySearchInput");
  dom.operationHistoryDateFromInput = document.getElementById("operationHistoryDateFromInput");
  dom.operationHistoryDateToInput = document.getElementById("operationHistoryDateToInput");
  dom.operationHistoryTypeSelect = document.getElementById("operationHistoryTypeSelect");
  dom.operationHistoryPortfolioSelect = document.getElementById("operationHistoryPortfolioSelect");
  dom.operationHistoryAccountSelect = document.getElementById("operationHistoryAccountSelect");
  dom.operationHistoryAmountMinInput = document.getElementById("operationHistoryAmountMinInput");
  dom.operationHistoryAmountMaxInput = document.getElementById("operationHistoryAmountMaxInput");
  dom.operationHistoryResetBtn = document.getElementById("operationHistoryResetBtn");
  dom.operationHistoryInfo = document.getElementById("operationHistoryInfo");
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
  dom.reportChartRangeControls = document.getElementById("reportChartRangeControls");
  dom.reportChartModeControls = document.getElementById("reportChartModeControls");
  dom.reportChartRangeInfo = document.getElementById("reportChartRangeInfo");
  dom.reportChartResetZoomBtn = document.getElementById("reportChartResetZoomBtn");
  dom.reportChartExportBtn = document.getElementById("reportChartExportBtn");

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
  dom.refreshHealthcheckBtn = document.getElementById("refreshHealthcheckBtn");
  dom.healthcheckInfo = document.getElementById("healthcheckInfo");
  dom.healthcheckTable = document.getElementById("healthcheckTable");
  dom.refreshErrorLogsBtn = document.getElementById("refreshErrorLogsBtn");
  dom.clearErrorLogsBtn = document.getElementById("clearErrorLogsBtn");
  dom.errorLogsInfo = document.getElementById("errorLogsInfo");
  dom.errorLogsTable = document.getElementById("errorLogsTable");
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
  dom.candlesChartExportBtn = document.getElementById("candlesChartExportBtn");
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
  dom.appearanceThemeGrid = document.getElementById("appearanceThemeGrid");
  dom.appearanceIconGrid = document.getElementById("appearanceIconGrid");
  dom.appearanceFontGrid = document.getElementById("appearanceFontGrid");
  dom.appearanceSummary = document.getElementById("appearanceSummary");
  dom.appearancePreview = document.getElementById("appearancePreview");
  dom.appearanceResetBtn = document.getElementById("appearanceResetBtn");
}

function seedStaticSelects() {
  fillSelect(dom.planSelect, PLAN_ORDER.map((plan) => ({ value: plan, label: plan })));
  fillSelect(dom.reportSelect, REPORT_FEATURES.map((item) => ({ value: item, label: item })));
  fillSelect(
    dom.operationTypeSelect,
    OPERATION_TYPES.map((type) => ({ value: type, label: type }))
  );
  fillSelect(
    dom.operationHistoryTypeSelect,
    OPERATION_TYPES.map((type) => ({ value: type, label: type })),
    true
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
  if (dom.themeToggleBtn) {
    dom.themeToggleBtn.addEventListener("click", onThemeToggle);
  }
  if (dom.appearanceThemeGrid) {
    dom.appearanceThemeGrid.addEventListener("click", onAppearanceThemeClick);
  }
  if (dom.appearanceIconGrid) {
    dom.appearanceIconGrid.addEventListener("click", onAppearanceIconClick);
  }
  if (dom.appearanceFontGrid) {
    dom.appearanceFontGrid.addEventListener("click", onAppearanceFontScaleClick);
  }
  if (dom.appearanceResetBtn) {
    dom.appearanceResetBtn.addEventListener("click", onAppearanceReset);
  }
  dom.dashboardPortfolioSelect.addEventListener("change", renderDashboard);
  if (dom.dashboardInflationEnabled) {
    dom.dashboardInflationEnabled.addEventListener("change", onDashboardInflationChange);
  }
  if (dom.dashboardInflationRateInput) {
    dom.dashboardInflationRateInput.addEventListener("input", onDashboardInflationChange);
    dom.dashboardInflationRateInput.addEventListener("change", onDashboardInflationChange);
  }
  dom.reportPortfolioSelect.addEventListener("change", renderReportCurrent);
  window.addEventListener("resize", scheduleResponsiveChartRefresh);
  bindLineChartRangeControls("dashboard", dom.dashboardChartRangeControls, () => {
    renderDashboard();
  });
  bindLineChartModeControls("dashboard", dom.dashboardChartModeControls, () => {
    renderDashboard();
  });
  bindLineChartRangeControls("report", dom.reportChartRangeControls, () => {
    void renderReportCurrent({ force: true });
  });
  bindLineChartModeControls("report", dom.reportChartModeControls, () => {
    void renderReportCurrent({ force: true });
  });

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
  dom.operationHistorySearchInput.addEventListener("input", renderOperations);
  dom.operationHistoryDateFromInput.addEventListener("change", renderOperations);
  dom.operationHistoryDateToInput.addEventListener("change", renderOperations);
  dom.operationHistoryTypeSelect.addEventListener("change", renderOperations);
  dom.operationHistoryPortfolioSelect.addEventListener("change", renderOperations);
  dom.operationHistoryAccountSelect.addEventListener("change", renderOperations);
  dom.operationHistoryAmountMinInput.addEventListener("input", renderOperations);
  dom.operationHistoryAmountMaxInput.addEventListener("input", renderOperations);
  dom.operationHistoryResetBtn.addEventListener("click", () => {
    resetOperationHistoryFilters();
    renderOperations();
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
  dom.dashboardChartExportBtn.addEventListener("click", (event) => {
    event.preventDefault();
    exportCanvasAsPng(dom.dashboardChart, `prywatny-portfel-kokpit-${todayIso()}.png`);
  });
  dom.dashboardChartResetZoomBtn.addEventListener("click", (event) => {
    event.preventDefault();
    clearLineChartManualViewport("dashboard");
    renderDashboard();
  });
  dom.reportChartExportBtn.addEventListener("click", (event) => {
    event.preventDefault();
    exportCanvasAsPng(dom.reportChart, `prywatny-portfel-raport-${todayIso()}.png`);
  });
  dom.reportChartResetZoomBtn.addEventListener("click", (event) => {
    event.preventDefault();
    clearLineChartManualViewport("report");
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
  dom.refreshHealthcheckBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void refreshHealthcheck();
  });
  dom.refreshErrorLogsBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void refreshErrorLogs();
  });
  dom.clearErrorLogsBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void clearErrorLogsNow();
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
  dom.candlesChartExportBtn.addEventListener("click", (event) => {
    event.preventDefault();
    exportCanvasAsPng(dom.candlesChart, `prywatny-portfel-swiece-${todayIso()}.png`);
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
    await refreshHealthcheck({ silent: true });
    await refreshErrorLogs({ silent: true });
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
    applyFxRates(payload.fxRates || extractFxRatesFromQuotes(quotes));
    saveState({ skipBackend: true });
    renderAll();
    window.alert(
      `Zaktualizowano notowania: ${quotes.length} walorów.${payload.fxUpdated ? ` Kursy FX: ${payload.fxUpdated}.` : ""}`
    );
  } catch (error) {
    backendSync.available = false;
    updateBackendStatus();
    window.alert("Nie udało się odświeżyć notowań z backendu.");
  } finally {
    backendSync.pushInFlight = false;
    updateBackendStatus();
  }
}

function scheduleFxRefresh() {
  if (!backendSync.available || backendSync.suspendPush) {
    return;
  }
  const fxTickers = requiredFxQuoteTickers();
  const assetTickers = state.assets.map((asset) => String(asset.ticker || "").trim()).filter(Boolean);
  if (!fxTickers.length && !assetTickers.length) {
    return;
  }
  if (backendSync.fxSyncTimer) {
    window.clearTimeout(backendSync.fxSyncTimer);
  }
  backendSync.fxSyncTimer = window.setTimeout(() => {
    void refreshQuotesAndFxSilently();
  }, 420);
}

async function refreshQuotesAndFxSilently() {
  if (!backendSync.available || backendSync.pushInFlight || backendSync.fxSyncInFlight) {
    return;
  }
  const tickers = state.assets.map((asset) => String(asset.ticker || "").trim()).filter(Boolean);
  const fxTickers = requiredFxQuoteTickers();
  if (!tickers.length && !fxTickers.length) {
    return;
  }
  backendSync.fxSyncInFlight = true;
  try {
    await apiRequest("/state", {
      method: "PUT",
      body: { state },
      timeoutMs: 10000
    });
    const payload = await apiRequest("/quotes/refresh", {
      method: "POST",
      body: { tickers },
      timeoutMs: 10000
    });
    const quotes = Array.isArray(payload.quotes) ? payload.quotes : [];
    applyQuotes(quotes);
    applyFxRates(payload.fxRates || extractFxRatesFromQuotes(quotes));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderAll();
  } catch (error) {
    // Silent fallback. The manual refresh button still remains available.
  } finally {
    backendSync.fxSyncInFlight = false;
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
    if (!ticker || normalizeFxPairKey(ticker)) {
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

function applyFxRates(rates) {
  const merged = { ...normalizeFxRates(state.meta.fxRates), ...normalizeFxRates(rates) };
  state.meta.fxRates = merged;
}

async function pullQuotesFromBackend() {
  if (!backendSync.available || !state.assets.length) {
    return;
  }
  const tickers = state.assets.map((asset) => asset.ticker).filter(Boolean);
  const requestTickers = tickers.concat(requiredFxQuoteTickers()).filter((ticker, index, array) => array.indexOf(ticker) === index);
  if (!tickers.length) {
    return;
  }
  try {
    const payload = await apiRequest(`/quotes?tickers=${encodeURIComponent(requestTickers.join(","))}`, {
      timeoutMs: 3500
    });
    const quotes = Array.isArray(payload.quotes) ? payload.quotes : [];
    if (!quotes.length) {
      return;
    }
    applyQuotes(quotes);
    applyFxRates(extractFxRatesFromQuotes(quotes));
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

function shouldUseBackendMetrics(localMetrics, backendMetrics) {
  const local = localMetrics || {};
  const backend = backendMetrics || {};
  const localMarketValue = toNum(local.marketValue);
  const backendMarketValue = toNum(backend.marketValue);
  const hasLocalHoldings = Array.isArray(local.holdings) && local.holdings.length > 0;
  if (hasLocalHoldings && localMarketValue > 0 && backendMarketValue <= 0) {
    return false;
  }
  return true;
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
    const localMetrics = computeMetrics(portfolioId || "");
    if (!shouldUseBackendMetrics(localMetrics, metrics)) {
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

function toolsModuleDeps() {
  return {
    dom,
    state,
    getState: () => state,
    setState: (next) => {
      state = next;
    },
    backendSync,
    formToObject,
    toNum,
    textOrFallback,
    apiRequest,
    localScanner,
    localSignals,
    localCalendar,
    localRecommendations,
    localAlertWorkflow,
    localAlertHistory,
    renderScannerRows,
    renderSignalsRows,
    renderCalendarRows,
    renderRecommendationsRows,
    renderAlerts,
    renderAlertWorkflowRows,
    updateBackendStatus,
    formatMoney,
    normalizeState,
    saveState,
    windowRef: window
  };
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
  await refreshHealthcheck({ silent: true });
  await refreshErrorLogs({ silent: true });
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
  if (uiModules.tools && typeof uiModules.tools.toolsPortfolioId === "function") {
    return uiModules.tools.toolsPortfolioId(toolsModuleDeps());
  }
  return dom.toolsPortfolioSelect ? dom.toolsPortfolioSelect.value || "" : "";
}

function scannerFiltersFromForm() {
  if (uiModules.tools && typeof uiModules.tools.scannerFiltersFromForm === "function") {
    return uiModules.tools.scannerFiltersFromForm(toolsModuleDeps());
  }
  return {
    minScore: 0,
    maxRisk: 10,
    sector: "",
    minPrice: 0
  };
}

async function runScanner(options = {}) {
  if (uiModules.tools && typeof uiModules.tools.runScanner === "function") {
    await uiModules.tools.runScanner(toolsModuleDeps(), options);
    return;
  }
  const filters = scannerFiltersFromForm();
  filters.portfolioId = toolsPortfolioId();
  const items = localScanner(filters);
  renderScannerRows(items);
}

async function refreshSignals(options = {}) {
  if (uiModules.tools && typeof uiModules.tools.refreshSignals === "function") {
    await uiModules.tools.refreshSignals(toolsModuleDeps(), options);
    return;
  }
  renderSignalsRows(localSignals(toolsPortfolioId()));
}

async function refreshCalendar(options = {}) {
  if (uiModules.tools && typeof uiModules.tools.refreshCalendar === "function") {
    await uiModules.tools.refreshCalendar(toolsModuleDeps(), options);
    return;
  }
  renderCalendarRows(localCalendar(60, toolsPortfolioId()));
}

async function refreshRecommendations(options = {}) {
  if (uiModules.tools && typeof uiModules.tools.refreshRecommendations === "function") {
    await uiModules.tools.refreshRecommendations(toolsModuleDeps(), options);
    return;
  }
  renderRecommendationsRows(localRecommendations(toolsPortfolioId()));
}

async function runAlertWorkflow(options = {}) {
  if (uiModules.tools && typeof uiModules.tools.runAlertWorkflow === "function") {
    return uiModules.tools.runAlertWorkflow(toolsModuleDeps(), options);
  }
  const payload = localAlertWorkflow();
  renderAlerts();
  renderAlertWorkflowRows(payload.history || []);
  return {
    triggeredLabels: (payload.triggered || []).map(
      (row) => `${row.ticker} (${formatMoney(toNum(row.currentPrice), row.currency || state.meta.baseCurrency)})`
    )
  };
}

async function refreshAlertHistory(options = {}) {
  if (uiModules.tools && typeof uiModules.tools.refreshAlertHistory === "function") {
    await uiModules.tools.refreshAlertHistory(toolsModuleDeps(), options);
    return;
  }
  renderAlertWorkflowRows(localAlertHistory());
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

async function refreshHealthcheck(options = {}) {
  const silent = Boolean(options.silent);
  if (!backendSync.available) {
    return;
  }
  try {
    const payload = await apiRequest("/tools/healthcheck", { timeoutMs: 8000 });
    renderHealthcheckStatus(payload || {});
  } catch (error) {
    if (!silent) {
      window.alert("Nie udało się pobrać healthcheck.");
    }
  }
}

function renderHealthcheckStatus(payload) {
  if (!payload || typeof payload !== "object") {
    renderTable(dom.healthcheckTable, ["Check", "Status", "Szczegóły"], []);
    return;
  }
  const checks = Array.isArray(payload.checks) ? payload.checks : [];
  const rows = checks.map((item) => {
    const status = String(item.status || "-").toLowerCase();
    const badge =
      status === "ok"
        ? '<span class="badge ok">OK</span>'
        : status === "warn"
          ? '<span class="badge off">WARN</span>'
          : '<span class="badge off">ERROR</span>';
    return [escapeHtml(item.key || "-"), badge, escapeHtml(item.message || "-")];
  });
  renderTable(dom.healthcheckTable, ["Check", "Status", "Szczegóły"], rows);
  if (dom.healthcheckInfo) {
    const overall = String(payload.status || "unknown").toLowerCase();
    dom.healthcheckInfo.textContent = `Healthcheck: ${overall.toUpperCase()} | ${checks.length} checków`;
  }
}

async function refreshErrorLogs(options = {}) {
  const silent = Boolean(options.silent);
  if (!backendSync.available) {
    return;
  }
  try {
    const payload = await apiRequest("/tools/errors?limit=120", { timeoutMs: 9000 });
    const logs = Array.isArray(payload.logs) ? payload.logs : [];
    renderErrorLogsRows(logs);
  } catch (error) {
    if (!silent) {
      window.alert("Nie udało się pobrać logów błędów.");
    }
  }
}

async function clearErrorLogsNow() {
  if (!backendSync.available) {
    window.alert("Backend offline. Czyszczenie logów niedostępne.");
    return;
  }
  const confirmed = window.confirm("Usunąć wszystkie logi błędów?");
  if (!confirmed) {
    return;
  }
  try {
    const payload = await apiRequest("/tools/errors/clear", {
      method: "POST",
      body: { keepLast: 0 },
      timeoutMs: 7000
    });
    if (dom.errorLogsInfo) {
      dom.errorLogsInfo.textContent = `Wyczyszczono logi: ${toNum(payload.deleted)}.`;
    }
    await refreshErrorLogs({ silent: true });
  } catch (error) {
    window.alert(`Nie udało się wyczyścić logów: ${error.message}`);
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
  const errors = payload.errors || {};
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
    ["Błędy (ostatnia godzina)", String(toNum(errors.lastHour))],
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
    }, backup ${backupLast.status || "-"}, errors/h ${toNum(errors.lastHour)}`;
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

function renderErrorLogsRows(items) {
  const rows = (items || []).map((item) => [
    escapeHtml(formatDateTime(item.createdAt) || item.createdAt || "-"),
    escapeHtml(item.source || "-"),
    escapeHtml((item.level || "-").toUpperCase()),
    escapeHtml(item.method || "-"),
    escapeHtml(item.path || "-"),
    escapeHtml(item.message || "-")
  ]);
  renderTable(dom.errorLogsTable, ["Czas", "Źródło", "Poziom", "Metoda", "Ścieżka", "Komunikat"], rows);
  if (dom.errorLogsInfo) {
    dom.errorLogsInfo.textContent = `Logi błędów: ${rows.length}`;
  }
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

function bindLineChartRangeControls(chartKey, container, rerender) {
  if (!container) {
    return;
  }
  container.addEventListener("click", (event) => {
    const button = event.target.closest("[data-range-key]");
    if (!button) {
      return;
    }
    event.preventDefault();
    const nextRangeKey = normalizeLineChartRange(button.dataset.rangeKey);
    if (!lineChartViews[chartKey] || lineChartViews[chartKey].rangeKey === nextRangeKey) {
      return;
    }
    lineChartViews[chartKey].rangeKey = nextRangeKey;
    clearLineChartManualViewport(chartKey);
    rerender();
  });
}

function bindLineChartModeControls(chartKey, container, rerender) {
  if (!container) {
    return;
  }
  container.addEventListener("click", (event) => {
    const button = event.target.closest("[data-chart-mode]");
    if (!button) {
      return;
    }
    event.preventDefault();
    const nextMode = normalizeLineChartMode(button.dataset.chartMode);
    if (!lineChartViews[chartKey] || lineChartViews[chartKey].mode === nextMode) {
      return;
    }
    lineChartViews[chartKey].mode = nextMode;
    rerender();
  });
}

function normalizeLineChartRange(rangeKey) {
  const value = String(rangeKey || "all").trim().toLowerCase();
  return LINE_CHART_RANGES.some((item) => item.key === value) ? value : "all";
}

function normalizeLineChartMode(mode) {
  return String(mode || "value").trim().toLowerCase() === "return" ? "return" : "value";
}

function getLineChartRangeDays(rangeKey) {
  const match = LINE_CHART_RANGES.find((item) => item.key === normalizeLineChartRange(rangeKey));
  return match ? match.days : null;
}

function clearLineChartManualViewport(chartKey) {
  if (lineChartViews[chartKey]) {
    lineChartViews[chartKey].manualViewport = null;
  }
}

function setLineChartManualViewport(chartKey, startIndex, endIndex, totalPoints) {
  if (!lineChartViews[chartKey] || totalPoints < 2) {
    return false;
  }
  const start = Math.max(0, Math.min(startIndex, endIndex));
  const end = Math.min(totalPoints, Math.max(startIndex, endIndex) + 1);
  if (end - start < 2 || end - start >= totalPoints) {
    clearLineChartManualViewport(chartKey);
    return false;
  }
  lineChartViews[chartKey].manualViewport = { start, end };
  return true;
}

function panLineChartViewport(chartKey, deltaPoints, originViewport, totalPoints) {
  if (!lineChartViews[chartKey] || !originViewport || totalPoints < 2) {
    return false;
  }
  const span = Math.max(2, originViewport.end - originViewport.start);
  if (span >= totalPoints) {
    clearLineChartManualViewport(chartKey);
    return false;
  }
  const maxStart = Math.max(0, totalPoints - span);
  const start = Math.max(0, Math.min(maxStart, originViewport.start + deltaPoints));
  const end = start + span;
  const current = lineChartViews[chartKey].manualViewport;
  if (current && current.start === start && current.end === end) {
    return false;
  }
  lineChartViews[chartKey].manualViewport = { start, end };
  return true;
}

function toChartNumOrNull(value) {
  if (value == null || value === "") {
    return null;
  }
  const normalized = toNum(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function stripMarkup(value) {
  return String(value || "").replace(/<[^>]*>/g, "").trim();
}

function parseChartCellNumber(value) {
  const stripped = stripMarkup(value).replace(/[%]/g, "");
  return toChartNumOrNull(stripped);
}

function parseLineChartDateLabel(label) {
  const text = String(label || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }
  const parsed = new Date(`${text}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatLineChartRangeInfo(visiblePoints, allPoints, usesDates) {
  if (!visiblePoints.length || !allPoints.length) {
    return "Brak danych do wykresu.";
  }
  if (usesDates) {
    return `Zakres: ${formatLineChartAxisLabel(visiblePoints[0].label)} -> ${formatLineChartAxisLabel(
      visiblePoints[visiblePoints.length - 1].label
    )} | ${visiblePoints.length}/${allPoints.length} pkt`;
  }
  return `Widok: ${visiblePoints.length}/${allPoints.length} pkt`;
}

function sliceLineChartSeriesByRange(labels, values, rangeKey) {
  const normalizedRangeKey = normalizeLineChartRange(rangeKey);
  const points = (values || []).map((value, index) => ({
    label: labels[index] || "",
    value: toChartNumOrNull(value),
    parsedDate: parseLineChartDateLabel(labels[index] || "")
  }));
  if (!points.length) {
    return {
      labels: [],
      values: [],
      rangeKey: normalizedRangeKey,
      info: "Brak danych do wykresu.",
      startIndex: 0,
      endIndex: 0,
      totalPoints: 0,
      usesDates: false
    };
  }

  const rangeDays = getLineChartRangeDays(normalizedRangeKey);
  let visiblePoints = points.slice();
  let startIndex = 0;
  const allHaveDates = points.every((point) => point.parsedDate instanceof Date);
  if (rangeDays) {
    if (allHaveDates) {
      const lastDate = points[points.length - 1].parsedDate;
      const threshold = new Date(lastDate.getTime());
      threshold.setDate(threshold.getDate() - rangeDays + 1);
      startIndex = points.findIndex((point) => point.parsedDate >= threshold);
      if (startIndex < 0) {
        startIndex = Math.max(0, points.length - 2);
      }
      visiblePoints = points.slice(startIndex);
    } else {
      startIndex = Math.max(0, points.length - Math.min(points.length, rangeDays));
      visiblePoints = points.slice(startIndex);
    }
    if (points.length > 1 && visiblePoints.length < 2) {
      startIndex = Math.max(0, points.length - Math.min(points.length, 2));
      visiblePoints = points.slice(-Math.min(points.length, 2));
    }
  }

  return {
    labels: visiblePoints.map((point) => point.label),
    values: visiblePoints.map((point) => point.value),
    rangeKey: normalizedRangeKey,
    info: formatLineChartRangeInfo(visiblePoints, points, allHaveDates),
    startIndex,
    endIndex: startIndex + visiblePoints.length,
    totalPoints: points.length,
    usesDates: allHaveDates
  };
}

function computeReturnSeries(values) {
  const numericValues = values.map((value) => toChartNumOrNull(value));
  const base = numericValues.find((value) => value != null && value !== 0) ?? numericValues.find((value) => value != null) ?? 0;
  if (!base) {
    return numericValues.map(() => 0);
  }
  return numericValues.map((value) => {
    if (value == null) {
      return null;
    }
    return ((value - base) / Math.abs(base)) * 100;
  });
}

function comparisonSeriesWindow(series, rangeStart, rangeEnd, viewportStart, viewportEnd, mode) {
  const values = Array.isArray(series.values) ? series.values : [];
  const rangedValues = values.slice(rangeStart, rangeEnd);
  const viewportValues = rangedValues.slice(viewportStart, viewportEnd);
  return {
    name: series.name || "Porównanie",
    color: series.color || "#ff7f32",
    dash: Array.isArray(series.dash) ? series.dash : [7, 5],
    values: mode === "return" ? computeReturnSeries(viewportValues) : viewportValues.map((value) => toChartNumOrNull(value))
  };
}

function extractBenchmarkSeriesFromRows(headers, rows) {
  const safeHeaders = Array.isArray(headers) ? headers.map((item) => stripMarkup(item)) : [];
  const benchmarkIndex = safeHeaders.findIndex((header) => /benchmark/i.test(header));
  if (benchmarkIndex < 0 || !Array.isArray(rows) || !rows.length) {
    return [];
  }
  const values = rows.map((row) => {
    if (!Array.isArray(row)) {
      return null;
    }
    return parseChartCellNumber(row[benchmarkIndex]);
  });
  return [
    {
      name: safeHeaders[benchmarkIndex] || "Benchmark",
      color: "#ff7f32",
      dash: [8, 4],
      values
    }
  ];
}

function chartControlsForKey(chartKey) {
  if (chartKey === "dashboard") {
    return {
      rangeWrap: dom.dashboardChartRangeControls,
      modeWrap: dom.dashboardChartModeControls,
      info: dom.dashboardChartRangeInfo,
      resetBtn: dom.dashboardChartResetZoomBtn
    };
  }
  if (chartKey === "report") {
    return {
      rangeWrap: dom.reportChartRangeControls,
      modeWrap: dom.reportChartModeControls,
      info: dom.reportChartRangeInfo,
      resetBtn: dom.reportChartResetZoomBtn
    };
  }
  return {
    rangeWrap: null,
    modeWrap: null,
    info: null,
    resetBtn: null
  };
}

function syncLineChartControls(chartKey, infoText = "") {
  const controls = chartControlsForKey(chartKey);
  const activeRangeKey = lineChartViews[chartKey] ? lineChartViews[chartKey].rangeKey : "all";
  const activeMode = lineChartViews[chartKey] ? normalizeLineChartMode(lineChartViews[chartKey].mode) : "value";
  const hasManualViewport = Boolean(lineChartViews[chartKey] && lineChartViews[chartKey].manualViewport);
  if (controls.rangeWrap) {
    controls.rangeWrap.querySelectorAll("[data-range-key]").forEach((button) => {
      const isActive = normalizeLineChartRange(button.dataset.rangeKey) === activeRangeKey;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }
  if (controls.modeWrap) {
    controls.modeWrap.querySelectorAll("[data-chart-mode]").forEach((button) => {
      const isActive = normalizeLineChartMode(button.dataset.chartMode) === activeMode;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }
  if (controls.info) {
    controls.info.textContent = infoText;
  }
  if (controls.resetBtn) {
    controls.resetBtn.disabled = !hasManualViewport;
  }
}

function requestLineChartRender(chartKey) {
  if (chartKey === "dashboard") {
    renderDashboard();
    return;
  }
  if (chartKey === "report") {
    void renderReportCurrent({ force: true });
  }
}

function buildLineChartInteraction(chartKey, totalPoints) {
  return {
    isZoomed() {
      return Boolean(lineChartViews[chartKey] && lineChartViews[chartKey].manualViewport);
    },
    getViewport() {
      const viewport = lineChartViews[chartKey] ? lineChartViews[chartKey].manualViewport : null;
      return viewport ? { ...viewport } : { start: 0, end: totalPoints };
    },
    zoomRange(startIndex, endIndex) {
      if (setLineChartManualViewport(chartKey, startIndex, endIndex, totalPoints)) {
        requestLineChartRender(chartKey);
      }
    },
    panViewport(deltaPoints, originViewport) {
      if (panLineChartViewport(chartKey, deltaPoints, originViewport, totalPoints)) {
        requestLineChartRender(chartKey);
      }
    },
    resetZoom() {
      clearLineChartManualViewport(chartKey);
      requestLineChartRender(chartKey);
    }
  };
}

function getVisibleLineChartModel(chartKey, labels, values, options = {}) {
  const rangeKey = lineChartViews[chartKey] ? lineChartViews[chartKey].rangeKey : "all";
  const mode = lineChartViews[chartKey] ? normalizeLineChartMode(lineChartViews[chartKey].mode) : "value";
  const baseView = sliceLineChartSeriesByRange(labels, values, rangeKey);
  const manualViewport = lineChartViews[chartKey] ? lineChartViews[chartKey].manualViewport : null;

  let viewportStart = 0;
  let viewportEnd = baseView.labels.length;
  if (manualViewport && baseView.labels.length >= 2) {
    viewportStart = Math.max(0, Math.min(manualViewport.start, Math.max(0, baseView.labels.length - 2)));
    viewportEnd = Math.max(viewportStart + 2, Math.min(baseView.labels.length, manualViewport.end));
    if (viewportEnd - viewportStart >= baseView.labels.length) {
      clearLineChartManualViewport(chartKey);
      viewportStart = 0;
      viewportEnd = baseView.labels.length;
    }
  }

  const visibleLabels = baseView.labels.slice(viewportStart, viewportEnd);
  const visiblePrimaryValues = baseView.values.slice(viewportStart, viewportEnd);
  const primaryValues = mode === "return" ? computeReturnSeries(visiblePrimaryValues) : visiblePrimaryValues;

  const comparisonVisibility = options.comparisonVisibility || "always";
  const rawComparisonSeries =
    comparisonVisibility === "return-only" && mode !== "return" ? [] : options.comparisonSeries || [];
  const comparisonSeries = rawComparisonSeries.map((series) =>
    comparisonSeriesWindow(series, baseView.startIndex, baseView.endIndex, viewportStart, viewportEnd, mode)
  );

  const zoomSpan = viewportEnd - viewportStart;
  let info = formatLineChartRangeInfo(
    visibleLabels.map((label, index) => ({ label, value: primaryValues[index] })),
    baseView.labels.map((label, index) => ({ label, value: baseView.values[index] })),
    baseView.usesDates
  );
  info += mode === "return" ? " | tryb: %" : " | tryb: wartość";
  if (zoomSpan > 0 && zoomSpan < baseView.labels.length) {
    info += ` | zoom: ${zoomSpan} pkt (przeciągnij, aby przesuwać)`;
  } else {
    info += " | przeciągnij, aby przybliżyć";
  }
  if (comparisonSeries.length) {
    info += ` | porównanie: ${comparisonSeries.map((item) => item.name).join(", ")}`;
  }
  syncLineChartControls(chartKey, info);

  return {
    labels: visibleLabels,
    values: primaryValues,
    comparisonSeries,
    mode,
    info,
    interaction: buildLineChartInteraction(chartKey, baseView.labels.length)
  };
}

function scheduleResponsiveChartRefresh() {
  if (backendSync.resizeTimer) {
    window.clearTimeout(backendSync.resizeTimer);
  }
  backendSync.resizeTimer = window.setTimeout(() => {
    if (isViewActive("dashboardView")) {
      renderDashboard();
    }
    if (isViewActive("reportsView")) {
      void renderReportCurrent({ force: true });
    }
    if (isViewActive("toolsView") && candlesView.all.length) {
      renderCandlesViewport();
    }
  }, 120);
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

function setupGlobalErrorReporting() {
  if (clientErrorTracker.bound) {
    return;
  }
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
    return;
  }
  clientErrorTracker.bound = true;
  window.addEventListener("error", (event) => {
    const message = String(
      (event && event.error && event.error.message) || (event && event.message) || "Błąd JS"
    );
    void reportClientError({
      source: "client-runtime",
      level: "error",
      method: "RUNTIME",
      path: (event && event.filename) || window.location.pathname || "",
      message,
      details: {
        line: event && event.lineno,
        column: event && event.colno
      }
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event ? event.reason : null;
    const message =
      typeof reason === "string"
        ? reason
        : reason && reason.message
          ? String(reason.message)
          : "Unhandled promise rejection";
    void reportClientError({
      source: "client-runtime",
      level: "error",
      method: "PROMISE",
      path: window.location.pathname || "",
      message,
      details: {
        reason: String(reason || "")
      }
    });
  });
}

function shouldSendClientError(signature) {
  const now = Date.now();
  for (const [key, timestamp] of clientErrorTracker.recent.entries()) {
    if (now - timestamp > clientErrorTracker.ttlMs) {
      clientErrorTracker.recent.delete(key);
    }
  }
  const previous = clientErrorTracker.recent.get(signature);
  if (previous && now - previous <= clientErrorTracker.ttlMs) {
    return false;
  }
  clientErrorTracker.recent.set(signature, now);
  return true;
}

async function reportClientError(entry) {
  if (!backendSync.available) {
    return;
  }
  if (!entry || typeof entry !== "object") {
    return;
  }
  const payload = {
    source: textOrFallback(entry.source, "client"),
    level: textOrFallback(entry.level, "error"),
    method: textOrFallback(entry.method, ""),
    path: textOrFallback(entry.path, ""),
    message: String(entry.message || "Unknown error").slice(0, 1000),
    details: entry.details && typeof entry.details === "object" ? entry.details : {}
  };
  const signature = `${payload.source}|${payload.level}|${payload.method}|${payload.path}|${payload.message}`;
  if (!shouldSendClientError(signature)) {
    return;
  }
  try {
    await fetch(`${API_BASE}/tools/errors/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    // ignore logging failures
  }
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
  } catch (error) {
    if (!String(path || "").startsWith("/tools/errors")) {
      void reportClientError({
        source: "client-api",
        level: "error",
        method,
        path,
        message: error && error.message ? String(error.message) : "API request failed",
        details: {
          timeoutMs
        }
      });
    }
    throw error;
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
  if (target === "dashboardView") {
    renderDashboard();
    return;
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
  scheduleFxRefresh();
  renderDashboard();
  void renderReportCurrent();
}

function onDashboardInflationChange() {
  state.meta.dashboardInflationEnabled = Boolean(dom.dashboardInflationEnabled && dom.dashboardInflationEnabled.checked);
  state.meta.dashboardInflationRatePct = normalizeInflationRatePct(
    dom.dashboardInflationRateInput ? dom.dashboardInflationRateInput.value : state.meta.dashboardInflationRatePct
  );
  if (dom.dashboardInflationRateInput) {
    dom.dashboardInflationRateInput.value = formatInflationRateInput(state.meta.dashboardInflationRatePct);
  }
  saveState();
  renderDashboard();
}

function onAppearanceThemeClick(event) {
  const button = event.target.closest("[data-theme-option]");
  if (!button) {
    return;
  }
  updateAppearanceSetting("theme", button.dataset.themeOption);
}

function onAppearanceIconClick(event) {
  const button = event.target.closest("[data-icon-option]");
  if (!button) {
    return;
  }
  updateAppearanceSetting("iconSet", button.dataset.iconOption);
}

function onAppearanceFontScaleClick(event) {
  const button = event.target.closest("[data-font-scale-option]");
  if (!button) {
    return;
  }
  updateAppearanceSetting("fontScale", button.dataset.fontScaleOption);
}

function onAppearanceReset() {
  state.meta.theme = APPEARANCE_DEFAULTS.theme;
  state.meta.lastLightTheme = APPEARANCE_DEFAULTS.lastLightTheme;
  state.meta.iconSet = APPEARANCE_DEFAULTS.iconSet;
  state.meta.fontScale = APPEARANCE_DEFAULTS.fontScale;
  renderAll();
}

function updateAppearanceSetting(key, value) {
  if (key === "theme") {
    const normalized = normalizeTheme(value);
    if (normalized === state.meta.theme) {
      return;
    }
    if (!isDarkTheme(normalized)) {
      state.meta.lastLightTheme = normalized;
    }
    state.meta.theme = normalized;
    renderAll();
    return;
  }
  if (key === "iconSet") {
    const normalized = normalizeIconSet(value);
    if (normalized === state.meta.iconSet) {
      return;
    }
    state.meta.iconSet = normalized;
    renderAll();
    return;
  }
  if (key === "fontScale") {
    const normalized = normalizeFontScale(value);
    if (normalized === state.meta.fontScale) {
      return;
    }
    state.meta.fontScale = normalized;
    renderAll();
  }
}

function onThemeToggle() {
  const currentTheme = normalizeTheme(state.meta.theme);
  if (isDarkTheme(currentTheme)) {
    state.meta.theme = resolveLastLightTheme(state.meta.lastLightTheme);
  } else {
    state.meta.lastLightTheme = currentTheme;
    state.meta.theme = "midnight";
  }
  renderAll();
}

function normalizeTheme(value) {
  return Object.prototype.hasOwnProperty.call(APPEARANCE_THEMES, value) ? value : APPEARANCE_DEFAULTS.theme;
}

function isDarkTheme(value) {
  return normalizeTheme(value) === "midnight";
}

function resolveLastLightTheme(value) {
  const normalized = normalizeTheme(value);
  return isDarkTheme(normalized) ? APPEARANCE_DEFAULTS.lastLightTheme : normalized;
}

function normalizeIconSet(value) {
  return Object.prototype.hasOwnProperty.call(APPEARANCE_ICON_SETS, value) ? value : APPEARANCE_DEFAULTS.iconSet;
}

function normalizeFontScale(value) {
  return Object.prototype.hasOwnProperty.call(APPEARANCE_FONT_SCALES, value)
    ? value
    : APPEARANCE_DEFAULTS.fontScale;
}

function appearanceThemeConfig(themeKey = state.meta.theme) {
  return APPEARANCE_THEMES[normalizeTheme(themeKey)] || APPEARANCE_THEMES[APPEARANCE_DEFAULTS.theme];
}

function appearanceIconSetConfig(iconSetKey = state.meta.iconSet) {
  return APPEARANCE_ICON_SETS[normalizeIconSet(iconSetKey)] || APPEARANCE_ICON_SETS[APPEARANCE_DEFAULTS.iconSet];
}

function appearanceFontScaleConfig(fontScaleKey = state.meta.fontScale) {
  return (
    APPEARANCE_FONT_SCALES[normalizeFontScale(fontScaleKey)] ||
    APPEARANCE_FONT_SCALES[APPEARANCE_DEFAULTS.fontScale]
  );
}

function applyAppearanceSettings() {
  const theme = normalizeTheme(state?.meta?.theme);
  const iconSet = normalizeIconSet(state?.meta?.iconSet);
  const fontScale = normalizeFontScale(state?.meta?.fontScale);

  if (typeof document !== "undefined" && document.body) {
    if (typeof document.body.setAttribute === "function") {
      document.body.setAttribute("data-theme", theme);
      document.body.setAttribute("data-icon-set", iconSet);
      document.body.setAttribute("data-font-scale", fontScale);
    } else {
      document.body.dataset = document.body.dataset || {};
      document.body.dataset.theme = theme;
      document.body.dataset.iconSet = iconSet;
      document.body.dataset.fontScale = fontScale;
    }
  }
  if (typeof document !== "undefined" && document.documentElement && document.documentElement.style) {
    document.documentElement.style.fontSize = `${appearanceFontScaleConfig(fontScale).rootPx}px`;
  }
  updateTabIcons(iconSet);
  renderThemeToggleButton();
}

function renderThemeToggleButton() {
  if (!dom.themeToggleBtn) {
    return;
  }
  const darkActive = isDarkTheme(state?.meta?.theme);
  dom.themeToggleBtn.textContent = darkActive ? "Tryb jasny" : "Tryb ciemny";
  dom.themeToggleBtn.setAttribute("aria-pressed", darkActive ? "true" : "false");
  dom.themeToggleBtn.classList.toggle("is-active", darkActive);
}

function updateTabIcons(iconSetKey) {
  if (typeof document === "undefined") {
    return;
  }
  const icons = appearanceIconSetConfig(iconSetKey).icons;
  document.querySelectorAll(".tab[data-icon-key]").forEach((tab) => {
    const iconNode = tab.querySelector(".tab-icon");
    const iconKey = tab.dataset.iconKey || "";
    if (!iconNode) {
      return;
    }
    iconNode.textContent = icons[iconKey] || "◌";
  });
}

function renderAppearanceSettings() {
  if (!dom.appearanceThemeGrid || !dom.appearanceIconGrid || !dom.appearanceFontGrid || !dom.appearancePreview) {
    return;
  }
  const themeKey = normalizeTheme(state.meta.theme);
  const iconSetKey = normalizeIconSet(state.meta.iconSet);
  const fontScaleKey = normalizeFontScale(state.meta.fontScale);
  const theme = appearanceThemeConfig(themeKey);
  const iconSet = appearanceIconSetConfig(iconSetKey);
  const fontScale = appearanceFontScaleConfig(fontScaleKey);

  dom.appearanceThemeGrid.innerHTML = Object.entries(APPEARANCE_THEMES)
    .map(([key, item]) => {
      const active = key === themeKey;
      return `
        <button type="button" class="appearance-card${active ? " active" : ""}" data-theme-option="${escapeHtml(key)}" aria-pressed="${active ? "true" : "false"}">
          <div class="appearance-card-head">
            <div>
              <span class="appearance-card-title">${escapeHtml(item.label)}</span>
              <span class="appearance-card-copy">${escapeHtml(item.description)}</span>
            </div>
            <span class="appearance-card-check">${active ? "✓" : ""}</span>
          </div>
          <div class="appearance-swatches">
            ${item.swatches
              .map((color) => `<span class="appearance-swatch" style="background:${escapeHtml(color)}"></span>`)
              .join("")}
          </div>
        </button>
      `;
    })
    .join("");

  dom.appearanceIconGrid.innerHTML = Object.entries(APPEARANCE_ICON_SETS)
    .map(([key, item]) => {
      const active = key === iconSetKey;
      return `
        <button type="button" class="appearance-card compact${active ? " active" : ""}" data-icon-option="${escapeHtml(key)}" aria-pressed="${active ? "true" : "false"}">
          <div class="appearance-card-head">
            <div>
              <span class="appearance-card-title">${escapeHtml(item.label)}</span>
              <span class="appearance-card-copy">${escapeHtml(item.description)}</span>
            </div>
            <span class="appearance-card-check">${active ? "✓" : ""}</span>
          </div>
          <div class="appearance-icons">
            <span>${escapeHtml(item.icons.dashboard)}</span>
            <span>${escapeHtml(item.icons.portfolios)}</span>
            <span>${escapeHtml(item.icons.reports)}</span>
            <span>${escapeHtml(item.icons.tools)}</span>
          </div>
        </button>
      `;
    })
    .join("");

  dom.appearanceFontGrid.innerHTML = Object.entries(APPEARANCE_FONT_SCALES)
    .map(([key, item]) => {
      const active = key === fontScaleKey;
      return `
        <button type="button" class="appearance-card compact${active ? " active" : ""}" data-font-scale-option="${escapeHtml(key)}" aria-pressed="${active ? "true" : "false"}">
          <div class="appearance-card-head">
            <div>
              <span class="appearance-card-title">${escapeHtml(item.label)}</span>
              <span class="appearance-card-copy">${escapeHtml(item.description)}</span>
            </div>
            <span class="appearance-card-check">${active ? "✓" : ""}</span>
          </div>
          <div class="appearance-icons" style="font-size:${key === "compact" ? "0.92rem" : key === "large" ? "1.18rem" : "1.04rem"}">
            <span>Aa</span>
            <span>12%</span>
            <span>${escapeHtml(iconSet.icons.reports)}</span>
          </div>
        </button>
      `;
    })
    .join("");

  if (dom.appearanceSummary) {
    dom.appearanceSummary.textContent = `Aktywna skórka: ${theme.label} | Ikony: ${iconSet.label} | Czcionka: ${fontScale.label}`;
  }
  dom.appearancePreview.innerHTML = buildAppearancePreviewMarkup(theme, iconSet, fontScale);
}

function buildAppearancePreviewMarkup(theme, iconSet, fontScale) {
  const icons = iconSet.icons;
  return `
    <div class="appearance-preview">
      <div class="appearance-preview-bar">
        <div class="appearance-preview-brand">
          <strong>${escapeHtml(icons.dashboard)} Prywatny Portfel</strong>
          <span>${escapeHtml(theme.label)} • ${escapeHtml(fontScale.label)}</span>
        </div>
        <div class="appearance-preview-controls">
          <span class="appearance-pill active">${escapeHtml(icons.dashboard)} Kokpit</span>
          <span class="appearance-pill">${escapeHtml(icons.reports)} Raporty</span>
          <span class="appearance-pill">${escapeHtml(icons.tools)} Narzędzia</span>
        </div>
      </div>
      <div class="appearance-preview-body">
        <div class="appearance-preview-card">
          <h4>Kokpit inwestora</h4>
          <div class="appearance-preview-stats">
            <div class="appearance-mini-stat">
              <span>Wartość rynkowa</span>
              <strong>124 900 zł</strong>
            </div>
            <div class="appearance-mini-stat">
              <span>Gotówka</span>
              <strong>18 240 zł</strong>
            </div>
            <div class="appearance-mini-stat">
              <span>Zysk YTD</span>
              <strong>+12,4%</strong>
            </div>
            <div class="appearance-mini-stat">
              <span>Benchmark</span>
              <strong>WIG20</strong>
            </div>
          </div>
          <div class="appearance-preview-actions">
            <span class="appearance-mini-btn">${escapeHtml(icons.operations)} Dodaj operację</span>
            <span class="appearance-mini-btn secondary">${escapeHtml(icons.reports)} Eksport PNG</span>
          </div>
        </div>
        <div class="appearance-preview-card">
          <h4>Status i oznaczenia</h4>
          <div class="appearance-preview-list">
            <div class="appearance-mini-row">
              <span>Notowania</span>
              <strong><span class="badge ok">online</span></strong>
            </div>
            <div class="appearance-mini-row">
              <span>Alerty</span>
              <strong><span class="badge off">2 oczekujące</span></strong>
            </div>
            <div class="appearance-mini-row">
              <span>Portfel</span>
              <strong>${escapeHtml(icons.portfolios)} Główny</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
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
  scheduleFxRefresh();
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
  scheduleFxRefresh();
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

function resetOperationHistoryFilters() {
  if (dom.operationHistorySearchInput) {
    dom.operationHistorySearchInput.value = "";
  }
  if (dom.operationHistoryDateFromInput) {
    dom.operationHistoryDateFromInput.value = "";
  }
  if (dom.operationHistoryDateToInput) {
    dom.operationHistoryDateToInput.value = "";
  }
  if (dom.operationHistoryTypeSelect) {
    dom.operationHistoryTypeSelect.value = "";
  }
  if (dom.operationHistoryPortfolioSelect) {
    dom.operationHistoryPortfolioSelect.value = "";
  }
  if (dom.operationHistoryAccountSelect) {
    dom.operationHistoryAccountSelect.value = "";
  }
  if (dom.operationHistoryAmountMinInput) {
    dom.operationHistoryAmountMinInput.value = "";
  }
  if (dom.operationHistoryAmountMaxInput) {
    dom.operationHistoryAmountMaxInput.value = "";
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
  scheduleFxRefresh();
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
  scheduleFxRefresh();
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
  link.download = `prywatny-portfel-backup-${todayIso()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportCanvasAsPng(canvas, fileName) {
  if (!canvas || typeof document === "undefined") {
    return;
  }
  const exportCanvas = document.createElement("canvas");
  if (!exportCanvas || !exportCanvas.getContext) {
    return;
  }
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height;
  const exportCtx = exportCanvas.getContext("2d");
  if (!exportCtx) {
    return;
  }
  exportCtx.fillStyle = readCssVarValue("--bg", "#f4f8f5");
  exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  exportCtx.drawImage(canvas, 0, 0);
  const link = document.createElement("a");
  link.href = exportCanvas.toDataURL("image/png");
  link.download = fileName || `wykres-${todayIso()}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
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
    const yes = window.confirm("Usunąć tę operację?");
    if (!yes) {
      return;
    }
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
  applyAppearanceSettings();
  saveState({ preserveHistoryCache: true });

  dom.planSelect.value = state.meta.activePlan;
  dom.baseCurrencySelect.value = state.meta.baseCurrency;
  if (dom.dashboardInflationEnabled) {
    dom.dashboardInflationEnabled.checked = Boolean(state.meta.dashboardInflationEnabled);
  }
  if (dom.dashboardInflationRateInput) {
    dom.dashboardInflationRateInput.value = formatInflationRateInput(state.meta.dashboardInflationRatePct);
  }

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
  renderAppearanceSettings();
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
  fillSelect(dom.operationHistoryPortfolioSelect, options, true);
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
  fillSelect(dom.operationHistoryAccountSelect, options, true);
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
  if (uiModules.operations && typeof uiModules.operations.renderOperations === "function") {
    uiModules.operations.renderOperations({
      dom,
      state,
      lookupName,
      lookupAssetLabel,
      escapeHtml,
      formatFloat,
      formatMoney,
      renderTable
    });
  }
}

function renderRecurring() {
  if (uiModules.operations && typeof uiModules.operations.renderRecurring === "function") {
    uiModules.operations.renderRecurring({
      dom,
      state,
      lookupName,
      lookupAssetLabel,
      escapeHtml,
      formatMoney,
      renderTable
    });
  }
}

function currentPortfolioBenchmark(portfolioId) {
  if (!portfolioId) {
    return "";
  }
  const portfolio = findById(state.portfolios, portfolioId);
  return portfolio ? String(portfolio.benchmark || "").trim() : "";
}

function dashboardHistoryCacheKey(portfolioId) {
  return `${portfolioId || ""}|${normalizeCurrency(state.meta.baseCurrency, "PLN")}`;
}

function computeDashboardHistoryChange(series, days) {
  if (!Array.isArray(series) || !series.length) {
    return { available: false, amount: 0, pct: 0, fromDate: "", toDate: "" };
  }
  const current = series[series.length - 1];
  const currentValue = toNum(current.netWorth != null ? current.netWorth : current.value);
  const currentDate = parseSeriesIsoDate(current.date);
  if (!currentDate) {
    return { available: false, amount: 0, pct: 0, fromDate: "", toDate: String(current.date || "") };
  }
  const targetDate = new Date(currentDate.getTime());
  targetDate.setUTCDate(targetDate.getUTCDate() - Math.max(1, Math.round(toNum(days) || 1)));
  let baseline = null;
  for (let index = series.length - 1; index >= 0; index -= 1) {
    const candidate = series[index];
    const candidateDate = parseSeriesIsoDate(candidate.date);
    if (candidateDate && candidateDate <= targetDate) {
      baseline = candidate;
      break;
    }
  }
  if (!baseline) {
    return { available: false, amount: 0, pct: 0, fromDate: "", toDate: String(current.date || "") };
  }
  const baseValue = toNum(baseline.netWorth != null ? baseline.netWorth : baseline.value);
  const amount = currentValue - baseValue;
  return {
    available: true,
    amount,
    pct: baseValue !== 0 ? (amount / baseValue) * 100 : 0,
    fromDate: String(baseline.date || ""),
    toDate: String(current.date || "")
  };
}

function inflationMultiplierBetweenDates(fromDate, toDate, annualRatePct) {
  const start = parseSeriesIsoDate(fromDate);
  const end = parseSeriesIsoDate(toDate);
  const rate = normalizeInflationRatePct(annualRatePct);
  if (!start || !end || rate <= 0) {
    return 1;
  }
  const diffDays = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
  if (diffDays <= 0) {
    return 1;
  }
  return (1 + rate / 100) ** (diffDays / 365.25);
}

function applyInflationToSeries(series, annualRatePct) {
  if (!Array.isArray(series) || !series.length) {
    return [];
  }
  const lastDate = String(series[series.length - 1].date || "");
  return series.map((point) => {
    const multiplier = inflationMultiplierBetweenDates(point.date, lastDate, annualRatePct);
    const next = { ...point };
    if (next.value != null) {
      next.value = toNum(next.value) * multiplier;
    }
    if (next.netWorth != null) {
      next.netWorth = toNum(next.netWorth) * multiplier;
    }
    if (next.marketValue != null) {
      next.marketValue = toNum(next.marketValue) * multiplier;
    }
    return next;
  });
}

function computeDashboardHistorySummary(series, options = {}) {
  const inflationEnabled = Boolean(options.inflationEnabled);
  const inflationRatePct = normalizeInflationRatePct(options.inflationRatePct);
  const adjust = (days) => {
    const nominal = computeDashboardHistoryChange(series, days);
    if (!nominal.available || !inflationEnabled || inflationRatePct <= 0) {
      return nominal;
    }
    const baselineMultiplier = inflationMultiplierBetweenDates(
      nominal.fromDate,
      nominal.toDate,
      inflationRatePct
    );
    const current = Array.isArray(series) && series.length ? series[series.length - 1] : null;
    const baseline = Array.isArray(series)
      ? series.find((item) => String(item.date || "") === String(nominal.fromDate || ""))
      : null;
    const currentValue = toNum(current && (current.netWorth != null ? current.netWorth : current.value));
    const baseValue = toNum(baseline && (baseline.netWorth != null ? baseline.netWorth : baseline.value));
    const inflationAdjustedBase = baseValue * baselineMultiplier;
    const amount = currentValue - inflationAdjustedBase;
    return {
      ...nominal,
      amount,
      pct: inflationAdjustedBase !== 0 ? (amount / inflationAdjustedBase) * 100 : 0
    };
  };

  return {
    daily: adjust(1),
    monthly: adjust(30),
    yearly: adjust(365)
  };
}

function currentDashboardHistorySeries(portfolioId, fallbackSeries) {
  const cacheKey = dashboardHistoryCacheKey(portfolioId);
  if (
    lineChartViews.dashboard.historyResolvedKey === cacheKey &&
    Array.isArray(lineChartViews.dashboard.historySeries) &&
    lineChartViews.dashboard.historySeries.length
  ) {
    return lineChartViews.dashboard.historySeries;
  }
  return fallbackSeries;
}

function currentDashboardHistorySummary(portfolioId, series) {
  const cacheKey = dashboardHistoryCacheKey(portfolioId);
  if (
    lineChartViews.dashboard.historyResolvedKey === cacheKey &&
    lineChartViews.dashboard.historySummary &&
    typeof lineChartViews.dashboard.historySummary === "object"
  ) {
    return lineChartViews.dashboard.historySummary;
  }
  return computeDashboardHistorySummary(series);
}

function alignBenchmarkHistoryToSeries(series, history) {
  if (!Array.isArray(series) || !series.length || !Array.isArray(history) || !history.length) {
    return [];
  }
  const normalizedHistory = history
    .map((item) => ({
      date: String(item.date || "").slice(0, 10),
      close: toChartNumOrNull(item.close)
    }))
    .filter((item) => item.date && item.close != null && item.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (normalizedHistory.length < 2) {
    return [];
  }
  let cursor = 0;
  let lastClose = null;
  const output = [];
  series.forEach((point) => {
    const pointDate = String(point.date || "").slice(0, 10);
    while (cursor < normalizedHistory.length && normalizedHistory[cursor].date <= pointDate) {
      lastClose = normalizedHistory[cursor].close;
      cursor += 1;
    }
    output.push(lastClose);
  });
  return output.filter((value) => value != null).length >= 2 ? output : [];
}

async function warmDashboardHistorySeries(portfolioId) {
  const historyKey = dashboardHistoryCacheKey(portfolioId);
  if (
    lineChartViews.dashboard.historyLoading ||
    lineChartViews.dashboard.historyResolvedKey === historyKey
  ) {
    return;
  }

  lineChartViews.dashboard.historyKey = historyKey;
  lineChartViews.dashboard.historyLoading = true;
  try {
    if (!backendSync.available) {
      throw new Error("backend offline");
    }
    const query = portfolioId ? `?portfolioId=${encodeURIComponent(portfolioId)}` : "";
    const payload = await apiRequest(`/metrics/history${query}`, { timeoutMs: 20000 });
    const history = payload.history && typeof payload.history === "object" ? payload.history : {};
    const nextSeries = Array.isArray(history.series)
      ? history.series
          .map((item) => ({
            date: String(item.date || "").slice(0, 10),
            value: toNum(item.netWorth != null ? item.netWorth : item.value),
            marketValue: toNum(item.marketValue),
            netWorth: toNum(item.netWorth != null ? item.netWorth : item.value),
            cashTotal: toNum(item.cashTotal),
            liabilitiesTotal: toNum(item.liabilitiesTotal),
            pl: toNum(item.totalPL)
          }))
          .filter((item) => item.date)
      : [];
    if (nextSeries.length) {
      lineChartViews.dashboard.historySeries = nextSeries;
      lineChartViews.dashboard.historySummary =
        history.summary && typeof history.summary === "object"
          ? history.summary
          : computeDashboardHistorySummary(nextSeries);
    }
    lineChartViews.dashboard.historyResolvedKey = historyKey;
  } catch (error) {
    lineChartViews.dashboard.historySeries = [];
    lineChartViews.dashboard.historySummary = null;
    lineChartViews.dashboard.historyResolvedKey = historyKey;
  } finally {
    lineChartViews.dashboard.historyLoading = false;
    const stillActive =
      (dom.dashboardPortfolioSelect ? dom.dashboardPortfolioSelect.value || "" : "") === portfolioId &&
      lineChartViews.dashboard.historyKey === historyKey;
    if (stillActive) {
      renderDashboard();
    }
  }
}

async function warmDashboardBenchmarkSeries(portfolioId, dashboardSeries) {
  const benchmarkName = currentPortfolioBenchmark(portfolioId);
  if (!portfolioId || !benchmarkName || !dashboardSeries.length) {
    lineChartViews.dashboard.comparisonKey = "";
    lineChartViews.dashboard.comparisonSeries = [];
    lineChartViews.dashboard.comparisonLoading = false;
    lineChartViews.dashboard.comparisonResolvedKey = "";
    return;
  }
  const comparisonKey = [
    portfolioId,
    benchmarkName.toUpperCase(),
    dashboardSeries.length,
    dashboardSeries[0].date || "",
    dashboardSeries[dashboardSeries.length - 1].date || ""
  ].join("|");
  if (
    lineChartViews.dashboard.comparisonLoading ||
    lineChartViews.dashboard.comparisonResolvedKey === comparisonKey
  ) {
    return;
  }

  lineChartViews.dashboard.comparisonKey = comparisonKey;
  lineChartViews.dashboard.comparisonLoading = true;
  try {
    if (!backendSync.available) {
      throw new Error("backend offline");
    }
    const query = `?ticker=${encodeURIComponent(benchmarkName)}&limit=${Math.max(240, dashboardSeries.length * 8)}`;
    const payload = await apiRequest(`/tools/charts/candles${query}`, { timeoutMs: 15000 });
    const alignedValues = alignBenchmarkHistoryToSeries(dashboardSeries, payload.candles || []);
    lineChartViews.dashboard.comparisonSeries = alignedValues.length
      ? [
          {
            name: benchmarkName,
            color: "#ff7f32",
            dash: [8, 4],
            values: alignedValues
          }
        ]
      : [];
    lineChartViews.dashboard.comparisonResolvedKey = comparisonKey;
  } catch (error) {
    lineChartViews.dashboard.comparisonSeries = [];
    lineChartViews.dashboard.comparisonResolvedKey = comparisonKey;
  } finally {
    lineChartViews.dashboard.comparisonLoading = false;
    const stillActive =
      (dom.dashboardPortfolioSelect ? dom.dashboardPortfolioSelect.value || "" : "") === portfolioId &&
      lineChartViews.dashboard.comparisonKey === comparisonKey;
    if (stillActive) {
      renderDashboard();
    }
  }
}

function renderDashboard() {
  if (uiModules.dashboard && typeof uiModules.dashboard.renderDashboard === "function") {
    const portfolioId = dom.dashboardPortfolioSelect ? dom.dashboardPortfolioSelect.value || "" : "";
    const fallbackDashboardSeries = buildSeries(portfolioId);
    const dashboardSeries = currentDashboardHistorySeries(portfolioId, fallbackDashboardSeries);
    const dashboardSummary = currentDashboardHistorySummary(portfolioId, dashboardSeries);
    const benchmarkName = currentPortfolioBenchmark(portfolioId);
    const expectedComparisonPrefix = portfolioId && benchmarkName ? `${portfolioId}|${benchmarkName.toUpperCase()}|` : "";
    const dashboardComparisonSeries =
      expectedComparisonPrefix && lineChartViews.dashboard.comparisonKey.startsWith(expectedComparisonPrefix)
        ? lineChartViews.dashboard.comparisonSeries
        : [];
    void warmDashboardHistorySeries(portfolioId);
    void warmDashboardBenchmarkSeries(portfolioId, dashboardSeries);
    uiModules.dashboard.renderDashboard({
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
    });
  }
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
      const comparisonSeries = extractBenchmarkSeriesFromRows(remote.headers, remote.rows);
      const chartView = getVisibleLineChartModel("report", remote.chart.labels, remote.chart.values, {
        comparisonSeries,
        comparisonVisibility: "always"
      });
      drawLineChart(dom.reportChart, chartView.labels, chartView.values, {
        color: remote.chart.color || "#ff7f32",
        valueFormatter: (value) => (chartView.mode === "return" ? formatPercent(value) : formatFloat(value)),
        seriesName: reportName,
        series: chartView.comparisonSeries,
        interaction: chartView.interaction
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
  const comparisonSeries = extractBenchmarkSeriesFromRows(report.headers, report.rows);
  const chartView = getVisibleLineChartModel("report", report.chart.labels || [], report.chart.values || [], {
    comparisonSeries,
    comparisonVisibility: "always"
  });
  drawLineChart(dom.reportChart, chartView.labels, chartView.values, {
    color: report.chart.color || "#ff7f32",
    valueFormatter: (value) => (chartView.mode === "return" ? formatPercent(value) : formatFloat(value)),
    seriesName: reportName,
    series: chartView.comparisonSeries,
    interaction: chartView.interaction
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

function normalizeCurrency(value, fallback = "PLN") {
  const text = String(value || "").toUpperCase().trim();
  return /^[A-Z]{3}$/.test(text) ? text : fallback;
}

function normalizeFxPairKey(value, quoteCurrency) {
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

function normalizeFxRates(raw) {
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

function findCurrencyConversionRate(fromCurrency, toCurrency, fxRates) {
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

function extractFxRatesFromQuotes(quotes) {
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

function requiredFxQuoteTickers() {
  const baseCurrency = normalizeCurrency(state.meta.baseCurrency, "PLN");
  return relevantCurrenciesForState()
    .filter((currency) => currency !== baseCurrency)
    .map((currency) => buildFxQuoteTicker(currency, baseCurrency))
    .filter(Boolean);
}

function computeMetrics(portfolioId, options = {}) {
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
  return densifySeriesByDay(series);
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

function parseSeriesIsoDate(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }
  const parsed = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function densifySeriesByDay(series) {
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

function prepareCanvasFrame(canvas) {
  if (!canvas || !canvas.getContext) {
    return null;
  }
  const baseWidth = Math.max(1, Number(canvas.getAttribute("width")) || 1200);
  const baseHeight = Math.max(180, Number(canvas.getAttribute("height")) || 280);
  const measuredWidth = Math.round(
    canvas.clientWidth ||
      (canvas.parentElement ? canvas.parentElement.clientWidth : 0) ||
      baseWidth
  );
  const cssWidth = Math.max(280, measuredWidth);
  const cssHeight = Math.max(220, Math.min(baseHeight, Math.round(cssWidth * 0.62)));
  const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
  const pixelWidth = Math.max(1, Math.round(cssWidth * pixelRatio));
  const pixelHeight = Math.max(1, Math.round(cssHeight * pixelRatio));
  if (canvas.width !== pixelWidth) {
    canvas.width = pixelWidth;
  }
  if (canvas.height !== pixelHeight) {
    canvas.height = pixelHeight;
  }
  if (canvas.style.height !== `${cssHeight}px`) {
    canvas.style.height = `${cssHeight}px`;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  return {
    ctx,
    width: cssWidth,
    height: cssHeight,
    compact: cssWidth < 520
  };
}

function defaultLineChartValueFormatter(value) {
  return formatFloat(toNum(value));
}

function formatLineChartAxisLabel(label) {
  const text = String(label || "").trim();
  if (!text) {
    return "";
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const parsed = new Date(`${text}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("pl-PL", {
        day: "2-digit",
        month: "short"
      });
    }
  }
  return text;
}

function formatLineChartTooltipLabel(label) {
  const text = String(label || "").trim();
  if (!text) {
    return "";
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const parsed = new Date(`${text}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("pl-PL", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      });
    }
  }
  return text;
}

function ensureChartTooltipElements(canvas, includeMeta = false) {
  if (!canvas) {
    return {
      wrap: null,
      tooltip: null,
      tooltipLabel: null,
      tooltipValue: null,
      tooltipMeta: null
    };
  }
  const wrap = canvas.parentElement;
  let tooltip = wrap ? wrap.querySelector(".chart-tooltip") : null;
  if (!tooltip && wrap) {
    tooltip = document.createElement("div");
    tooltip.className = "chart-tooltip";
    const label = document.createElement("div");
    label.className = "chart-tooltip-label";
    const value = document.createElement("div");
    value.className = "chart-tooltip-value";
    tooltip.append(label, value);
    wrap.appendChild(tooltip);
  }
  if (tooltip && includeMeta && !tooltip.querySelector(".chart-tooltip-meta")) {
    const meta = document.createElement("div");
    meta.className = "chart-tooltip-meta";
    tooltip.appendChild(meta);
  }
  return {
    wrap,
    tooltip,
    tooltipLabel: tooltip ? tooltip.querySelector(".chart-tooltip-label") : null,
    tooltipValue: tooltip ? tooltip.querySelector(".chart-tooltip-value") : null,
    tooltipMeta: tooltip ? tooltip.querySelector(".chart-tooltip-meta") : null
  };
}

function hideChartTooltip(state) {
  if (state && state.tooltip) {
    state.tooltip.classList.remove("visible");
  }
}

function positionChartTooltip(state, point, canvasRect) {
  if (!state || !state.tooltip) {
    return;
  }
  const wrapRect = state.wrap ? state.wrap.getBoundingClientRect() : canvasRect;
  const tooltipWidth = state.tooltip.offsetWidth || 148;
  const tooltipHeight = state.tooltip.offsetHeight || 54;
  let left = point.x + 14;
  let top = point.y - tooltipHeight - 14;
  if (left + tooltipWidth > wrapRect.width - 10) {
    left = point.x - tooltipWidth - 14;
  }
  if (top < 10) {
    top = point.y + 14;
  }
  left = Math.max(10, Math.min(left, wrapRect.width - tooltipWidth - 10));
  top = Math.max(10, Math.min(top, wrapRect.height - tooltipHeight - 10));
  state.tooltip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}

function ensureLineChartState(canvas) {
  if (!canvas) {
    return null;
  }
  if (canvas.__lineChartState) {
    return canvas.__lineChartState;
  }
  const tooltipState = ensureChartTooltipElements(canvas, true);

  const state = {
    activeIndex: -1,
    points: [],
    seriesPoints: [],
    bounds: null,
    ...tooltipState,
    valueFormatter: defaultLineChartValueFormatter,
    tooltipLabelFormatter: formatLineChartTooltipLabel,
    draw: () => {},
    axisLabelFormatter: formatLineChartAxisLabel,
    tooltipContentBuilder: null,
    interaction: null,
    drag: null
  };

  const clearHover = () => {
    if (state.activeIndex === -1 || state.drag) {
      return;
    }
    state.activeIndex = -1;
    hideChartTooltip(state);
    state.draw();
  };

  const updateHover = (event) => {
    if (state.drag || !state.points.length || !state.bounds) {
      clearHover();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (
      x < state.bounds.left ||
      x > state.bounds.right ||
      y < state.bounds.top - 18 ||
      y > state.bounds.bottom + 18
    ) {
      clearHover();
      return;
    }

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    state.points.forEach((point, index) => {
      const distance = Math.abs(point.x - x);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    if (state.activeIndex !== nearestIndex) {
      state.activeIndex = nearestIndex;
      state.draw();
    }

    const point = state.points[state.activeIndex];
    const tooltipContent =
      typeof state.tooltipContentBuilder === "function" ? state.tooltipContentBuilder(state.activeIndex) : null;
    if (!point || !tooltipContent || !state.tooltip || !state.tooltipLabel || !state.tooltipValue) {
      hideChartTooltip(state);
      return;
    }
    state.tooltipLabel.textContent = tooltipContent.label || state.tooltipLabelFormatter(point.label);
    state.tooltipValue.textContent = tooltipContent.value || "";
    if (state.tooltipMeta) {
      state.tooltipMeta.textContent = tooltipContent.meta || "";
    }
    state.tooltip.classList.add("visible");
    positionChartTooltip(state, tooltipContent.point || point, rect);
  };

  const startDrag = (event) => {
    if (!state.interaction || !state.bounds || !state.points.length || event.button !== 0) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < state.bounds.left || x > state.bounds.right || y < state.bounds.top || y > state.bounds.bottom) {
      return;
    }
    event.preventDefault();
    hideChartTooltip(state);
    state.activeIndex = -1;
    const zoomed = typeof state.interaction.isZoomed === "function" && state.interaction.isZoomed();
    state.drag = zoomed
      ? {
          mode: "pan",
          startX: x,
          currentX: x,
          originViewport:
            typeof state.interaction.getViewport === "function" ? state.interaction.getViewport() : null,
          lastPanDelta: 0
        }
      : {
          mode: "select",
          startX: x,
          currentX: x
        };
    canvas.style.cursor = zoomed ? "grabbing" : "crosshair";
    state.draw();
  };

  const moveDrag = (event) => {
    if (!state.drag || !state.bounds || !state.points.length) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(state.bounds.left, Math.min(state.bounds.right, event.clientX - rect.left));
    state.drag.currentX = x;
    if (state.drag.mode === "pan") {
      const width = Math.max(1, state.bounds.right - state.bounds.left);
      const pointSpan = Math.max(1, state.points.length - 1);
      const deltaPoints = Math.round(((state.drag.startX - x) / width) * pointSpan);
      if (deltaPoints !== state.drag.lastPanDelta && typeof state.interaction.panViewport === "function") {
        state.drag.lastPanDelta = deltaPoints;
        state.interaction.panViewport(deltaPoints, state.drag.originViewport);
      }
      return;
    }
    state.draw();
  };

  const endDrag = () => {
    if (!state.drag) {
      return;
    }
    const drag = state.drag;
    state.drag = null;
    canvas.style.cursor = "crosshair";
    if (
      drag.mode === "select" &&
      typeof state.interaction?.zoomRange === "function" &&
      Math.abs(drag.currentX - drag.startX) > 6
    ) {
      let startIndex = 0;
      let endIndex = 0;
      let startDistance = Number.POSITIVE_INFINITY;
      let endDistance = Number.POSITIVE_INFINITY;
      state.points.forEach((point, index) => {
        const distanceStart = Math.abs(point.x - drag.startX);
        if (distanceStart < startDistance) {
          startDistance = distanceStart;
          startIndex = index;
        }
        const distanceEnd = Math.abs(point.x - drag.currentX);
        if (distanceEnd < endDistance) {
          endDistance = distanceEnd;
          endIndex = index;
        }
      });
      state.interaction.zoomRange(startIndex, endIndex);
      return;
    }
    state.draw();
  };

  canvas.addEventListener("mousemove", updateHover);
  canvas.addEventListener("mouseleave", clearHover);
  canvas.addEventListener("blur", clearHover);
  canvas.addEventListener("mousedown", startDrag);
  canvas.addEventListener("dblclick", () => {
    if (state.interaction && typeof state.interaction.resetZoom === "function") {
      state.interaction.resetZoom();
    }
  });
  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("mousemove", moveDrag);
    window.addEventListener("mouseup", endDrag);
  }
  canvas.style.cursor = "crosshair";
  canvas.__lineChartState = state;
  return state;
}

function readCssVarValue(name, fallback) {
  if (typeof window === "undefined" || typeof getComputedStyle !== "function" || typeof document === "undefined") {
    return fallback;
  }
  const root = document.body || document.documentElement;
  if (!root) {
    return fallback;
  }
  const value = getComputedStyle(root).getPropertyValue(name).trim();
  return value || fallback;
}

function getChartPalette() {
  return {
    primary: readCssVarValue("--chart-primary", "#0e7a64"),
    secondary: readCssVarValue("--chart-secondary", "#ff7f32"),
    up: readCssVarValue("--chart-up", "#0e7a64"),
    down: readCssVarValue("--chart-down", "#b04444"),
    grid: readCssVarValue("--chart-grid", "rgba(168, 185, 163, 0.46)"),
    axis: readCssVarValue("--chart-axis", "rgba(75, 96, 86, 0.9)"),
    axisStrong: readCssVarValue("--chart-axis-strong", "#30473e"),
    empty: readCssVarValue("--chart-empty", "#4b6056"),
    guide: readCssVarValue("--chart-guide", "rgba(0, 87, 71, 0.34)"),
    selectionFill: readCssVarValue("--chart-selection-fill", "rgba(14, 122, 100, 0.12)"),
    selectionStroke: readCssVarValue("--chart-selection-stroke", "rgba(14, 122, 100, 0.34)"),
    candleGuide: readCssVarValue("--chart-candle-guide", "rgba(82, 70, 36, 0.36)"),
    backgroundTop: readCssVarValue("--chart-bg-top", "rgba(14, 122, 100, 0.06)"),
    backgroundBottom: readCssVarValue("--chart-bg-bottom", "rgba(14, 122, 100, 0.01)"),
    candleBackgroundTop: readCssVarValue("--chart-candle-bg-top", "rgba(255, 127, 50, 0.05)"),
    candleBackgroundBottom: readCssVarValue("--chart-candle-bg-bottom", "rgba(255, 127, 50, 0.01)")
  };
}

function drawLineChart(canvas, labels, values, options = {}) {
  const frame = prepareCanvasFrame(canvas);
  if (!frame) {
    return;
  }
  const { ctx, width, height, compact } = frame;
  const chartState = ensureLineChartState(canvas);
  const valueFormatter =
    typeof options.valueFormatter === "function" ? options.valueFormatter : defaultLineChartValueFormatter;
  const axisLabelFormatter =
    typeof options.axisLabelFormatter === "function" ? options.axisLabelFormatter : formatLineChartAxisLabel;
  const tooltipLabelFormatter =
    typeof options.tooltipLabelFormatter === "function" ? options.tooltipLabelFormatter : formatLineChartTooltipLabel;
  const comparisonSeries = Array.isArray(options.series) ? options.series : [];
  const chartPalette = getChartPalette();

  if (!values || values.length === 0) {
    if (chartState && chartState.tooltip) {
      hideChartTooltip(chartState);
      chartState.points = [];
      chartState.seriesPoints = [];
    }
    ctx.fillStyle = chartPalette.empty;
    ctx.font = compact ? "13px Space Grotesk" : "14px Space Grotesk";
    ctx.fillText("Brak danych do wykresu.", 20, 26);
    return;
  }

  const color = options.color || chartPalette.primary;
  const seriesDefinitions = [
    {
      name: options.seriesName || "Seria główna",
      color,
      dash: [],
      values: values.map((value) => toChartNumOrNull(value)),
      fill: true,
      highlight: true,
      lineWidth: compact ? 2.4 : 2.8
    }
  ].concat(
    comparisonSeries.map((series, index) => ({
      name: series.name || `Porównanie ${index + 1}`,
      color: series.color || chartPalette.secondary,
      dash: Array.isArray(series.dash) ? series.dash : [7, 5],
      values: (Array.isArray(series.values) ? series.values : []).map((value) => toChartNumOrNull(value)),
      fill: false,
      highlight: false,
      lineWidth: compact ? 1.8 : 2.1
    }))
  );
  const legendSpace = seriesDefinitions.length > 1 ? (compact ? 22 : 26) : 0;
  const padding = compact
    ? { left: 56, right: 14, top: 18 + legendSpace, bottom: 32 }
    : { left: 74, right: 20, top: 20 + legendSpace, bottom: 36 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allValues = seriesDefinitions.flatMap((series) => series.values).filter((value) => value != null);
  const minVal = allValues.length ? Math.min(...allValues) : 0;
  const maxVal = allValues.length ? Math.max(...allValues) : 0;
  const isFlat = Math.abs(maxVal - minVal) < 1e-9;
  const flatPadding = isFlat ? Math.max(1, Math.abs(maxVal) * 0.05 || 1) : Math.max(1, Math.abs(maxVal - minVal) * 0.08);
  const plotMin = minVal - flatPadding;
  const plotMax = maxVal + flatPadding;
  const plotRange = plotMax - plotMin || 1;
  const gridLines = 4;

  const chartBackground = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  chartBackground.addColorStop(0, chartPalette.backgroundTop);
  chartBackground.addColorStop(1, chartPalette.backgroundBottom);
  ctx.fillStyle = chartBackground;
  ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight);

  ctx.strokeStyle = chartPalette.grid;
  ctx.lineWidth = 1;
  ctx.fillStyle = chartPalette.axis;
  ctx.font = compact ? "10px IBM Plex Mono" : "11px IBM Plex Mono";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= gridLines; i += 1) {
    const y = padding.top + (chartHeight / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    const tickValue = plotMax - (plotRange * i) / gridLines;
    ctx.fillText(valueFormatter(tickValue), padding.left - 10, y);
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const xPositions = labels.map((_, idx) =>
    labels.length === 1
      ? padding.left + chartWidth / 2
      : padding.left + (chartWidth * idx) / Math.max(1, labels.length - 1)
  );
  const primaryPoints = seriesDefinitions[0].values.map((value, idx) => ({
    x: xPositions[idx],
    y: value == null ? null : padding.top + chartHeight - ((value - plotMin) / plotRange) * chartHeight,
    value,
    label: labels[idx] || ""
  }));
  const seriesPoints = seriesDefinitions.map((series) =>
    labels.map((label, idx) => {
      const value = idx < series.values.length ? series.values[idx] : null;
      return {
        x: xPositions[idx],
        y: value == null ? null : padding.top + chartHeight - ((value - plotMin) / plotRange) * chartHeight,
        value,
        label: label || ""
      };
    })
  );
  if (chartState) {
    chartState.points = primaryPoints;
    chartState.seriesPoints = seriesPoints;
    chartState.bounds = {
      left: padding.left,
      right: width - padding.right,
      top: padding.top,
      bottom: height - padding.bottom
    };
    chartState.valueFormatter = valueFormatter;
    chartState.tooltipLabelFormatter = tooltipLabelFormatter;
    chartState.axisLabelFormatter = axisLabelFormatter;
    chartState.tooltipContentBuilder = (index) => {
      const label = tooltipLabelFormatter(labels[index] || "");
      const primaryPoint = seriesPoints[0][index];
      const fallbackPoint = seriesPoints.find((items) => items[index] && items[index].y != null);
      const meta = seriesDefinitions
        .slice(1)
        .map((series, seriesIndex) => {
          const point = seriesPoints[seriesIndex + 1][index];
          return point && point.value != null ? `${series.name}: ${valueFormatter(point.value)}` : "";
        })
        .filter(Boolean)
        .join(" | ");
      return {
        label,
        value:
          primaryPoint && primaryPoint.value != null
            ? `${seriesDefinitions[0].name}: ${valueFormatter(primaryPoint.value)}`
            : `${seriesDefinitions[0].name}: -`,
        meta,
        point: fallbackPoint ? { x: fallbackPoint[index].x, y: fallbackPoint[index].y || padding.top } : primaryPoint
      };
    };
    chartState.interaction = options.interaction || null;
    chartState.draw = () => drawLineChart(canvas, labels, values, options);
    if (chartState.activeIndex >= primaryPoints.length) {
      chartState.activeIndex = -1;
    }
  }

  if (seriesDefinitions.length > 1) {
    let legendX = padding.left;
    const legendY = compact ? 15 : 18;
    ctx.font = compact ? "10px Space Grotesk" : "11px Space Grotesk";
    ctx.textBaseline = "middle";
    seriesDefinitions.forEach((series) => {
      ctx.save();
      ctx.strokeStyle = series.color;
      ctx.lineWidth = 2.2;
      ctx.setLineDash(series.dash);
      ctx.beginPath();
      ctx.moveTo(legendX, legendY);
      ctx.lineTo(legendX + 18, legendY);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = chartPalette.axisStrong;
      ctx.fillText(series.name, legendX + 24, legendY);
      legendX += 24 + ctx.measureText(series.name).width + 18;
    });
    ctx.textBaseline = "alphabetic";
  }

  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, `${color}52`);
  gradient.addColorStop(1, `${color}06`);
  const filledPrimary = primaryPoints.filter((point) => point.y != null);
  if (filledPrimary.length) {
    ctx.beginPath();
    filledPrimary.forEach((point, idx) => {
      if (idx === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.lineTo(filledPrimary[filledPrimary.length - 1].x, height - padding.bottom);
    ctx.lineTo(filledPrimary[0].x, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  seriesDefinitions.forEach((series, seriesIndex) => {
    const points = seriesPoints[seriesIndex];
    let started = false;
    ctx.beginPath();
    points.forEach((point) => {
      if (point.y == null) {
        started = false;
        return;
      }
      if (!started) {
        ctx.moveTo(point.x, point.y);
        started = true;
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    if (!started) {
      return;
    }
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.setLineDash(series.dash);
    if (seriesIndex === 0) {
      ctx.shadowColor = `${series.color}30`;
      ctx.shadowBlur = 16;
    }
    ctx.lineWidth = series.lineWidth;
    ctx.strokeStyle = series.color;
    ctx.stroke();
    ctx.restore();
  });

  const lastPrimary = [...primaryPoints].reverse().find((point) => point.y != null);
  if (lastPrimary) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(lastPrimary.x, lastPrimary.y, compact ? 4 : 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#ffffff";
    ctx.arc(lastPrimary.x, lastPrimary.y, compact ? 1.7 : 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const activePoint = chartState && chartState.activeIndex >= 0 ? primaryPoints[chartState.activeIndex] : null;
  if (activePoint && chartState && !chartState.drag) {
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = chartPalette.guide;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(activePoint.x, padding.top);
    ctx.lineTo(activePoint.x, height - padding.bottom);
    ctx.stroke();
    ctx.restore();

    seriesDefinitions.forEach((series, seriesIndex) => {
      const point = seriesPoints[seriesIndex][chartState.activeIndex];
      if (!point || point.y == null) {
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = series.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(point.x, point.y, compact ? 4.6 : 5.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  } else if (chartState && chartState.tooltip) {
    hideChartTooltip(chartState);
  }

  if (chartState && chartState.drag && chartState.drag.mode === "select") {
    const left = Math.min(chartState.drag.startX, chartState.drag.currentX);
    const selectionWidth = Math.abs(chartState.drag.currentX - chartState.drag.startX);
    if (selectionWidth > 0) {
      ctx.save();
      ctx.fillStyle = chartPalette.selectionFill;
      ctx.strokeStyle = chartPalette.selectionStroke;
      ctx.setLineDash([6, 5]);
      ctx.fillRect(left, padding.top, selectionWidth, chartHeight);
      ctx.strokeRect(left, padding.top, selectionWidth, chartHeight);
      ctx.restore();
    }
  }

  const xLabelIndices = Array.from(
    new Set(
      compact
        ? [0, Math.round((primaryPoints.length - 1) / 2), primaryPoints.length - 1]
        : [
            0,
            Math.round((primaryPoints.length - 1) / 3),
            Math.round(((primaryPoints.length - 1) * 2) / 3),
            primaryPoints.length - 1
          ]
    )
  ).filter((index) => index >= 0 && index < primaryPoints.length);
  ctx.fillStyle = chartPalette.axisStrong;
  ctx.font = compact ? "10px Space Grotesk" : "11px Space Grotesk";
  ctx.textBaseline = "top";
  xLabelIndices.forEach((index) => {
    const point = primaryPoints[index];
    const text = axisLabelFormatter(labels[index] || "");
    const metrics = ctx.measureText(text);
    let x = point.x - metrics.width / 2;
    x = Math.max(padding.left, Math.min(x, width - padding.right - metrics.width));
    ctx.fillText(text, x, height - padding.bottom + 10);
  });
}

function buildCandlestickTooltipContent(candle) {
  return {
    label: formatLineChartTooltipLabel(candle.date || ""),
    value: `C ${formatFloat(toNum(candle.close))}`,
    meta:
      `O ${formatFloat(toNum(candle.open))}  ` +
      `H ${formatFloat(toNum(candle.high))}  ` +
      `L ${formatFloat(toNum(candle.low))}  ` +
      `V ${formatInt(toNum(candle.volume))}`
  };
}

function ensureCandlestickChartState(canvas) {
  if (!canvas) {
    return null;
  }
  if (canvas.__candlestickChartState) {
    return canvas.__candlestickChartState;
  }
  const tooltipState = ensureChartTooltipElements(canvas, true);
  const state = {
    activeIndex: -1,
    candles: [],
    bounds: null,
    ...tooltipState,
    draw: () => {}
  };

  const clearHover = () => {
    if (state.activeIndex === -1) {
      return;
    }
    state.activeIndex = -1;
    hideChartTooltip(state);
    state.draw();
  };

  const updateHover = (event) => {
    if (!state.candles.length || !state.bounds) {
      clearHover();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (
      x < state.bounds.left ||
      x > state.bounds.right ||
      y < state.bounds.top - 18 ||
      y > state.bounds.bottom + 18
    ) {
      clearHover();
      return;
    }

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    state.candles.forEach((point, index) => {
      const distance = Math.abs(point.x - x);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    if (state.activeIndex !== nearestIndex) {
      state.activeIndex = nearestIndex;
      state.draw();
    }

    const candle = state.candles[state.activeIndex];
    if (!candle || !state.tooltip || !state.tooltipLabel || !state.tooltipValue) {
      return;
    }
    const tooltip = buildCandlestickTooltipContent(candle);
    state.tooltipLabel.textContent = tooltip.label;
    state.tooltipValue.textContent = tooltip.value;
    if (state.tooltipMeta) {
      state.tooltipMeta.textContent = tooltip.meta;
    }
    state.tooltip.classList.add("visible");
    positionChartTooltip(state, { x: candle.x, y: candle.bodyTop }, rect);
  };

  canvas.addEventListener("mousemove", updateHover);
  canvas.addEventListener("mouseleave", clearHover);
  canvas.addEventListener("blur", clearHover);
  canvas.style.cursor = "crosshair";
  canvas.__candlestickChartState = state;
  return state;
}

function drawCandlestickChart(canvas, candles) {
  const frame = prepareCanvasFrame(canvas);
  if (!frame) {
    return;
  }
  const { ctx, width, height, compact } = frame;
  const chartState = ensureCandlestickChartState(canvas);
  const chartPalette = getChartPalette();

  if (!candles || candles.length === 0) {
    if (chartState) {
      chartState.candles = [];
      hideChartTooltip(chartState);
    }
    ctx.fillStyle = chartPalette.empty;
    ctx.font = compact ? "13px Space Grotesk" : "14px Space Grotesk";
    ctx.fillText("Brak danych świecowych.", 20, 26);
    return;
  }

  const sample = candles.slice();
  const highs = sample.map((item) => toNum(item.high));
  const lows = sample.map((item) => toNum(item.low));
  const minVal = Math.min(...lows);
  const maxVal = Math.max(...highs);
  const range = maxVal - minVal || 1;

  const pad = compact
    ? { left: 38, right: 10, top: 12, bottom: 22 }
    : { left: 44, right: 12, top: 12, bottom: 24 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const candleSpace = chartWidth / sample.length;
  const candleWidth = Math.max(2, candleSpace * 0.55);
  const yTickCount = 4;

  const chartBackground = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom);
  chartBackground.addColorStop(0, chartPalette.candleBackgroundTop);
  chartBackground.addColorStop(1, chartPalette.candleBackgroundBottom);
  ctx.fillStyle = chartBackground;
  ctx.fillRect(pad.left, pad.top, chartWidth, chartHeight);

  ctx.strokeStyle = chartPalette.grid;
  ctx.lineWidth = 1;
  ctx.fillStyle = chartPalette.axis;
  ctx.font = compact ? "10px IBM Plex Mono" : "11px IBM Plex Mono";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= yTickCount; i += 1) {
    const y = pad.top + (chartHeight / yTickCount) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    const tickValue = maxVal - (range * i) / yTickCount;
    ctx.fillText(formatFloat(tickValue), pad.left - 8, y);
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const candlePoints = sample.map((item, idx) => {
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
    ctx.strokeStyle = up ? chartPalette.up : chartPalette.down;
    ctx.fillStyle = up ? chartPalette.up : chartPalette.down;
    ctx.beginPath();
    ctx.moveTo(x, yHigh);
    ctx.lineTo(x, yLow);
    ctx.stroke();
    const top = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(1.5, Math.abs(yClose - yOpen));
    ctx.fillRect(x - candleWidth / 2, top, candleWidth, bodyHeight);
    return {
      date: item.date || "",
      open,
      close,
      high,
      low,
      volume: toNum(item.volume),
      x,
      bodyTop: top,
      bodyHeight,
      up
    };
  });

  if (chartState) {
    chartState.candles = candlePoints;
    chartState.bounds = {
      left: pad.left,
      right: width - pad.right,
      top: pad.top,
      bottom: height - pad.bottom
    };
    chartState.draw = () => drawCandlestickChart(canvas, candles);
    if (chartState.activeIndex >= candlePoints.length) {
      chartState.activeIndex = -1;
    }
  }

  const activeCandle = chartState && chartState.activeIndex >= 0 ? candlePoints[chartState.activeIndex] : null;
  if (activeCandle) {
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = chartPalette.candleGuide;
    ctx.beginPath();
    ctx.moveTo(activeCandle.x, pad.top);
    ctx.lineTo(activeCandle.x, height - pad.bottom);
    ctx.stroke();
    ctx.restore();

    ctx.lineWidth = 2;
    ctx.strokeStyle = activeCandle.up ? chartPalette.up : chartPalette.down;
    ctx.strokeRect(
      activeCandle.x - candleWidth / 2 - 2,
      activeCandle.bodyTop - 2,
      candleWidth + 4,
      activeCandle.bodyHeight + 4
    );
  } else if (chartState) {
    hideChartTooltip(chartState);
  }

  const first = sample[0];
  const last = sample[sample.length - 1];
  ctx.font = compact ? "10px Space Grotesk" : "12px Space Grotesk";
  ctx.fillStyle = chartPalette.axisStrong;
  ctx.fillText(formatLineChartAxisLabel(first.date || ""), pad.left, height - 6);
  const lastLabel = last.date || "";
  const lastLabelText = formatLineChartAxisLabel(lastLabel);
  const lastLabelWidth = ctx.measureText(lastLabelText).width;
  ctx.fillText(lastLabelText, Math.max(pad.left, width - pad.right - lastLabelWidth), height - 6);
  if (sample.length > 2) {
    const mid = sample[Math.floor(sample.length / 2)];
    const midText = formatLineChartAxisLabel(mid.date || "");
    const midWidth = ctx.measureText(midText).width;
    const midX = pad.left + chartWidth / 2 - midWidth / 2;
    ctx.fillText(midText, Math.max(pad.left, Math.min(midX, width - pad.right - midWidth)), height - 6);
  }
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

function normalizeInflationEnabled(value) {
  if (typeof value === "boolean") {
    return value;
  }
  const text = String(value || "").trim().toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "on";
}

function normalizeInflationRatePct(value) {
  return clamp(toNum(value), 0, 100);
}

function formatInflationRateInput(value) {
  const safeValue = normalizeInflationRatePct(value);
  return Number.isInteger(safeValue) ? String(safeValue) : String(safeValue).replace(/\.0+$/, "");
}

function defaultState() {
  return {
    meta: {
      activePlan: "Expert",
      baseCurrency: "PLN",
      createdAt: nowIso(),
      fxRates: {},
      theme: APPEARANCE_DEFAULTS.theme,
      lastLightTheme: APPEARANCE_DEFAULTS.lastLightTheme,
      iconSet: APPEARANCE_DEFAULTS.iconSet,
      fontScale: APPEARANCE_DEFAULTS.fontScale,
      dashboardInflationEnabled: false,
      dashboardInflationRatePct: 0
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
  const storageCandidates = [STORAGE_KEY].concat(LEGACY_STORAGE_KEYS);
  for (const key of storageCandidates) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      continue;
    }
    try {
      const parsed = JSON.parse(raw);
      const normalized = normalizeState(parsed);
      if (key !== STORAGE_KEY) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      }
      return normalized;
    } catch (error) {
      continue;
    }
  }
  return defaultState();
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
      createdAt: (stateValue.meta && stateValue.meta.createdAt) || fallback.meta.createdAt,
      fxRates: normalizeFxRates(stateValue.meta && stateValue.meta.fxRates),
      theme: normalizeTheme(stateValue.meta && stateValue.meta.theme),
      lastLightTheme: resolveLastLightTheme(stateValue.meta && stateValue.meta.lastLightTheme),
      iconSet: normalizeIconSet(stateValue.meta && stateValue.meta.iconSet),
      fontScale: normalizeFontScale(stateValue.meta && stateValue.meta.fontScale),
      dashboardInflationEnabled: normalizeInflationEnabled(
        stateValue.meta && stateValue.meta.dashboardInflationEnabled
      ),
      dashboardInflationRatePct: normalizeInflationRatePct(
        stateValue.meta && stateValue.meta.dashboardInflationRatePct
      )
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
  if (!options.preserveHistoryCache) {
    invalidateDashboardHistoryCache();
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (!options.skipBackend) {
    scheduleBackendPush();
  }
}

function invalidateDashboardHistoryCache() {
  lineChartViews.dashboard.historySeries = [];
  lineChartViews.dashboard.historySummary = null;
  lineChartViews.dashboard.historyKey = "";
  lineChartViews.dashboard.historyLoading = false;
  lineChartViews.dashboard.historyResolvedKey = "";
  lineChartViews.dashboard.comparisonSeries = [];
  lineChartViews.dashboard.comparisonKey = "";
  lineChartViews.dashboard.comparisonLoading = false;
  lineChartViews.dashboard.comparisonResolvedKey = "";
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

function formatPercent(value) {
  return `${formatFloat(value)}%`;
}

function formatInt(value) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
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
    syncEditingForms,
    normalizeState,
    normalizeTheme,
    resolveLastLightTheme,
    normalizeIconSet,
    normalizeFontScale,
    normalizeFxRates,
    findCurrencyConversionRate,
    applyAppearanceSettings,
    appearanceIconSetConfig,
    onThemeToggle,
    computeMetrics,
    shouldUseBackendMetrics,
    normalizeLineChartRange,
    normalizeLineChartMode,
    sliceLineChartSeriesByRange,
    computeReturnSeries,
    densifySeriesByDay,
    applyInflationToSeries,
    computeDashboardHistorySummary,
    extractBenchmarkSeriesFromRows,
    alignBenchmarkHistoryToSeries,
    buildCandlestickTooltipContent
  };
}
