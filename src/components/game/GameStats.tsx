'use client';

import { memo } from 'react';
import { Language } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n';

interface GameStatsProps {
  lang: Language;
  mapName: string;
  guessedCount: number;
  totalStreets: number;
}

export const GameStats = memo(function GameStats({ lang, mapName, guessedCount, totalStreets }: GameStatsProps) {
  const t = TRANSLATIONS[lang];

  return (
    <div style={{
      background: '#e6dfc7', padding: '1rem', borderRadius: '2px',
      border: '1px solid rgba(66,48,35,0.2)', marginBottom: '1.25rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontFamily: 'var(--font-cinzel)' }}>{t.currentMap}:</span>
        <strong style={{ fontSize: '0.9rem' }}>{mapName}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontFamily: 'var(--font-cinzel)' }}>{t.guessedStreets}:</span>
        <strong style={{ fontSize: '1.1rem', color: '#3a5f43' }}>{guessedCount} / {totalStreets}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontFamily: 'var(--font-cinzel)' }}>{t.completionRate}:</span>
        <strong>{totalStreets > 0 ? (guessedCount / totalStreets * 100).toFixed(1) : 0}%</strong>
      </div>
    </div>
  );
});
