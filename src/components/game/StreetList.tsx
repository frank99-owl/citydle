'use client';

import { memo, useState, useMemo } from 'react';
import { Street, Language, StreetFilter } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n';

interface StreetListProps {
  lang: Language;
  streets: Street[];
  guessedCount: number;
}

export const StreetList = memo(function StreetList({ lang, streets, guessedCount }: StreetListProps) {
  const t = TRANSLATIONS[lang];
  const [filter, setFilter] = useState<StreetFilter>('all');

  const filteredStreets = useMemo(() => {
    switch (filter) {
      case 'guessed':
        return streets.filter(s => s.guessed);
      case 'unguessed':
        return streets.filter(s => !s.guessed);
      default:
        return streets;
    }
  }, [streets, filter]);

  const total = streets.length;
  const guessed = streets.filter(s => s.guessed).length;

  const filterButtons: { key: StreetFilter; label: string; count: number }[] = [
    { key: 'all', label: t.filterAll, count: total },
    { key: 'guessed', label: t.filterGuessed, count: guessed },
    { key: 'unguessed', label: t.filterUnguessed, count: total - guessed },
  ];

  return (
    <div style={{
      flex: 1, overflowY: 'auto', border: '1px solid rgba(66,48,35,0.15)',
      borderRadius: '2px', background: '#fbf8f0', padding: '0.5rem', marginBottom: '1rem',
    }}>
      {/* Header with count */}
      <div style={{
        fontSize: '0.75rem', fontFamily: 'var(--font-cinzel)',
        borderBottom: '1px solid rgba(66,48,35,0.1)', paddingBottom: '0.25rem',
        marginBottom: '0.5rem', color: '#c5a059',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>{t.unlockedStreets} ({guessed})</span>
        <span style={{ color: '#8a7a65' }}>{t.streetCount.replace('{total}', String(total))}</span>
      </div>

      {/* Filter buttons */}
      <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.5rem' }}>
        {filterButtons.map(btn => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            style={{
              flex: 1, padding: '0.25rem 0.4rem', fontSize: '0.7rem',
              fontFamily: 'var(--font-cinzel)',
              border: filter === btn.key ? '1px solid #c5a059' : '1px solid rgba(66,48,35,0.2)',
              background: filter === btn.key ? '#c5a059' : 'transparent',
              color: filter === btn.key ? '#2c2519' : '#6b5c3d',
              cursor: 'pointer', borderRadius: '2px',
              transition: 'all 0.2s',
            }}
          >
            {btn.label} ({btn.count})
          </button>
        ))}
      </div>

      {/* Street list */}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
        {filteredStreets.map((s, idx) => (
          <li
            key={idx}
            style={{
              padding: '0.2rem 0.4rem',
              borderBottom: '1px dashed rgba(66,48,35,0.08)',
              color: s.guessed ? '#3a5f43' : '#b0a899',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.3s',
            }}
          >
            <span style={{ fontSize: '0.9rem', width: '1.2em', textAlign: 'center' }}>
              {s.guessed ? '✓' : '?'}
            </span>
            <span style={{
              textDecoration: s.guessed ? 'none' : 'none',
              letterSpacing: s.guessed ? '0' : '0.15em',
            }}>
              {s.guessed ? s.name : '• • •'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
});
