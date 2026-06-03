'use client';

import { Language } from '@/types';

interface LanguageToggleProps {
  lang: Language;
  onToggle: () => void;
  variant?: 'full' | 'mini';
}

export function LanguageToggle({ lang, onToggle, variant = 'full' }: LanguageToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="vintage-btn"
      style={{
        padding: variant === 'mini' ? '0.2rem 0.6rem' : '0.4rem 1rem',
        fontSize: variant === 'mini' ? '0.7rem' : '0.8rem',
        letterSpacing: '0.05em',
        textShadow: 'none',
        marginTop: variant === 'mini' ? '0.25rem' : undefined,
      }}
    >
      {variant === 'mini'
        ? (lang === 'en' ? '中' : 'EN')
        : (lang === 'en' ? '中文 🇨🇳' : 'English 🇬🇧')
      }
    </button>
  );
}
