import type { Metadata } from "next";
import { Cinzel, IM_Fell_English } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

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
  title: "金融街图志 — Financial Street Cartographer",
  description:
    "猜出世界金融中心的每一条街道。测试你的城市地理知识，挑战个人最高分。A geography game where you name streets on vintage maps of the world's financial districts.",
  keywords: [
    "street guessing game",
    "街道猜谜",
    "financial district",
    "map game",
    "geography quiz",
    "GeoGuessr",
    "城市地理",
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
    siteName: "金融街图志",
    title: "金融街图志 — Financial Street Cartographer",
    description:
      "猜出世界金融中心的每一条街道。测试你的城市地理知识，挑战个人最高分。",
  },
  twitter: {
    card: "summary_large_image",
    title: "金融街图志 — Financial Street Cartographer",
    description:
      "猜出世界金融中心的每一条街道。测试你的城市地理知识，挑战个人最高分。",
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
              name: "金融街图志 — Financial Street Cartographer",
              description:
                "猜出世界金融中心的每一条街道。测试你的城市地理知识，挑战个人最高分。",
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
