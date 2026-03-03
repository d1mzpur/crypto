"use client";

import { useEffect, useState } from "react";

type NewsItem = {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
};

export function CryptoNews() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadNews() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/crypto-news", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Gagal ambil berita (${response.status})`);
        }

        const payload = (await response.json()) as { items: NewsItem[] };
        if (!ignore) {
          setItems(payload.items || []);
        }
      } catch (err) {
        if (!ignore) {
          setError((err as Error).message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadNews();
    const timer = window.setInterval(loadNews, 60_000);

    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="news-section" aria-label="Berita crypto">
      <div className="news-header">
        <h2>Berita Crypto</h2>
        <p>Gabungan headline dari berbagai media crypto dan media umum.</p>
      </div>

      {loading ? <p className="news-meta">Memuat berita...</p> : null}
      {error ? <p className="news-meta error">{error}</p> : null}
      {!loading && !error && items.length === 0 ? <p className="news-meta">Belum ada berita.</p> : null}

      <div className="news-list">
        {items.map((item) => (
          <article key={`${item.link}-${item.publishedAt}`} className="news-card">
            <a href={item.link} target="_blank" rel="noreferrer" className="news-title">
              {item.title}
            </a>
            <div className="news-foot">
              <span>{item.source}</span>
              <span>{new Date(item.publishedAt).toLocaleString("id-ID")}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
