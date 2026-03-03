"use client";

import { type DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AreaData,
  BaselineData,
  CandlestickData,
  IChartApi,
  ISeriesApi,
  LineData,
  UTCTimestamp,
  createChart,
} from "lightweight-charts";
import {
  CHART_TYPE_OPTIONS,
  INTERVAL_OPTIONS,
  LIMIT_OPTIONS,
  ChartType,
  IntervalType,
  fetchKlines,
  toBinanceSymbol,
} from "@/lib/binance";

type ChartConfig = {
  id: string;
  symbol: string;
  interval: IntervalType;
  type: ChartType;
  limit: number;
};

type Status = {
  message: string;
  error: boolean;
};

type BinanceKlineSocketMessage = {
  k?: {
    t: number;
    o: string;
    h: string;
    l: string;
    c: string;
  };
};

function toSeriesData(type: ChartType, candles: Awaited<ReturnType<typeof fetchKlines>>) {
  if (type === "candlestick") {
    return candles.map(
      (c) =>
        ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }) satisfies CandlestickData
    );
  }

  return candles.map(
    (c) =>
      ({
        time: c.time as UTCTimestamp,
        value: c.close,
      }) satisfies LineData
  );
}

function buildSeries(chart: IChartApi, type: ChartType) {
  if (type === "candlestick") {
    return chart.addCandlestickSeries({
      upColor: "#1b8f4f",
      downColor: "#d43f36",
      borderVisible: false,
      wickUpColor: "#1b8f4f",
      wickDownColor: "#d43f36",
    }) as ISeriesApi<"Candlestick">;
  }

  if (type === "area") {
    return chart.addAreaSeries({
      lineColor: "#d97706",
      topColor: "rgba(217, 119, 6, 0.45)",
      bottomColor: "rgba(217, 119, 6, 0.04)",
    }) as ISeriesApi<"Area">;
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
    }) as ISeriesApi<"Baseline">;
  }

  return chart.addLineSeries({
    color: "#0a6a78",
    lineWidth: 2,
  }) as ISeriesApi<"Line">;
}

function ChartCard({
  config,
  onRemove,
  onStatus,
}: {
  config: ChartConfig;
  onRemove: (id: string) => void;
  onStatus: (status: Status) => void;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<
    ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | ISeriesApi<"Area"> | ISeriesApi<"Baseline"> | null
  >(null);
  const socketRef = useRef<WebSocket | null>(null);

  const title = useMemo(
    () => `${config.symbol} • ${config.interval} • ${config.type}`,
    [config.interval, config.symbol, config.type]
  );

  const loadInitialData = useCallback(async () => {
    try {
      const candles = await fetchKlines(config.symbol, config.interval, config.limit);
      const data = toSeriesData(config.type, candles);

      if (!seriesRef.current) {
        return;
      }

      if (config.type === "candlestick") {
        (seriesRef.current as ISeriesApi<"Candlestick">).setData(data as CandlestickData[]);
      } else if (config.type === "area") {
        (seriesRef.current as ISeriesApi<"Area">).setData(data as AreaData[]);
      } else if (config.type === "baseline") {
        (seriesRef.current as ISeriesApi<"Baseline">).setData(data as BaselineData[]);
      } else {
        (seriesRef.current as ISeriesApi<"Line">).setData(data as LineData[]);
      }

      chartRef.current?.timeScale().fitContent();
      onStatus({
        message: `Initial load: ${config.symbol} ${config.interval}`,
        error: false,
      });
    } catch (error) {
      onStatus({
        message: `Gagal load ${config.symbol} (${config.interval}): ${(error as Error).message}`,
        error: true,
      });
    }
  }, [config.interval, config.limit, config.symbol, config.type, onStatus]);

  const openRealtimeSocket = useCallback(() => {
    const stream = `${config.symbol.toLowerCase()}@kline_${config.interval}`;
    const socket = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}`);

    socket.onopen = () => {
      onStatus({
        message: `Realtime aktif: ${config.symbol} ${config.interval}`,
        error: false,
      });
    };

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as BinanceKlineSocketMessage;
      if (!payload.k || !seriesRef.current) {
        return;
      }

      const time = Math.floor(payload.k.t / 1000) as UTCTimestamp;
      const open = Number(payload.k.o);
      const high = Number(payload.k.h);
      const low = Number(payload.k.l);
      const close = Number(payload.k.c);

      if (config.type === "candlestick") {
        (seriesRef.current as ISeriesApi<"Candlestick">).update({ time, open, high, low, close });
      } else {
        (seriesRef.current as ISeriesApi<"Line"> | ISeriesApi<"Area"> | ISeriesApi<"Baseline">).update({
          time,
          value: close,
        });
      }

      onStatus({
        message: `Update realtime: ${new Date().toLocaleTimeString("id-ID")}`,
        error: false,
      });
    };

    socket.onerror = () => {
      onStatus({
        message: `Koneksi realtime error: ${config.symbol} ${config.interval}`,
        error: true,
      });
    };

    socketRef.current = socket;
  }, [config.interval, config.symbol, config.type, onStatus]);

  useEffect(() => {
    const container = boxRef.current;
    if (!container) {
      return;
    }

    const chart = createChart(container, {
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
      width: container.clientWidth,
      height: container.clientHeight,
    });

    chartRef.current = chart;
    seriesRef.current = buildSeries(chart, config.type);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(container);
    loadInitialData();
    openRealtimeSocket();

    return () => {
      resizeObserver.disconnect();
      socketRef.current?.close();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      socketRef.current = null;
    };
  }, [config.type, loadInitialData, openRealtimeSocket]);

  return (
    <article className="chart-card">
      <div className="chart-toolbar">
        <div className="chart-title">{title}</div>
        <button type="button" className="chart-remove" onClick={() => onRemove(config.id)}>
          Hapus
        </button>
      </div>
      <div ref={boxRef} className="chart-box" />
    </article>
  );
}

export function BinanceMultiChart() {
  const [symbolInput, setSymbolInput] = useState("BTCUSDT");
  const [interval, setIntervalValue] = useState<IntervalType>("1h");
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [limit, setLimit] = useState<number>(200);
  const [charts, setCharts] = useState<ChartConfig[]>([
    {
      id: crypto.randomUUID(),
      symbol: "BTCUSDT",
      interval: "1h",
      type: "candlestick",
      limit: 200,
    },
    {
      id: crypto.randomUUID(),
      symbol: "ETHUSDT",
      interval: "15m",
      type: "line",
      limit: 200,
    },
  ]);
  const [status, setStatus] = useState<Status>({
    message: "Memuat chart default...",
    error: false,
  });
  const [draggedChartId, setDraggedChartId] = useState<string | null>(null);
  const [dragOverChartId, setDragOverChartId] = useState<string | null>(null);

  const reorderCharts = useCallback((items: ChartConfig[], draggedId: string, targetId: string) => {
    if (draggedId === targetId) {
      return items;
    }

    const sourceIndex = items.findIndex((item) => item.id === draggedId);
    const targetIndex = items.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return items;
    }

    const next = [...items];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    return next;
  }, []);

  const handleAddChart = useCallback(() => {
    const symbol = toBinanceSymbol(symbolInput);
    if (!symbol) {
      setStatus({ message: "Pair wajib diisi, contoh: BTCUSDT", error: true });
      return;
    }

    setCharts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        symbol,
        interval,
        type: chartType,
        limit,
      },
    ]);
  }, [chartType, interval, limit, symbolInput]);

  const handleRemove = useCallback((id: string) => {
    setCharts((prev) => {
      const next = prev.filter((chart) => chart.id !== id);
      if (next.length === 0) {
        setStatus({ message: "Tidak ada chart aktif. Tambahkan chart baru.", error: false });
      }
      return next;
    });
  }, []);

  const handleDragStart = useCallback((id: string) => {
    setDraggedChartId(id);
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>, id: string) => {
    event.preventDefault();
    if (draggedChartId && draggedChartId !== id) {
      setDragOverChartId(id);
    }
  }, [draggedChartId]);

  const handleDrop = useCallback((targetId: string) => {
    if (!draggedChartId) {
      return;
    }

    setCharts((prev) => reorderCharts(prev, draggedChartId, targetId));
    setDraggedChartId(null);
    setDragOverChartId(null);
  }, [draggedChartId, reorderCharts]);

  const handleDragEnd = useCallback(() => {
    setDraggedChartId(null);
    setDragOverChartId(null);
  }, []);

  return (
    <section>
      <header>
        <h1>Binance Multi Chart</h1>
        <p className="subtitle">Chart realtime dari WebSocket Binance.</p>
      </header>

      <section className="controls" aria-label="Kontrol chart">
        <label>
          Pair
          <input
            type="text"
            value={symbolInput}
            onChange={(event) => setSymbolInput(event.target.value)}
            placeholder="Contoh: BTCUSDT"
          />
        </label>

        <label>
          Interval
          <select
            value={interval}
            onChange={(event) => setIntervalValue(event.target.value as IntervalType)}
          >
            {INTERVAL_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          Jenis Chart
          <select
            value={chartType}
            onChange={(event) => setChartType(event.target.value as ChartType)}
          >
            {CHART_TYPE_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          Data awal
          <select value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
            {LIMIT_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <button type="button" onClick={handleAddChart}>
          Tambah Chart
        </button>
      </section>

      <section className={`status${status.error ? " error" : ""}`} aria-live="polite">
        {status.message} | {charts.length} chart aktif
      </section>

      <section
        className={`chart-list${charts.length === 1 ? " single" : ""}${
          charts.length > 1 && charts.length % 2 === 1 ? " odd" : ""
        }`}
        aria-label="Daftar chart"
      >
        {charts.map((chart) => (
          <div
            key={chart.id}
            draggable
            className={`chart-dnd-item${dragOverChartId === chart.id ? " drag-over" : ""}`}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              handleDragStart(chart.id);
            }}
            onDragOver={(event) => handleDragOver(event, chart.id)}
            onDrop={() => handleDrop(chart.id)}
            onDragEnd={handleDragEnd}
          >
            <ChartCard config={chart} onRemove={handleRemove} onStatus={setStatus} />
          </div>
        ))}
      </section>

    </section>
  );
}
