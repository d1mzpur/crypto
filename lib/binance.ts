const BINANCE_BASE_URL = "https://api.binance.com";

export type ChartType = "candlestick" | "line" | "area" | "baseline";

export type IntervalType = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export const INTERVAL_OPTIONS: IntervalType[] = ["1m", "5m", "15m", "1h", "4h", "1d"];
export const CHART_TYPE_OPTIONS: ChartType[] = ["candlestick", "line", "area", "baseline"];
export const LIMIT_OPTIONS = [100, 200, 300, 500] as const;

export function toBinanceSymbol(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function mapKlines(klines: unknown[]) {
  return klines.map((kline) => {
    const row = kline as (number | string)[];
    return {
      time: Math.floor(Number(row[0]) / 1000),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
    };
  }) satisfies Candle[];
}

export async function fetchKlines(symbol: string, interval: IntervalType, limit: number) {
  const url = new URL(`${BINANCE_BASE_URL}/api/v3/klines`);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Binance API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as unknown[];
  return mapKlines(data);
}
