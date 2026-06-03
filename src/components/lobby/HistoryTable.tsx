'use client';

import { memo } from 'react';
import { HistoryEntry, Language } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n';

interface HistoryTableProps {
  history: HistoryEntry[];
  lang: Language;
}

export const HistoryTable = memo(function HistoryTable({ history, lang }: HistoryTableProps) {
  const t = TRANSLATIONS[lang];

  if (history.length === 0) {
    return (
      <p style={{ color: 'rgba(244,235,208,0.3)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
        {t.noHistory}
      </p>
    );
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
      <thead>
        <tr style={{ color: 'rgba(197,160,89,0.7)', fontFamily: 'var(--font-cinzel), serif', fontSize: '0.7rem', letterSpacing: '0.1em' }}>
          <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem' }}>{t.tableMap}</th>
          <th style={{ textAlign: 'center', padding: '0.3rem 0.5rem' }}>{t.tableScore}</th>
          <th style={{ textAlign: 'center', padding: '0.3rem 0.5rem' }}>{t.tableCompletion}</th>
          <th style={{ textAlign: 'center', padding: '0.3rem 0.5rem' }}>{t.tableStreak}</th>
          <th style={{ textAlign: 'right', padding: '0.3rem 0.5rem' }}>{t.tableTime}</th>
        </tr>
      </thead>
      <tbody>
        {history.map(h => (
          <tr key={h.id} style={{ borderBottom: '1px solid rgba(197,160,89,0.1)', color: 'rgba(244,235,208,0.7)' }}>
            <td style={{ padding: '0.4rem 0.5rem' }}>{h.map_name}</td>
            <td style={{ textAlign: 'center', padding: '0.4rem 0.5rem', color: '#c5a059', fontFamily: 'var(--font-cinzel), serif' }}>{h.score}</td>
            <td style={{ textAlign: 'center', padding: '0.4rem 0.5rem' }}>{(h.completion_rate * 100).toFixed(1)}%</td>
            <td style={{ textAlign: 'center', padding: '0.4rem 0.5rem' }}>🔥 {h.max_streak}</td>
            <td style={{ textAlign: 'right', padding: '0.4rem 0.5rem', fontSize: '0.75rem', opacity: 0.5 }}>
              {new Date(h.played_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
});
