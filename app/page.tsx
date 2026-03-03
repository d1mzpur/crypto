import { BinanceMultiChart } from "@/components/binance-multi-chart";
import { CryptoNews } from "@/components/crypto-news";
import { MarketDominance } from "@/components/market-dominance";
import { MarketSentiment } from "@/components/market-sentiment";
import { ThemeToggle } from "@/components/theme-toggle";
import { TrumpTweets } from "@/components/trump-tweets";

export default function HomePage() {
  return (
    <main className="app">
      <div className="topbar">
        <ThemeToggle />
      </div>

      <div className="dashboard-layout">
        <aside className="news-column">
          <div className="left-stack">
            <MarketSentiment />
            <CryptoNews />
          </div>
        </aside>

        <section className="chart-column">
          <BinanceMultiChart />
        </section>

        <aside className="tweet-column">
          <div className="right-stack">
            <MarketDominance />
            <TrumpTweets />
          </div>
        </aside>
      </div>
    </main>
  );
}
