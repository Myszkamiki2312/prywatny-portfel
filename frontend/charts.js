// Canvas chart rendering: frame setup, axis/tooltip formatting, palette, line chart and
// candlestick chart. Extracted from app.js as one cohesive cluster.
//
// Unlike the other frontend modules, this one takes its four collaborators once through
// configureCharts() instead of on every call. They are pure formatters that never change, so
// there is no staleness risk, and binding them at module scope keeps the ~930 moved lines
// byte-identical to what they were in app.js.

let formatFloat;
let formatInt;
let toNum;
let toChartNumOrNull;

export function configureCharts(deps) {
  ({ formatFloat, formatInt, toNum, toChartNumOrNull } = deps);
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

export function formatLineChartAxisLabel(label) {
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

export function readCssVarValue(name, fallback) {
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

function restoreCanvasChartFallback(canvas) {
  if (!canvas) {
    return;
  }
  canvas.style.display = "block";
  canvas.style.visibility = "";
  canvas.style.height = "";
  if (canvas.parentElement) {
    canvas.parentElement.querySelectorAll(".pro-chart-container").forEach((node) => node.remove());
  }
}

export function drawLineChart(canvas, labels, values, options = {}) {
  if (window.drawProLineChart && !options.preferCanvas) {
    try {
      if (window.drawProLineChart(canvas, labels, values, options) === true) {
        return;
      }
    } catch (error) {
      if (!String(error && error.message ? error.message : error).includes("LightweightCharts")) {
        throw error;
      }
    }
  }
  restoreCanvasChartFallback(canvas);
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

export function buildCandlestickTooltipContent(candle) {
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

export function drawCandlestickChart(canvas, candles) {
  if (window.drawProCandleChart) {
    if (window.drawProCandleChart(canvas, candles) === true) {
      return;
    }
  }
  restoreCanvasChartFallback(canvas);
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
