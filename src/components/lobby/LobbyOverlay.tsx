'use client';

import { useState } from 'react';
import { Language, Preset, HistoryEntry, Favorite, MapProvider, Difficulty } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n';
import { LanguageToggle } from '@/components/shared/LanguageToggle';
import { PresetCards } from './PresetCards';
import { MapSettings } from './MapSettings';
import { HistoryTable } from './HistoryTable';
import { FavoritesList } from './FavoritesList';
import { AchievementPanel } from '@/components/achievement/AchievementPanel';
import { StatsPanel } from '@/components/stats/StatsPanel';
import { DailyChallengeCard } from './DailyChallengeCard';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { PlayerStats, DailyChallenge, DailyChallengeRecord } from '@/hooks/useStats';

interface LobbyOverlayProps {
  lang: Language;
  view: 'lobby' | 'game';
  presets: Preset[];
  history: HistoryEntry[];
  highScore: number;
  favorites: Favorite[];
  mapProvider: MapProvider;
  difficulty: Difficulty;
  playerStats: PlayerStats;
  dailyChallenge: DailyChallenge | null;
  isDailyCompletedToday: boolean;
  todayDailyResult: DailyChallengeRecord | null;
  onToggleLanguage: () => void;
  onSelectPreset: (preset: Preset) => void;
  onStartCustom: () => void;
  onStartFavorite: (fav: Favorite) => void;
  onDeleteFavorite: (id: number) => void;
  onProviderChange: (provider: MapProvider) => void;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onStartDailyChallenge: (presetIndex: number, difficulty: string) => void;
}

export function LobbyOverlay({
  lang,
  view,
  presets,
  history,
  highScore,
  favorites,
  mapProvider,
  difficulty,
  playerStats,
  dailyChallenge,
  isDailyCompletedToday,
  todayDailyResult,
  onToggleLanguage,
  onSelectPreset,
  onStartCustom,
  onStartFavorite,
  onDeleteFavorite,
  onProviderChange,
  onDifficultyChange,
  onStartDailyChallenge,
}: LobbyOverlayProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'favorites' | 'achievements' | 'stats' | 'leaderboard'>('history');
  const t = TRANSLATIONS[lang];

  return (
    <div
      className="lobby-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 10,
        background: 'radial-gradient(ellipse at top, #2c2519 0%, #1a1610 60%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2rem 1rem',
        overflowY: 'auto',
        transition: 'opacity 0.6s ease, transform 0.6s ease, visibility 0.6s',
        opacity: view === 'lobby' ? 1 : 0,
        transform: view === 'lobby' ? 'scale(1)' : 'scale(1.05)',
        visibility: view === 'lobby' ? 'visible' : 'hidden',
        pointerEvents: view === 'lobby' ? 'auto' : 'none',
      }}
    >
      {/* Language Toggle */}
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 100 }}>
        <LanguageToggle lang={lang} onToggle={onToggleLanguage} />
      </div>

      {/* Decorative corner ornaments */}
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
        <div key={pos} style={{
          position: 'fixed',
          [pos.includes('top') ? 'top' : 'bottom']: '1.5rem',
          [pos.includes('left') ? 'left' : 'right']: '1.5rem',
          width: '80px', height: '80px',
          border: '2px solid rgba(197,160,89,0.3)',
          borderRadius: pos.includes('top-left') ? '60% 0 0 0' : pos.includes('top-right') ? '0 60% 0 0' : pos.includes('bottom-left') ? '0 0 0 60%' : '0 0 60% 0',
          pointerEvents: 'none',
        }} />
      ))}

      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem', zIndex: 1, padding: '0 1rem' }}>
        <div style={{
          fontSize: '0.75rem',
          letterSpacing: '0.4em',
          color: '#c5a059',
          fontFamily: 'var(--font-cinzel), serif',
          marginBottom: '0.5rem',
          textTransform: 'uppercase',
        }}>{t.subtitle}</div>
        <h1 style={{
          fontFamily: 'var(--font-cinzel), serif',
          fontSize: 'clamp(2.2rem, 5.5vw, 4.5rem)',
          fontWeight: 900,
          color: '#f4ebd0',
          letterSpacing: '0.05em',
          lineHeight: 1.1,
          margin: '0.25rem 0',
          textShadow: '0 0 40px rgba(197,160,89,0.4)',
        }}>Financial Street</h1>
        <h1 style={{
          fontFamily: 'var(--font-cinzel), serif',
          fontSize: 'clamp(2.2rem, 5.5vw, 4.5rem)',
          fontWeight: 900,
          color: '#c5a059',
          letterSpacing: '0.05em',
          lineHeight: 1.1,
          margin: '0 0 0.75rem',
          textShadow: '0 0 40px rgba(197,160,89,0.6)',
        }}>Cartographer</h1>
        <p style={{
          fontFamily: 'var(--font-im-fell), Georgia, serif',
          fontStyle: 'italic',
          color: 'rgba(244,235,208,0.6)',
          fontSize: '1.1rem',
          maxWidth: '650px',
          margin: '0 auto',
          lineHeight: 1.4,
        }}>{t.desc}</p>

        {/* High Score Banner */}
        {highScore > 0 && (
          <div style={{
            display: 'inline-block',
            marginTop: '1.25rem',
            padding: '0.4rem 1.2rem',
            border: '1px solid #c5a059',
            borderRadius: '2px',
            color: '#c5a059',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-cinzel), serif',
            letterSpacing: '0.15em',
          }}>
            🏆 {t.highScore}：{highScore} {lang === 'zh' ? '条街道' : 'streets'}
          </div>
        )}
      </div>

      {/* Daily Challenge */}
      <DailyChallengeCard
        lang={lang}
        dailyChallenge={dailyChallenge}
        isCompletedToday={isDailyCompletedToday}
        todayResult={todayDailyResult}
        dailyStreak={playerStats.dailyChallengeStreak}
        onStartChallenge={onStartDailyChallenge}
      />

      {/* City Preset Cards */}
      <PresetCards
        presets={presets}
        lang={lang}
        onSelect={onSelectPreset}
        onCustom={onStartCustom}
      />

      {/* Map Settings */}
      <MapSettings
        lang={lang}
        mapProvider={mapProvider}
        difficulty={difficulty}
        onProviderChange={onProviderChange}
        onDifficultyChange={onDifficultyChange}
      />

      {/* History & Favorites Tabs */}
      <section style={{ width: '100%', maxWidth: '900px', zIndex: 1 }}>
        <div style={{ display: 'flex', gap: '0', marginBottom: '0', borderBottom: '1px solid rgba(197,160,89,0.3)' }}>
          {(['history', 'favorites', 'achievements', 'stats', 'leaderboard'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                fontSize: '0.75rem',
                letterSpacing: '0.2em',
                padding: '0.6rem 1.5rem',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #c5a059' : '2px solid transparent',
                color: activeTab === tab ? '#c5a059' : 'rgba(244,235,208,0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textTransform: 'uppercase',
              }}
            >
              {tab === 'history' ? t.historyTab : tab === 'favorites' ? t.favoritesTab : tab === 'achievements' ? t.achievementsTab : tab === 'leaderboard' ? t.leaderboardTab : t.statsTab}
            </button>
          ))}
        </div>

        <div style={{
          background: 'rgba(244,235,208,0.04)',
          border: '1px solid rgba(197,160,89,0.2)',
          borderTop: 'none',
          borderRadius: '0 0 4px 4px',
          minHeight: '120px',
          maxHeight: '300px',
          overflowY: 'auto',
          padding: '1rem',
        }}>
          {activeTab === 'history' && <HistoryTable history={history} lang={lang} />}
          {activeTab === 'favorites' && (
            <FavoritesList
              favorites={favorites}
              lang={lang}
              onStart={onStartFavorite}
              onDelete={onDeleteFavorite}
            />
          )}
          {activeTab === 'achievements' && (
            <AchievementPanel lang={lang} isVisible={activeTab === 'achievements'} />
          )}
          {activeTab === 'stats' && (
            <StatsPanel lang={lang} stats={playerStats} isVisible={activeTab === 'stats'} />
          )}
          {activeTab === 'leaderboard' && (
            <Leaderboard lang={lang} isVisible={activeTab === 'leaderboard'} />
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ marginTop: '3rem', color: 'rgba(244,235,208,0.2)', fontSize: '0.75rem', fontFamily: 'var(--font-cinzel), serif', letterSpacing: '0.1em', zIndex: 1 }}>
        Powered by OpenStreetMap & Overpass API
      </footer>
    </div>
  );
}
