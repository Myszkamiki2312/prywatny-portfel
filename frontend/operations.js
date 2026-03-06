function normalizeText(value) {
  return String(value == null ? "" : value).trim().toLocaleLowerCase("pl-PL");
}

function parseOptionalNumber(value) {
  const text = String(value == null ? "" : value).trim();
  if (!text) {
    return null;
  }
  const parsed = Number(text.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function filterOperations(operations, filters, helpers) {
  const {
    state,
    lookupName,
    lookupAssetLabel
  } = helpers;
  const search = normalizeText(filters.search);
  const type = String(filters.type || "");
  const portfolioId = String(filters.portfolioId || "");
  const accountId = String(filters.accountId || "");
  const dateFrom = String(filters.dateFrom || "");
  const dateTo = String(filters.dateTo || "");
  const amountMin = parseOptionalNumber(filters.amountMin);
  const amountMax = parseOptionalNumber(filters.amountMax);

  return operations.filter((operation) => {
    if (type && operation.type !== type) {
      return false;
    }
    if (portfolioId && operation.portfolioId !== portfolioId) {
      return false;
    }
    if (accountId && operation.accountId !== accountId) {
      return false;
    }
    if (dateFrom && String(operation.date || "") < dateFrom) {
      return false;
    }
    if (dateTo && String(operation.date || "") > dateTo) {
      return false;
    }
    const amount = Number(operation.amount || 0);
    if (amountMin != null && amount < amountMin) {
      return false;
    }
    if (amountMax != null && amount > amountMax) {
      return false;
    }
    if (!search) {
      return true;
    }
    const haystack = [
      operation.date,
      operation.type,
      lookupName(state.portfolios, operation.portfolioId),
      lookupName(state.accounts, operation.accountId),
      lookupAssetLabel(operation.assetId),
      lookupAssetLabel(operation.targetAssetId),
      operation.note,
      operation.currency,
      Array.isArray(operation.tags) ? operation.tags.join(", ") : ""
    ]
      .map((item) => normalizeText(item))
      .join(" ");
    return haystack.includes(search);
  });
}

export function renderOperations(deps) {
  const {
    dom,
    state,
    lookupName,
    lookupAssetLabel,
    escapeHtml,
    formatFloat,
    formatMoney,
    renderTable
  } = deps;

  const filters = {
    search: dom.operationHistorySearchInput ? dom.operationHistorySearchInput.value : "",
    dateFrom: dom.operationHistoryDateFromInput ? dom.operationHistoryDateFromInput.value : "",
    dateTo: dom.operationHistoryDateToInput ? dom.operationHistoryDateToInput.value : "",
    type: dom.operationHistoryTypeSelect ? dom.operationHistoryTypeSelect.value : "",
    portfolioId: dom.operationHistoryPortfolioSelect ? dom.operationHistoryPortfolioSelect.value : "",
    accountId: dom.operationHistoryAccountSelect ? dom.operationHistoryAccountSelect.value : "",
    amountMin: dom.operationHistoryAmountMinInput ? dom.operationHistoryAmountMinInput.value : "",
    amountMax: dom.operationHistoryAmountMaxInput ? dom.operationHistoryAmountMaxInput.value : ""
  };

  const filteredOperations = filterOperations(state.operations, filters, {
    state,
    lookupName,
    lookupAssetLabel
  });

  const rows = filteredOperations
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

  if (dom.operationHistoryInfo) {
    const activeFilters = [
      filters.search,
      filters.dateFrom,
      filters.dateTo,
      filters.type,
      filters.portfolioId,
      filters.accountId,
      filters.amountMin,
      filters.amountMax
    ].filter(Boolean).length;
    dom.operationHistoryInfo.textContent = activeFilters
      ? `Pokazano ${filteredOperations.length} z ${state.operations.length} operacji`
      : `Łącznie operacji: ${state.operations.length}`;
  }

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

export function renderRecurring(deps) {
  const { dom, state, lookupName, lookupAssetLabel, escapeHtml, formatMoney, renderTable } = deps;
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
