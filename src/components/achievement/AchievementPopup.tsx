'use client';

import { useEffect, useState, useRef } from 'react';
import { Achievement, Language } from '@/types';

interface AchievementPopupProps {
  achievement: Achievement | null;
  lang: Language;
  onDismiss: () => void;
}

const tierColors: Record<string, { bg: string; border: string; glow: string; icon: string }> = {
  bronze: {
    bg: 'linear-gradient(135deg, #6d4c2a 0%, #8b6914 40%, #6d4c2a 100%)',
    border: '#8b6914',
    glow: 'rgba(139, 105, 20, 0.6)',
    icon: '🛡',
  },
  silver: {
    bg: 'linear-gradient(135deg, #6b6b6b 0%, #b0b0b0 40%, #6b6b6b 100%)',
    border: '#b0b0b0',
    glow: 'rgba(176, 176, 176, 0.6)',
    icon: '⚔',
  },
  gold: {
    bg: 'linear-gradient(135deg, #8b6914 0%, #d4a843 30%, #f0d060 50%, #d4a843 70%, #8b6914 100%)',
    border: '#d4a843',
    glow: 'rgba(212, 168, 67, 0.7)',
    icon: '👑',
  },
};

const tierNames: Record<string, { zh: string; en: string }> = {
  bronze: { zh: '铜盾', en: 'Bronze' },
  silver: { zh: '银盾', en: 'Silver' },
  gold: { zh: '金盾', en: 'Gold' },
};

export function AchievementPopup({ achievement, lang, onDismiss }: AchievementPopupProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (achievement) {
      // Enter animation
      setVisible(false);
      setExiting(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });

      // Auto dismiss after 2.5s
      const timer = setTimeout(() => {
        setExiting(true);
        setTimeout(() => {
          setVisible(false);
          setExiting(false);
          onDismissRef.current();
        }, 400);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [achievement]);

  if (!achievement) return null;

  const tier = tierColors[achievement.tier] || tierColors.bronze;
  const tierLabel = tierNames[achievement.tier] || tierNames.bronze;

  const handleClick = () => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      onDismissRef.current();
    }, 400);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        background: visible && !exiting ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
        transition: 'background 0.4s ease',
        cursor: 'pointer',
        backdropFilter: visible && !exiting ? 'blur(4px)' : 'blur(0px)',
      }}
    >
      <div
        style={{
          transform: visible && !exiting
            ? 'scale(1) translateY(0) rotate(0deg)'
            : 'scale(0.5) translateY(40px) rotate(-5deg)',
          opacity: visible && !exiting ? 1 : 0,
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          pointerEvents: 'none',
          textAlign: 'center',
          maxWidth: '380px',
          width: '90%',
        }}
      >
        {/* Medal card */}
        <div style={{
          position: 'relative',
          padding: '2rem 1.5rem',
          borderRadius: '6px',
          border: `2px solid ${tier.border}`,
          background: 'rgba(44, 37, 25, 0.95)',
          boxShadow: `0 0 30px ${tier.glow}, 0 8px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)`,
        }}>
          {/* Metal sheen overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '300%',
            height: '100%',
            background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.08) 55%, transparent 70%)',
            animation: visible && !exiting ? 'achieve-sheen 2.5s ease-in-out forwards' : 'none',
            borderRadius: '4px',
            pointerEvents: 'none',
          }} />

          {/* Corner ornaments */}
          {[
            { top: '6px', left: '6px', transform: 'rotate(0deg)' },
            { top: '6px', right: '6px', transform: 'rotate(90deg)' },
            { bottom: '6px', right: '6px', transform: 'rotate(180deg)' },
            { bottom: '6px', left: '6px', transform: 'rotate(270deg)' },
          ].map((pos, i) => (
            <div key={i} style={{
              position: 'absolute',
              ...pos,
              width: '16px',
              height: '16px',
              borderTop: `1.5px solid ${tier.border}`,
              borderLeft: `1.5px solid ${tier.border}`,
              opacity: 0.5,
              transform: pos.transform,
            }} />
          ))}

          {/* Tier badge */}
          <div style={{
            display: 'inline-block',
            padding: '0.15rem 0.6rem',
            background: tier.bg,
            borderRadius: '2px',
            fontSize: '0.6rem',
            fontFamily: 'var(--font-cinzel), serif',
            letterSpacing: '0.15em',
            color: '#fff',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            marginBottom: '0.75rem',
            textTransform: 'uppercase',
          }}>
            {lang === 'zh' ? `${tierLabel.zh}成就` : `${tierLabel.en} Achievement`}
          </div>

          {/* Icon */}
          <div style={{
            fontSize: '2.5rem',
            marginBottom: '0.5rem',
            filter: `drop-shadow(0 0 10px ${tier.glow})`,
          }}>
            {tier.icon}
          </div>

          {/* Achievement name */}
          <div style={{
            fontFamily: 'var(--font-cinzel), serif',
            fontSize: '1.3rem',
            fontWeight: 700,
            color: '#f4ebd0',
            letterSpacing: '0.08em',
            marginBottom: '0.25rem',
            textShadow: `0 0 15px ${tier.glow}`,
          }}>
            {lang === 'zh' ? achievement.nameCn : achievement.name}
          </div>

          {/* Description */}
          <div style={{
            fontFamily: 'var(--font-im-fell), Georgia, serif',
            fontSize: '0.85rem',
            fontStyle: 'italic',
            color: 'rgba(244,235,208,0.6)',
            lineHeight: 1.4,
          }}>
            {achievement.description}
          </div>
        </div>

        {/* Dismiss hint */}
        <div style={{
          marginTop: '0.75rem',
          fontSize: '0.65rem',
          color: 'rgba(244,235,208,0.3)',
          fontFamily: 'var(--font-cinzel), serif',
          letterSpacing: '0.1em',
        }}>
          {lang === 'zh' ? '点击任意处继续' : 'Click anywhere to continue'}
        </div>
      </div>
    </div>
  );
}
