import type { Metadata } from "next";
import { Cinzel, IM_Fell_English } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  weight: ["400", "700", "900"],
});

const imFell = IM_Fell_English({
  subsets: ["latin"],
  variable: "--font-im-fell",
  style: ["normal", "italic"],
  weight: "400",
});

const SITE_URL = "https://street-guesser.vercel.app"; // TODO: update with real domain

export const metadata: Metadata = {
  title: "Citydle · 每日街图 — Read the Map, Name the City",
  description:
    "每天一座城市，只给你它真实的路网骨架，6 条线索内认出是哪儿。A daily map-reading puzzle: identify a city from its real road network, one clue at a time.",
  keywords: [
    "citydle",
    "每日街图",
    "map guessing game",
    "city guessing",
    "street map",
    "geography quiz",
    "daily puzzle",
    "城市地理",
    "road network",
    "OpenStreetMap",
  ],
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: SITE_URL,
    siteName: "Citydle · 每日街图",
    title: "Citydle · 每日街图 — Read the Map, Name the City",
    description:
      "每天一座城市，只给你它真实的路网骨架，6 条线索内认出是哪儿。",
  },
  twitter: {
    card: "summary_large_image",
    title: "Citydle · 每日街图 — Read the Map, Name the City",
    description:
      "每天一座城市，只给你它真实的路网骨架，6 条线索内认出是哪儿。",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh" className={`${cinzel.variable} ${imFell.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Citydle · 每日街图",
              description:
                "每天一座城市，只给你它真实的路网骨架，6 条线索内认出是哪儿。",
              url: SITE_URL,
              applicationCategory: "Game",
              operatingSystem: "Web",
              inLanguage: ["zh-CN", "en"],
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
            }),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
