import { NextResponse } from "next/server";

type FeedItem = {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
};

const FEEDS = [
  {
    source: "Google News",
    url: "https://news.google.com/rss/search?q=donald+trump+truth+social&hl=en-US&gl=US&ceid=US:en",
  },
  {
    source: "Google News",
    url: "https://news.google.com/rss/search?q=donald+trump+statement&hl=en-US&gl=US&ceid=US:en",
  },
  {
    source: "Bing News",
    url: "https://www.bing.com/news/search?q=donald+trump&format=rss",
  },
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

function parseRssItems(xml: string, sourceName: string): FeedItem[] {
  const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

  return itemBlocks
    .map((item) => {
      const title = tagValue(item, "title");
      const link = tagValue(item, "link");
      const pubDate = tagValue(item, "pubDate") || new Date().toUTCString();
      const source = tagValue(item, "source") || sourceName;

      if (!title || !link) {
        return null;
      }

      return {
        title,
        link,
        source,
        publishedAt: pubDate,
      } satisfies FeedItem;
    })
    .filter((item): item is FeedItem => item !== null);
}

async function fetchFeed(source: string, url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TrumpFeedBot/1.0)",
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

  const seen = new Set<string>();
  const unique = items.filter((item) => {
    const key = `${item.title}|${item.link}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  unique.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return NextResponse.json({ items: unique.slice(0, 30) });
}
