'use client';

import { Street, Language } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n';

interface StreetListProps {
  lang: Language;
  streets: Street[];
  guessedCount: number;
}

export function StreetList({ lang, streets, guessedCount }: StreetListProps) {
  const t = TRANSLATIONS[lang];

  return (
    <div style={{ flex: 1, overflowY: 'auto', border: '1px solid rgba(66,48,35,0.15)', borderRadius: '2px', background: '#fbf8f0', padding: '0.5rem', marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-cinzel)', borderBottom: '1px solid rgba(66,48,35,0.1)', paddingBottom: '0.25rem', marginBottom: '0.5rem', color: '#c5a059' }}>
        {t.unlockedStreets} ({guessedCount})
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
        {streets.filter(s => s.guessed).map((s, idx) => (
          <li key={idx} style={{ padding: '0.2rem 0.4rem', borderBottom: '1px dashed rgba(66,48,35,0.08)', color: '#3a5f43' }}>
            ✓ {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
