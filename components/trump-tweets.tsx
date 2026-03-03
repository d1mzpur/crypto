"use client";

import { useEffect, useState } from "react";

type TrumpItem = {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
};

export function TrumpTweets() {
  const [items, setItems] = useState<TrumpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadFeed() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/trump-feed", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Gagal ambil feed Trump (${response.status})`);
        }

        const payload = (await response.json()) as { items: TrumpItem[] };
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

    loadFeed();
    const timer = window.setInterval(loadFeed, 60_000);

    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="tweet-section" aria-label="Update Trump non-Twitter">
      <div className="tweet-header">
        <h2>Update Trump</h2>
        <p>Feed non-Twitter (Google News + Bing News), refresh tiap 1 menit.</p>
      </div>

      {loading ? <p className="news-meta">Memuat feed...</p> : null}
      {error ? <p className="news-meta error">{error}</p> : null}
      {!loading && !error && items.length === 0 ? <p className="news-meta">Belum ada update.</p> : null}

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
