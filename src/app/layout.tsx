import type { Metadata } from 'next';
import { Cinzel, IM_Fell_English } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  weight: ['400', '700', '900'],
});

const imFell = IM_Fell_English({
  subsets: ['latin'],
  variable: '--font-im-fell',
  style: ['normal', 'italic'],
  weight: '400',
});

export const metadata: Metadata = {
  title: '金融街图志 — Financial Street Cartographer',
  description: '猜出世界金融中心的每一条街道。测试你的城市地理知识，挑战个人最高分。',
  keywords: ['street guessing game', '街道猜谜', 'financial district', 'map game', 'geography quiz'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" className={`${cinzel.variable} ${imFell.variable}`}>
      <body>{children}</body>
    </html>
  );
}
