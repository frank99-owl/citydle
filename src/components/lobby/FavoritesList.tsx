'use client';

import { Favorite, Language } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n';

interface FavoritesListProps {
  favorites: Favorite[];
  lang: Language;
  onStart: (fav: Favorite) => void;
  onDelete: (id: number) => void;
}

export function FavoritesList({ favorites, lang, onStart, onDelete }: FavoritesListProps) {
  const t = TRANSLATIONS[lang];

  if (favorites.length === 0) {
    return (
      <p style={{ color: 'rgba(244,235,208,0.3)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
        {t.noFavorites}
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {favorites.map(fav => (
        <div key={fav.id} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.6rem 0.75rem',
          background: 'rgba(197,160,89,0.05)',
          border: '1px solid rgba(197,160,89,0.15)',
          borderRadius: '3px',
        }}>
          <div>
            <span style={{ color: '#f4ebd0', fontSize: '0.9rem' }}>⭐ {fav.name}</span>
            {fav.cityName && <span style={{ color: 'rgba(197,160,89,0.6)', fontSize: '0.75rem', marginLeft: '0.5rem', fontStyle: 'italic' }}>{fav.cityName}</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => onStart(fav)}
              style={{ background: '#c5a059', color: '#2c2519', border: 'none', borderRadius: '2px', padding: '0.25rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font-cinzel), serif' }}
            >{t.startBtn}</button>
            <button
              onClick={() => onDelete(fav.id)}
              style={{ background: 'none', color: 'rgba(138,51,36,0.7)', border: '1px solid rgba(138,51,36,0.4)', borderRadius: '2px', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}
            >{t.deleteBtn}</button>
          </div>
        </div>
      ))}
    </div>
  );
}
