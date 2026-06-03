'use client';

import { memo } from 'react';
import { Preset, Language } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n';

interface PresetCardsProps {
  presets: Preset[];
  lang: Language;
  onSelect: (preset: Preset) => void;
  onCustom: () => void;
}

export const PresetCards = memo(function PresetCards({ presets, lang, onSelect, onCustom }: PresetCardsProps) {
  const t = TRANSLATIONS[lang];

  return (
    <section style={{ width: '100%', maxWidth: '1100px', zIndex: 1, marginBottom: '3rem' }}>
      <h2 style={{
        fontFamily: 'var(--font-cinzel), serif',
        color: '#c5a059',
        fontSize: '0.8rem',
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        textAlign: 'center',
        marginBottom: '1.5rem',
        opacity: 0.8,
      }}>{t.selectCenter}</h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: '1.25rem',
      }}>
        {presets.map(preset => {
          const nameDisplay = lang === 'zh' ? preset.name : preset.name.split(' ').slice(1).join(' ') || preset.name;
          return (
            <button
              key={preset.id}
              id={`preset-${preset.id}`}
              onClick={() => onSelect(preset)}
              style={{
                background: 'linear-gradient(135deg, rgba(244,235,208,0.08) 0%, rgba(197,160,89,0.05) 100%)',
                border: '1px solid rgba(197,160,89,0.35)',
                borderRadius: '4px',
                padding: '1.75rem 1rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'center',
                color: '#f4ebd0',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(197,160,89,0.2) 0%, rgba(197,160,89,0.08) 100%)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#c5a059';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 30px rgba(197,160,89,0.2)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(244,235,208,0.08) 0%, rgba(197,160,89,0.05) 100%)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(197,160,89,0.35)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{preset.emoji}</div>
              <div style={{
                fontFamily: 'var(--font-cinzel), serif',
                fontWeight: 700,
                fontSize: '0.95rem',
                letterSpacing: '0.05em',
                marginBottom: '0.35rem',
              }}>{nameDisplay}</div>
              <div style={{
                fontFamily: 'var(--font-im-fell), Georgia, serif',
                fontStyle: 'italic',
                fontSize: '0.8rem',
                color: 'rgba(197,160,89,0.8)',
              }}>{preset.subtitle}</div>
            </button>
          );
        })}
      </div>

      {/* Custom area button */}
      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <button
          id="custom-area-btn"
          onClick={onCustom}
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            fontSize: '0.85rem',
            letterSpacing: '0.15em',
            color: 'rgba(244,235,208,0.5)',
            background: 'none',
            border: '1px dashed rgba(197,160,89,0.3)',
            padding: '0.6rem 1.8rem',
            borderRadius: '2px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#c5a059';
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#c5a059';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(244,235,208,0.5)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(197,160,89,0.3)';
          }}
        >
          {t.customArea}
        </button>
      </div>
    </section>
  );
});
