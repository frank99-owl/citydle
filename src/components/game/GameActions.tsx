'use client';

import { memo } from 'react';
import { Language } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n';

interface GameActionsProps {
  lang: Language;
  isSaved: boolean;
  onSave: () => void;
  onForfeit: () => void;
  onExit: () => void;
}

export const GameActions = memo(function GameActions({ lang, isSaved, onSave, onForfeit, onExit }: GameActionsProps) {
  const t = TRANSLATIONS[lang];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={onSave}
          disabled={isSaved}
          style={{
            flex: 1, padding: '0.5rem', cursor: 'pointer',
            border: '1px solid #c5a059', background: isSaved ? 'none' : '#c5a059',
            color: isSaved ? '#c5a059' : '#2c2519',
            fontFamily: 'var(--font-cinzel)', fontSize: '0.75rem',
          }}
        >
          {isSaved ? t.savedMapBtn : t.saveMapBtn}
        </button>
        <button
          onClick={onForfeit}
          style={{
            flex: 1, padding: '0.5rem', cursor: 'pointer',
            border: '1px solid #8a3324', background: '#8a3324',
            color: '#f4ebd0',
            fontFamily: 'var(--font-cinzel)', fontSize: '0.75rem',
          }}
        >
          {t.forfeitBtn}
        </button>
      </div>
      <button
        onClick={onExit}
        style={{
          width: '100%', padding: '0.5rem', cursor: 'pointer',
          border: '1px solid rgba(66,48,35,0.4)', background: 'none',
          color: '#4e3629',
          fontFamily: 'var(--font-cinzel)', fontSize: '0.75rem',
        }}
      >
        {t.backHome}
      </button>
    </div>
  );
});
