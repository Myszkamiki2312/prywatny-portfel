// Report table/chart builders, extracted from app.js.
// Receives its app.js collaborators through `deps` — same dependency-injection shape as
// dashboard.js / operations.js / tools.js, which keeps app.js loadable as a classic script.

export function buildReport(deps, reportName, portfolioId) {
  const {
    aggregateOpsByDate,
    average,
    buildSeries,
    computeDrawdownSeries,
    computeMetrics,
    computePeriodReturns,
    computeRollingReturnSeries,
    emptyChart,
    escapeHtml,
    formatFloat,
    formatMoney,
    groupBy,
    lookupAssetLabel,
    lookupName,
    state,
    stddev,
    stripMoney,
    sum,
    toNum
  } = deps;
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
