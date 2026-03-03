import { NextResponse } from "next/server";

type GlobalResponse = {
  data?: {
    total_market_cap?: Record<string, number>;
    total_volume?: Record<string, number>;
    market_cap_percentage?: Record<string, number>;
    market_cap_change_percentage_24h_usd?: number;
    active_cryptocurrencies?: number;
  };
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function GET() {
  const response = await fetch("https://api.coingecko.com/api/v3/global", {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    return NextResponse.json({ error: `Failed to fetch global market (${response.status})` }, { status: 502 });
  }

  const payload = (await response.json()) as GlobalResponse;
  const data = payload.data;
  const marketCapPercentage = data?.market_cap_percentage ?? {};

  const btc = Number(marketCapPercentage.btc ?? 0);
  const eth = Number(marketCapPercentage.eth ?? 0);
  const usdt = Number(marketCapPercentage.usdt ?? 0);
  const bnb = Number(marketCapPercentage.bnb ?? 0);
  const others = Math.max(0, 100 - btc - eth - usdt - bnb);

  const dominance = [
    { symbol: "BTC", value: round2(btc) },
    { symbol: "ETH", value: round2(eth) },
    { symbol: "USDT", value: round2(usdt) },
    { symbol: "BNB", value: round2(bnb) },
    { symbol: "OTHERS", value: round2(others) },
  ];

  return NextResponse.json({
    dominance,
    marketCapUsd: Number(data?.total_market_cap?.usd ?? 0),
    volume24hUsd: Number(data?.total_volume?.usd ?? 0),
    marketCapChange24h: Number(data?.market_cap_change_percentage_24h_usd ?? 0),
    activeCryptocurrencies: Number(data?.active_cryptocurrencies ?? 0),
    updatedAt: new Date().toISOString(),
  });
}
