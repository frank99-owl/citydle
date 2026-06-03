'use client';

import { useState, useCallback } from 'react';
import { Street, Achievement, Language, Difficulty } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n';

interface SettlementViewProps {
  lang: Language;
  streets: Street[];
  guessedCount: number;
  maxStreak: number;
  hintsUsed: number;
  difficulty: Difficulty;
  badge: Achievement | null;
  cityName: string;
  timeSeconds: number;
  onBackToLobby: () => void;
  onShare: () => void;
  onSubmitLeaderboard: (playerName: string) => Promise<boolean>;
}

export function SettlementView({
  lang,
  streets,
  guessedCount,
  maxStreak,
  hintsUsed,
  difficulty,
  badge,
  cityName,
  timeSeconds,
  onBackToLobby,
  onShare,
  onSubmitLeaderboard,
}: SettlementViewProps) {
  const t = TRANSLATIONS[lang];
  const [playerName, setPlayerName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cartographer_player_name') || '';
    }
    return '';
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (submitting || submitted) return;
    setSubmitting(true);
    const name = playerName.trim() || 'Anonymous';
    localStorage.setItem('cartographer_player_name', name);
    const success = await onSubmitLeaderboard(name);
    setSubmitting(false);
    if (success) setSubmitted(true);
  }, [playerName, submitting, submitted, onSubmitLeaderboard]);

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
        {/* Share button */}
        <button
          onClick={onShare}
          className="vintage-btn"
          style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem' }}
        >
          {t.shareBtn}
        </button>

        {/* Leaderboard submit section */}
        <div style={{
          border: '1px solid rgba(66,48,35,0.2)',
          borderRadius: '4px',
          padding: '0.75rem',
          marginTop: '0.25rem',
        }}>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder={t.playerNamePlaceholder}
              disabled={submitted}
              style={{
                flex: 1,
                padding: '0.4rem 0.5rem',
                border: '1px solid var(--wood-border)',
                borderRadius: '2px',
                background: '#fcfaf2',
                fontSize: '0.8rem',
                fontFamily: 'var(--font-serif)',
                outline: 'none',
                opacity: submitted ? 0.6 : 1,
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || submitted}
              className="vintage-btn"
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                boxShadow: 'none',
                textShadow: 'none',
                opacity: submitted ? 0.7 : 1,
              }}
            >
              {submitted ? t.submitted : submitting ? '...' : t.submitLeaderboard}
            </button>
          </div>
        </div>

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
