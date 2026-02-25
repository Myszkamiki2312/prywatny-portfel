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
