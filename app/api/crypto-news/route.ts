import { NextResponse } from "next/server";

type NewsItem = {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
};

const FEEDS = [
  { source: "Google News", url: "https://news.google.com/rss/search?q=crypto+currency&hl=en-US&gl=US&ceid=US:en" },
  { source: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { source: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { source: "Decrypt", url: "https://decrypt.co/feed" },
  { source: "Bitcoin Magazine", url: "https://bitcoinmagazine.com/.rss/full/" },
];

function decodeXmlEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function tagValue(input: string, tag: string) {
  const match = input.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeXmlEntities(match[1]) : "";
}

function parseRssItems(xml: string, sourceName: string): NewsItem[] {
  const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

  return itemBlocks
    .map((item) => {
      const title = tagValue(item, "title");
      const link = tagValue(item, "link");
      const publishedAt = tagValue(item, "pubDate") || new Date().toUTCString();
      const source = tagValue(item, "source") || sourceName;

      if (!title || !link) {
        return null;
      }

      return {
        title,
        link,
        source,
        publishedAt,
      } satisfies NewsItem;
    })
    .filter((item): item is NewsItem => item !== null);
}

async function fetchFeed(source: string, url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; CryptoNewsBot/1.0)",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Failed fetching ${source}: ${response.status}`);
  }

  const xml = await response.text();
  return parseRssItems(xml, source);
}

export async function GET() {
  const results = await Promise.allSettled(FEEDS.map((feed) => fetchFeed(feed.source, feed.url)));

  const items = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

  items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return NextResponse.json({ items: items.slice(0, 30) });
}
