/**
 * Modern "Pro" Charts using TradingView Lightweight Charts
 * Vibe: XTB Premium
 * Fixed: Prevents multiple chart duplication and layout issues.
 */

const proChartsStore = new Map();

function getOrCreateProChart(canvas, type = 'line') {
  const canvasId = canvas.id || 'default-chart';
  const container = canvas.parentElement;

  // 1. Check if we already have an instance for this specific canvas ID
  if (proChartsStore.has(canvasId)) {
    const instance = proChartsStore.get(canvasId);
    // If the container is still in DOM, return it
    if (document.body.contains(instance.chartContainer)) {
      canvas.style.display = 'none'; // Ensure canvas stays hidden
      return instance;
    } else {
      // Container was removed from DOM, cleanup and recreate
      instance.chart.remove();
      proChartsStore.delete(canvasId);
    }
  }

  // 2. Clean up any "orphaned" pro containers in this parent
  const existingContainers = container.querySelectorAll('.pro-chart-container');
  existingContainers.forEach(el => el.remove());

  // 3. Hide the original canvas
  canvas.style.display = 'none';
  
  // 4. Create new container
  const chartContainer = document.createElement('div');
  chartContainer.className = 'pro-chart-container';
  chartContainer.style.width = '100%';
  chartContainer.style.height = (canvas.height || 300) + 'px';
  chartContainer.style.background = '#161a1e'; // Force dark background
  container.appendChild(chartContainer);

  const chart = LightweightCharts.createChart(chartContainer, {
    layout: {
      background: { type: 'solid', color: '#161a1e' },
      textColor: '#848e9c',
      fontSize: 12,
      fontFamily: 'IBM Plex Sans, sans-serif',
    },
    grid: {
      vertLines: { color: '#2b3139' },
      horzLines: { color: '#2b3139' },
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
    },
    rightPriceScale: {
      borderColor: '#2b3139',
    },
    timeScale: {
      borderColor: '#2b3139',
      timeVisible: true,
      secondsVisible: false,
    },
  });

  const series = type === 'line' 
    ? chart.addLineSeries({
        color: '#1c73ff',
        lineWidth: 2,
      })
    : chart.addCandlestickSeries({
        upColor: '#00c076',
        downColor: '#ff4d4d',
        borderVisible: false,
        wickUpColor: '#00c076',
        wickDownColor: '#ff4d4d',
      });

  const chartInstance = { chart, series, type, chartContainer };
  proChartsStore.set(canvasId, chartInstance);
  
  // Resize handler
  const resizeObserver = new ResizeObserver(() => {
    chart.applyOptions({ 
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight 
    });
  });
  resizeObserver.observe(chartContainer);

  return chartInstance;
}

window.drawProLineChart = function(canvas, labels, values, options = {}) {
  if (!canvas || !labels || labels.length === 0) return;
  try {
    const chartInstance = getOrCreateProChart(canvas, 'line');
    const { chart, series } = chartInstance;
    
    const data = labels.map((label, i) => {
      const time = label.includes('T') ? label.split('T')[0] : label;
      return { time, value: parseFloat(values[i]) || 0 };
    }).filter(d => d.time);

    data.sort((a, b) => a.time.localeCompare(b.time));
    
    const uniqueData = [];
    const seenTimes = new Set();
    for (const d of data) {
      if (!seenTimes.has(d.time)) {
        uniqueData.push(d);
        seenTimes.add(d.time);
      }
    }

    if (uniqueData.length > 0) {
        series.setData(uniqueData);
    }

    // Handle comparison series
    if (options.series && Array.isArray(options.series)) {
      if (!chartInstance.comparisonSeries) chartInstance.comparisonSeries = [];
      
      // Clean up old comparison series
      chartInstance.comparisonSeries.forEach(s => chart.removeSeries(s));
      chartInstance.comparisonSeries = [];

      options.series.forEach((comp, idx) => {
        if (!comp.values || comp.values.length === 0) return;
        
        const compSeries = chart.addLineSeries({
          color: comp.color || '#848e9c',
          lineWidth: 1,
          lineStyle: LightweightCharts.LineStyle.Dashed,
        });
        
        const compData = labels.map((label, i) => {
          const time = label.includes('T') ? label.split('T')[0] : label;
          return { time, value: parseFloat(comp.values[i]) || 0 };
        }).filter(d => d.time);

        compData.sort((a, b) => a.time.localeCompare(b.time));
        const uniqueCompData = [];
        const seenCompTimes = new Set();
        for (const d of compData) {
          if (!seenCompTimes.has(d.time)) {
            uniqueCompData.push(d);
            seenCompTimes.add(d.time);
          }
        }
        if (uniqueCompData.length > 0) {
            compSeries.setData(uniqueCompData);
            chartInstance.comparisonSeries.push(compSeries);
        } else {
            chart.removeSeries(compSeries);
        }
      });
    }

    chart.timeScale().fitContent();
  } catch (e) {
    console.error('Pro Chart Error:', e);
  }
};

window.drawProCandleChart = function(canvas, candles) {
  if (!canvas || !candles || candles.length === 0) return;
  try {
    const { chart, series } = getOrCreateProChart(canvas, 'candle');
    
    const data = candles.map(c => ({
      time: c.date.includes('T') ? c.date.split('T')[0] : c.date,
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close),
    })).filter(d => d.time);

    data.sort((a, b) => a.time.localeCompare(b.time));
    
    const uniqueData = [];
    const seenTimes = new Set();
    for (const d of data) {
      if (!seenTimes.has(d.time)) {
        uniqueData.push(d);
        seenTimes.add(d.time);
      }
    }

    if (uniqueData.length > 0) {
        series.setData(uniqueData);
        chart.timeScale().fitContent();
    }
  } catch (e) {
    console.error('Pro Candle Chart Error:', e);
  }
};
