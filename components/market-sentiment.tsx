"use client";

import { useEffect, useState } from "react";

type SentimentPayload = {
  fearGreed: {
    value: number | null;
    classification: string;
    timestamp: string | null;
  };
  sectorSentiment: {
    marketBias: string;
    averageChange: number;
    topPositive: Array<{ name: string; change24h: number }>;
    topNegative: Array<{ name: string; change24h: number }>;
  };
  updatedAt: string;
};

export function MarketSentiment() {
  const [data, setData] = useState<SentimentPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const response = await fetch("/api/market-sentiment", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Gagal ambil sentiment (${response.status})`);
        }

        const payload = (await response.json()) as SentimentPayload;
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
    <section className="sentiment-section" aria-label="Crypto sentiment">
      <h2>Crypto Sentiment</h2>

      {error ? <p className="news-meta error">{error}</p> : null}
      {!data && !error ? <p className="news-meta">Memuat sentiment...</p> : null}

      {data ? (
        <>
          <div className="sentiment-grid">
            <article className="sentiment-card">
              <h3>Fear &amp; Greed</h3>
              <p className="sentiment-big">{data.fearGreed.value ?? "-"}</p>
              <p className="news-meta">{data.fearGreed.classification}</p>
            </article>

            <article className="sentiment-card">
              <h3>Arah Pasar</h3>
              <p className="sentiment-big">{data.sectorSentiment.marketBias}</p>
              <p className="news-meta">Rata-rata sektor 24h: {data.sectorSentiment.averageChange.toFixed(2)}%</p>
            </article>
          </div>

          <div className="sentiment-list-wrap">
            <article className="sentiment-card">
              <h3>Sektor Kuat (24h)</h3>
              <ul className="sentiment-list">
                {data.sectorSentiment.topPositive.map((item) => (
                  <li key={item.name}>
                    <span>{item.name}</span>
                    <strong className="up">+{item.change24h.toFixed(2)}%</strong>
                  </li>
                ))}
              </ul>
            </article>

            <article className="sentiment-card">
              <h3>Sektor Lemah (24h)</h3>
              <ul className="sentiment-list">
                {data.sectorSentiment.topNegative.map((item) => (
                  <li key={item.name}>
                    <span>{item.name}</span>
                    <strong className="down">{item.change24h.toFixed(2)}%</strong>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <p className="news-meta">Update: {new Date(data.updatedAt).toLocaleTimeString("id-ID")}</p>
        </>
      ) : null}
    </section>
  );
}
