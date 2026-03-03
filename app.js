const BINANCE_BASE_URL = "https://api.binance.com";
const REFRESH_MS = 15_000;

const symbolInput = document.getElementById("symbol");
const intervalSelect = document.getElementById("interval");
const chartTypeSelect = document.getElementById("chartType");
const limitSelect = document.getElementById("limit");
const addChartButton = document.getElementById("addChart");
const statusElement = document.getElementById("status");
const chartsContainer = document.getElementById("charts");

const activeCharts = new Map();

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.style.color = isError ? "#aa1e3a" : "#6b645f";
}

function toBinanceSymbol(value) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function mapKlines(klines) {
  return klines.map((kline) => ({
    time: Math.floor(kline[0] / 1000),
    open: Number(kline[1]),
    high: Number(kline[2]),
    low: Number(kline[3]),
    close: Number(kline[4]),
    volume: Number(kline[5]),
  }));
}

async function fetchKlines(symbol, interval, limit) {
  const url = new URL(`${BINANCE_BASE_URL}/api/v3/klines`);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Binance API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return mapKlines(data);
}

function buildSeries(chart, type) {
  if (type === "candlestick") {
    return chart.addCandlestickSeries({
      upColor: "#1b8f4f",
      downColor: "#d43f36",
      borderVisible: false,
      wickUpColor: "#1b8f4f",
      wickDownColor: "#d43f36",
    });
  }

  if (type === "area") {
    return chart.addAreaSeries({
      lineColor: "#d97706",
      topColor: "rgba(217, 119, 6, 0.45)",
      bottomColor: "rgba(217, 119, 6, 0.04)",
    });
  }

  if (type === "baseline") {
    return chart.addBaselineSeries({
      baseValue: { type: "price", price: 0 },
      topLineColor: "#1b8f4f",
      topFillColor1: "rgba(27, 143, 79, 0.32)",
      topFillColor2: "rgba(27, 143, 79, 0.02)",
      bottomLineColor: "#d43f36",
      bottomFillColor1: "rgba(212, 63, 54, 0.02)",
      bottomFillColor2: "rgba(212, 63, 54, 0.28)",
    });
  }

  return chart.addLineSeries({
    color: "#0a6a78",
    lineWidth: 2,
  });
}

function toSeriesData(type, candles) {
  if (type === "candlestick") {
    return candles.map((c) => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
  }

  return candles.map((c) => ({
    time: c.time,
    value: c.close,
  }));
}

function createChartCard({ symbol, interval, type, limit }) {
  const id = crypto.randomUUID();
  const card = document.createElement("article");
  card.className = "chart-card";
  card.dataset.chartId = id;

  const toolbar = document.createElement("div");
  toolbar.className = "chart-toolbar";

  const title = document.createElement("div");
  title.className = "chart-title";
  title.textContent = `${symbol} • ${interval} • ${type}`;

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "chart-remove";
  removeButton.textContent = "Hapus";

  const chartBox = document.createElement("div");
  chartBox.className = "chart-box";

  toolbar.append(title, removeButton);
  card.append(toolbar, chartBox);
  chartsContainer.prepend(card);

  const chart = LightweightCharts.createChart(chartBox, {
    layout: {
      background: { color: "#fffaf0" },
      textColor: "#404040",
    },
    grid: {
      vertLines: { color: "rgba(105, 90, 70, 0.08)" },
      horzLines: { color: "rgba(105, 90, 70, 0.08)" },
    },
    rightPriceScale: {
      borderColor: "rgba(105, 90, 70, 0.2)",
    },
    timeScale: {
      borderColor: "rgba(105, 90, 70, 0.2)",
      timeVisible: true,
    },
  });

  const series = buildSeries(chart, type);

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      chart.applyOptions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    }
  });
  resizeObserver.observe(chartBox);

  removeButton.addEventListener("click", () => {
    const chartState = activeCharts.get(id);
    if (!chartState) {
      return;
    }

    clearInterval(chartState.timer);
    chartState.resizeObserver.disconnect();
    chart.remove();
    card.remove();
    activeCharts.delete(id);

    if (activeCharts.size === 0) {
      setStatus("Tidak ada chart aktif. Tambahkan chart baru.");
    }
  });

  activeCharts.set(id, {
    id,
    symbol,
    interval,
    type,
    limit,
    chart,
    series,
    resizeObserver,
    timer: null,
  });

  return id;
}

async function refreshChart(id) {
  const chartState = activeCharts.get(id);
  if (!chartState) {
    return;
  }

  const { symbol, interval, limit, type, series } = chartState;

  try {
    const candles = await fetchKlines(symbol, interval, limit);
    series.setData(toSeriesData(type, candles));
    chartState.chart.timeScale().fitContent();
    setStatus(
      `Update terakhir: ${new Date().toLocaleTimeString("id-ID")} | ${activeCharts.size} chart aktif`
    );
  } catch (error) {
    setStatus(`Gagal update ${symbol} (${interval}): ${error.message}`, true);
  }
}

function startAutoRefresh(id) {
  refreshChart(id);
  const timer = setInterval(() => refreshChart(id), REFRESH_MS);
  const chartState = activeCharts.get(id);
  if (chartState) {
    chartState.timer = timer;
  }
}

function addChartFromControls() {
  const symbol = toBinanceSymbol(symbolInput.value);
  const interval = intervalSelect.value;
  const type = chartTypeSelect.value;
  const limit = Number(limitSelect.value);

  if (!symbol) {
    setStatus("Pair wajib diisi, contoh: BTCUSDT", true);
    return;
  }

  const id = createChartCard({ symbol, interval, type, limit });
  startAutoRefresh(id);
}

addChartButton.addEventListener("click", addChartFromControls);

createChartCard({ symbol: "BTCUSDT", interval: "1h", type: "candlestick", limit: 200 });
createChartCard({ symbol: "ETHUSDT", interval: "15m", type: "line", limit: 200 });
for (const id of activeCharts.keys()) {
  startAutoRefresh(id);
}
