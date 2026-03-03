import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Binance Multi Chart",
  description: "Multi chart crypto dengan data Binance API",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
