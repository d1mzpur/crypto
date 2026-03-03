"use client";

import { useEffect, useState } from "react";

type DominanceItem = {
  symbol: string;
  value: number;
};

type DominancePayload = {
  dominance: DominanceItem[];
  marketCapUsd: number;
  volume24hUsd: number;
  marketCapChange24h: number;
  activeCryptocurrencies: number;
  updatedAt: string;
};

const CURRENCY_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

export function MarketDominance() {
  const [data, setData] = useState<DominancePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const response = await fetch("/api/market-dominance", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Gagal ambil data dominance (${response.status})`);
        }

        const payload = (await response.json()) as DominancePayload;
        if (!ignore) {
          setData(payload);
          setError(null);
        }
      } catch (err) {
        if (!ignore) {
          setError((err as Error).message);
        }
      }
    }

    load();
    const timer = window.setInterval(load, 60_000);

    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="dominance-section" aria-label="BTC dominance dan market overview">
      <div className="tweet-header">
        <h2>Dominance Market</h2>
        <p>Update tiap 1 menit dari data global market crypto.</p>
      </div>

      {error ? <p className="news-meta error">{error}</p> : null}
      {!data && !error ? <p className="news-meta">Memuat dominance...</p> : null}

      {data ? (
        <>
          <div className="dominance-list">
            {data.dominance.map((item) => (
              <div key={item.symbol} className="dominance-row">
                <div className="dominance-head">
                  <span>{item.symbol}</span>
                  <strong>{item.value.toFixed(2)}%</strong>
                </div>
                <div className="dominance-track">
                  <div className="dominance-fill" style={{ width: `${Math.max(2, Math.min(100, item.value))}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="dominance-meta-grid">
            <div>
              <small>Market Cap</small>
              <p>{CURRENCY_FORMAT.format(data.marketCapUsd)}</p>
            </div>
            <div>
              <small>24h Volume</small>
              <p>{CURRENCY_FORMAT.format(data.volume24hUsd)}</p>
            </div>
            <div>
              <small>Cap Change 24h</small>
              <p className={data.marketCapChange24h >= 0 ? "up" : "down"}>{data.marketCapChange24h.toFixed(2)}%</p>
            </div>
            <div>
              <small>Active Coins</small>
              <p>{data.activeCryptocurrencies.toLocaleString("en-US")}</p>
            </div>
          </div>

          <p className="news-meta">Update: {new Date(data.updatedAt).toLocaleTimeString("id-ID")}</p>
        </>
      ) : null}
    </section>
  );
}
