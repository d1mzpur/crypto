import { NextResponse } from "next/server";

type FearGreedResponse = {
  data?: Array<{
    value?: string;
    value_classification?: string;
    timestamp?: string;
  }>;
};

type CategoryItem = {
  id: string;
  name: string;
  market_cap_change_24h: number | null;
};

type CategoriesResponse = CategoryItem[];

function safeNum(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function GET() {
  const [fearGreedRes, categoriesRes] = await Promise.allSettled([
    fetch("https://api.alternative.me/fng/?limit=1", {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    }),
    fetch("https://api.coingecko.com/api/v3/coins/categories", {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    }),
  ]);

  let fearGreed = {
    value: null as number | null,
    classification: "Unknown",
    timestamp: null as string | null,
  };

  if (fearGreedRes.status === "fulfilled" && fearGreedRes.value.ok) {
    const payload = (await fearGreedRes.value.json()) as FearGreedResponse;
    const entry = payload.data?.[0];
    fearGreed = {
      value: entry?.value ? Number(entry.value) : null,
      classification: entry?.value_classification ?? "Unknown",
      timestamp: entry?.timestamp ?? null,
    };
  }

  let sectors: CategoryItem[] = [];
  if (categoriesRes.status === "fulfilled" && categoriesRes.value.ok) {
    sectors = ((await categoriesRes.value.json()) as CategoriesResponse)
      .filter((item) => item && item.name)
      .map((item) => ({
        id: item.id,
        name: item.name,
        market_cap_change_24h: item.market_cap_change_24h,
      }));
  }

  const sorted = [...sectors].sort(
    (a, b) => safeNum(b.market_cap_change_24h) - safeNum(a.market_cap_change_24h)
  );

  const topPositive = sorted
    .filter((item) => safeNum(item.market_cap_change_24h) > 0)
    .slice(0, 3)
    .map((item) => ({
      name: item.name,
      change24h: safeNum(item.market_cap_change_24h),
    }));

  const topNegative = [...sorted]
    .reverse()
    .filter((item) => safeNum(item.market_cap_change_24h) < 0)
    .slice(0, 3)
    .map((item) => ({
      name: item.name,
      change24h: safeNum(item.market_cap_change_24h),
    }));

  const averageChange =
    sectors.length > 0
      ? sectors.reduce((sum, s) => sum + safeNum(s.market_cap_change_24h), 0) / sectors.length
      : 0;

  const marketBias = averageChange > 0.6 ? "Risk-On" : averageChange < -0.6 ? "Risk-Off" : "Netral";

  return NextResponse.json({
    fearGreed,
    sectorSentiment: {
      marketBias,
      averageChange,
      topPositive,
      topNegative,
    },
    updatedAt: new Date().toISOString(),
  });
}
