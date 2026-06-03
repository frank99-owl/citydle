'use client';

import { useRef, useEffect } from 'react';
import { Language } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n';

interface GuessInputProps {
  lang: Language;
  guess: string;
  disabled: boolean;
  onGuessChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function GuessInput({ lang, guess, disabled, onGuessChange, onSubmit }: GuessInputProps) {
  const t = TRANSLATIONS[lang];
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  return (
    <form onSubmit={onSubmit} style={{ marginBottom: '1.5rem' }}>
      <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontFamily: 'var(--font-cinzel)', display: 'block', marginBottom: '0.4rem' }}>
        {t.inputLabel}
      </label>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={guess}
          onChange={e => onGuessChange(e.target.value)}
          ref={inputRef}
          placeholder={t.inputPlaceholder}
          disabled={disabled}
          style={{
            flex: 1,
            padding: '0.6rem',
            border: '2px solid var(--wood-border)',
            background: '#fcfaf2',
            fontSize: '0.95rem',
          }}
        />
        <button type="submit" className="vintage-btn" style={{ padding: '0 1rem' }}>{t.submitBtn}</button>
      </div>
    </form>
  );
}
