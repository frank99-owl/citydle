'use client';

import { memo } from 'react';
import { Language, MapProvider, Difficulty } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n';

interface MapSettingsProps {
  lang: Language;
  mapProvider: MapProvider;
  difficulty: Difficulty;
  onProviderChange: (provider: MapProvider) => void;
  onDifficultyChange: (difficulty: Difficulty) => void;
}

export const MapSettings = memo(function MapSettings({ lang, mapProvider, difficulty, onProviderChange, onDifficultyChange }: MapSettingsProps) {
  const t = TRANSLATIONS[lang];

  const selectStyle = {
    padding: '0.6rem 1rem',
    background: '#1a1610',
    color: '#f4ebd0',
    border: '1px solid rgba(197,160,89,0.45)',
    borderRadius: '4px',
    fontFamily: 'var(--font-serif), serif',
    fontSize: '0.9rem',
    outline: 'none',
    cursor: 'pointer',
    width: '100%',
  };

  const labelStyle = {
    fontFamily: 'var(--font-cinzel), serif',
    fontSize: '0.8rem',
    color: 'rgba(244,235,208,0.7)',
    letterSpacing: '0.1em',
    textAlign: 'center' as const,
  };

  return (
    <section className="vintage-panel" style={{
      width: '100%',
      maxWidth: '900px',
      zIndex: 1,
      marginBottom: '2rem',
      padding: '1.5rem',
      background: 'linear-gradient(135deg, rgba(244,235,208,0.08) 0%, rgba(197,160,89,0.05) 100%)',
      border: '1px solid rgba(197,160,89,0.3)',
      borderRadius: '4px',
      boxSizing: 'border-box'
    }}>
      <h3 style={{
        fontFamily: 'var(--font-cinzel), serif',
        color: '#c5a059',
        fontSize: '1rem',
        letterSpacing: '0.15em',
        margin: '0 0 1.25rem 0',
        textAlign: 'center',
        textTransform: 'uppercase',
      }}>
        ⚙️ {t.mapSettingsTitle}
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        width: '100%',
        maxWidth: '720px',
        margin: '0 auto',
      }}>
        {/* Map Provider Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={labelStyle}>🗺️ {t.mapProviderLabel}</label>
          <select
            value={mapProvider}
            onChange={(e) => onProviderChange(e.target.value as MapProvider)}
            style={selectStyle}
          >
            <option value="cartodb-dark">{t.mapProviderCartoDark}</option>
            <option value="cartodb">{t.mapProviderCarto}</option>
            <option value="osm">{t.mapProviderOSM}</option>
            <option value="amap">{t.mapProviderAmap}</option>
          </select>
        </div>

        {/* Difficulty Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={labelStyle}>⚖️ {t.difficultyLabel}</label>
          <select
            value={difficulty}
            onChange={(e) => onDifficultyChange(e.target.value as Difficulty)}
            style={selectStyle}
          >
            <option value="easy">{t.difficultyEasy}</option>
            <option value="medium">{t.difficultyMedium}</option>
            <option value="hard">{t.difficultyHard}</option>
          </select>
        </div>
      </div>
    </section>
  );
});
