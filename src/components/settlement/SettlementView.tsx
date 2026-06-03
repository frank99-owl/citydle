'use client';

import { Street, Achievement, Language } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n';

interface SettlementViewProps {
  lang: Language;
  streets: Street[];
  guessedCount: number;
  maxStreak: number;
  hintsUsed: number;
  difficulty: string;
  badge: Achievement | null;
  onBackToLobby: () => void;
}

export function SettlementView({
  lang,
  streets,
  guessedCount,
  maxStreak,
  hintsUsed,
  difficulty,
  badge,
  onBackToLobby,
}: SettlementViewProps) {
  const t = TRANSLATIONS[lang];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <h3 className="vintage-title" style={{ fontSize: '1.25rem', color: '#8a3324', marginBottom: '0.5rem' }}>
          {t.settleTitle}
        </h3>

        {/* Badge illustration depending on performance */}
        {badge ? (
          <div style={{ margin: '1.5rem 0' }}>
            <div style={{
              width: '120px', height: '120px', margin: '0 auto',
              borderRadius: '8px', overflow: 'hidden',
              border: '2px solid #c5a059',
              boxShadow: '0 4px 15px rgba(197,160,89,0.3)',
              position: 'relative'
            }}>
              <img
                src="/achievement_badges_1779288909438.png"
                alt={badge.name}
                style={{
                  width: '300%',
                  height: '100%',
                  objectFit: 'cover',
                  position: 'absolute',
                  left: badge.tier === 'bronze' ? '0' : badge.tier === 'silver' ? '-100%' : '-200%',
                  top: 0
                }}
              />
            </div>
            <h4 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '1.1rem', margin: '0.75rem 0 0.25rem', color: '#c5a059' }}>
              {lang === 'zh' ? t[`${badge.id}Badge` as keyof typeof t] : badge.name}
            </h4>
            <p style={{ fontStyle: 'italic', fontSize: '0.8rem', color: '#4e3629', margin: 0 }}>
              {t[`${badge.id}Desc` as keyof typeof t]}
            </p>
          </div>
        ) : (
          <div style={{ padding: '1.5rem 0', color: '#8a3324', fontStyle: 'italic' }}>
            {t.badgeNotEarned}
          </div>
        )}

        <table style={{ width: '100%', marginTop: '1rem', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid rgba(66,48,35,0.1)' }}>
              <td style={{ padding: '0.4rem', textAlign: 'left', color: 'rgba(66,48,35,0.7)' }}>{t.unlockedLabel}:</td>
              <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 'bold' }}>{guessedCount}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(66,48,35,0.1)' }}>
              <td style={{ padding: '0.4rem', textAlign: 'left', color: 'rgba(66,48,35,0.7)' }}>{t.totalLabel}:</td>
              <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 'bold' }}>{streets.length}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(66,48,35,0.1)' }}>
              <td style={{ padding: '0.4rem', textAlign: 'left', color: 'rgba(66,48,35,0.7)' }}>{t.exploreLabel}:</td>
              <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 'bold', color: '#8a3324' }}>
                {streets.length > 0 ? (guessedCount / streets.length * 100).toFixed(1) : 0}%
              </td>
            </tr>
            {difficulty !== 'hard' && (
              <tr style={{ borderBottom: '1px solid rgba(66,48,35,0.1)' }}>
                <td style={{ padding: '0.4rem', textAlign: 'left', color: 'rgba(66,48,35,0.7)' }}>
                  {lang === 'zh' ? '已用提示' : 'Hints Used'}:
                </td>
                <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 'bold', color: '#8a3324' }}>
                  {hintsUsed}
                </td>
              </tr>
            )}
            <tr>
              <td style={{ padding: '0.4rem', textAlign: 'left', color: 'rgba(66,48,35,0.7)' }}>{t.maxStreakLabel}:</td>
              <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 'bold', color: '#c5a059' }}>🔥 {maxStreak}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.5rem' }}>
        <button
          onClick={onBackToLobby}
          className="vintage-btn"
          style={{ width: '100%', padding: '0.6rem' }}
        >
          {t.backHome}
        </button>
      </div>
    </div>
  );
}
