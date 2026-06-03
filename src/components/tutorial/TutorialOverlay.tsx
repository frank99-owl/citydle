'use client';

import { useEffect, useState, useCallback } from 'react';
import { Language } from '@/types';
import { TUTORIAL_STEPS } from '@/hooks/useTutorial';

interface TutorialOverlayProps {
  lang: Language;
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  onSkip: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export function TutorialOverlay({
  lang,
  isActive,
  currentStep,
  totalSteps,
  onSkip,
  onNext,
  onPrev,
}: TutorialOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    if (isActive) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntering(true));
      });
    } else {
      setEntering(false);
      const timer = setTimeout(() => setVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onSkip();
    }
  }, [onSkip]);

  if (!visible) return null;

  const steps = TUTORIAL_STEPS[lang];
  const step = steps[currentStep];
  const isLastStep = currentStep >= totalSteps - 1;

  // SVG icons for each step
  const stepIcons = [
    // Welcome: compass icon
    <svg key="welcome" viewBox="0 0 64 64" style={{ width: 56, height: 56 }}>
      <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="2" opacity={0.4} />
      <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <polygon points="32,12 35,30 32,34 29,30" fill="#c5a059" />
      <polygon points="32,52 29,34 32,30 35,34" fill="currentColor" opacity={0.5} />
      <polygon points="12,32 30,29 34,32 30,35" fill="currentColor" opacity={0.5} />
      <polygon points="52,32 34,35 30,32 34,29" fill="#c5a059" />
      <circle cx="32" cy="32" r="3" fill="currentColor" />
      <text x="32" y="8" textAnchor="middle" fontSize="6" fill="currentColor" fontFamily="serif" opacity={0.6}>N</text>
      <text x="32" y="60" textAnchor="middle" fontSize="6" fill="currentColor" fontFamily="serif" opacity={0.6}>S</text>
      <text x="6" y="34" textAnchor="middle" fontSize="6" fill="currentColor" fontFamily="serif" opacity={0.6}>W</text>
      <text x="58" y="34" textAnchor="middle" fontSize="6" fill="currentColor" fontFamily="serif" opacity={0.6}>E</text>
    </svg>,
    // Demo: magnifying glass over map icon
    <svg key="demo" viewBox="0 0 64 64" style={{ width: 56, height: 56 }}>
      <rect x="8" y="14" width="48" height="36" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.4} />
      <line x1="8" y1="24" x2="56" y2="24" stroke="currentColor" strokeWidth="0.8" opacity={0.3} />
      <line x1="8" y1="34" x2="56" y2="34" stroke="currentColor" strokeWidth="0.8" opacity={0.3} />
      <line x1="24" y1="14" x2="24" y2="50" stroke="currentColor" strokeWidth="0.8" opacity={0.3} />
      <line x1="40" y1="14" x2="40" y2="50" stroke="currentColor" strokeWidth="0.8" opacity={0.3} />
      <circle cx="36" cy="30" r="10" fill="none" stroke="#c5a059" strokeWidth="2" />
      <line x1="43" y1="37" x2="52" y2="46" stroke="#c5a059" strokeWidth="2.5" strokeLinecap="round" />
      <text x="36" y="34" textAnchor="middle" fontSize="8" fill="#c5a059" fontFamily="serif" fontWeight="bold">?</text>
    </svg>,
    // Hints: lightbulb icon
    <svg key="hints" viewBox="0 0 64 64" style={{ width: 56, height: 56 }}>
      <path d="M32 8 C22 8 14 16 14 26 C14 33 18 37 22 40 L22 46 L42 46 L42 40 C46 37 50 33 50 26 C50 16 42 8 32 8Z"
        fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M32 8 C22 8 14 16 14 26 C14 33 18 37 22 40 L22 46 L42 46 L42 40 C46 37 50 33 50 26 C50 16 42 8 32 8Z"
        fill="#c5a059" opacity={0.15} />
      <line x1="26" y1="50" x2="38" y2="50" stroke="currentColor" strokeWidth="1.5" />
      <line x1="28" y1="54" x2="36" y2="54" stroke="currentColor" strokeWidth="1.5" />
      <line x1="30" y1="58" x2="34" y2="58" stroke="currentColor" strokeWidth="1.5" />
      {/* Light rays */}
      <line x1="32" y1="2" x2="32" y2="5" stroke="#c5a059" strokeWidth="1.5" opacity={0.6} />
      <line x1="50" y1="10" x2="48" y2="12" stroke="#c5a059" strokeWidth="1.5" opacity={0.6} />
      <line x1="14" y1="10" x2="16" y2="12" stroke="#c5a059" strokeWidth="1.5" opacity={0.6} />
      <line x1="56" y1="26" x2="53" y2="26" stroke="#c5a059" strokeWidth="1.5" opacity={0.6} />
      <line x1="8" y1="26" x2="11" y2="26" stroke="#c5a059" strokeWidth="1.5" opacity={0.6} />
    </svg>,
  ];

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: entering ? 'rgba(20, 16, 10, 0.85)' : 'rgba(20, 16, 10, 0)',
        backdropFilter: entering ? 'blur(3px)' : 'blur(0px)',
        transition: 'background 0.5s ease, backdrop-filter 0.5s ease',
        cursor: 'pointer',
      }}
    >
      {/* Decorative corner ornaments */}
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
        <div key={pos} style={{
          position: 'absolute',
          [pos.includes('top') ? 'top' : 'bottom']: '1.5rem',
          [pos.includes('left') ? 'left' : 'right']: '1.5rem',
          width: '60px', height: '60px',
          border: '1.5px solid rgba(197,160,89,0.25)',
          borderRadius: pos.includes('top-left') ? '50% 0 0 0' : pos.includes('top-right') ? '0 50% 0 0' : pos.includes('bottom-left') ? '0 0 0 50%' : '0 0 50% 0',
          pointerEvents: 'none',
          opacity: entering ? 1 : 0,
          transition: 'opacity 0.8s ease 0.2s',
        }} />
      ))}

      {/* Card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'linear-gradient(145deg, #f4ebd0 0%, #e6dfc7 40%, #d8ceb0 100%)',
          border: '2px solid #423023',
          borderRadius: '6px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(197,160,89,0.2), inset 0 0 20px rgba(44,37,25,0.08)',
          width: 'min(440px, 90vw)',
          padding: 'clamp(1.5rem, 4vw, 2.5rem)',
          textAlign: 'center',
          cursor: 'default',
          transform: entering ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
          opacity: entering ? 1 : 0,
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Inner border (vintage style) */}
        <div style={{
          position: 'absolute',
          inset: '6px',
          border: '1px solid rgba(66,48,35,0.25)',
          borderRadius: '3px',
          pointerEvents: 'none',
        }} />

        {/* Step icon */}
        <div style={{
          color: '#4e3629',
          marginBottom: '1.25rem',
          opacity: entering ? 1 : 0,
          transform: entering ? 'translateY(0)' : 'translateY(10px)',
          transition: 'all 0.5s ease 0.15s',
        }}>
          {stepIcons[currentStep]}
        </div>

        {/* Step number */}
        <div style={{
          fontFamily: 'var(--font-cinzel), serif',
          fontSize: '0.65rem',
          letterSpacing: '0.3em',
          color: '#c5a059',
          textTransform: 'uppercase',
          marginBottom: '0.5rem',
        }}>
          {lang === 'zh' ? `第 ${currentStep + 1} 步 / 共 ${totalSteps} 步` : `Step ${currentStep + 1} of ${totalSteps}`}
        </div>

        {/* Title */}
        <h2 style={{
          fontFamily: 'var(--font-cinzel), serif',
          fontSize: 'clamp(1.2rem, 3.5vw, 1.6rem)',
          fontWeight: 800,
          color: '#2c2519',
          margin: '0 0 0.75rem',
          letterSpacing: '0.04em',
          lineHeight: 1.2,
        }}>
          {step.title}
        </h2>

        {/* Description */}
        <p style={{
          fontFamily: 'var(--font-im-fell), Georgia, serif',
          fontSize: 'clamp(0.9rem, 2.5vw, 1.05rem)',
          color: '#4e3629',
          lineHeight: 1.6,
          margin: '0 0 1.75rem',
          maxWidth: '360px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          {step.desc}
        </p>

        {/* Step-specific visual hints */}
        {currentStep === 1 && (
          <div style={{
            background: 'rgba(44,37,25,0.06)',
            border: '1px solid rgba(197,160,89,0.3)',
            borderRadius: '4px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            textAlign: 'left',
          }}>
            <div style={{
              fontFamily: 'var(--font-cinzel), serif',
              fontSize: '0.65rem',
              letterSpacing: '0.15em',
              color: '#c5a059',
              marginBottom: '0.35rem',
              textTransform: 'uppercase',
            }}>
              {lang === 'zh' ? '示例流程' : 'Example Flow'}
            </div>
            <div style={{
              fontFamily: 'var(--font-im-fell), Georgia, serif',
              fontSize: '0.85rem',
              color: '#4e3629',
              lineHeight: 1.5,
            }}>
              {lang === 'zh'
                ? <>1. 选择「伦敦」城市卡片 → 2. 在输入框输入 <b>Throgmorton Street</b> → 3. 街道出现在地图上!</>
                : <>1. Pick the "London" card → 2. Type <b>Throgmorton Street</b> → 3. Street appears on the map!</>
              }
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
          }}>
            {[
              { label: lang === 'zh' ? '简单' : 'Easy', desc: lang === 'zh' ? '地图高亮' : 'Map Highlight', color: '#3a5f43' },
              { label: lang === 'zh' ? '中等' : 'Medium', desc: lang === 'zh' ? '首字母提示' : 'Letter Clues', color: '#c5a059' },
              { label: lang === 'zh' ? '困难' : 'Hard', desc: lang === 'zh' ? '无提示' : 'No Hints', color: '#8a3324' },
            ].map(d => (
              <div key={d.label} style={{
                background: 'rgba(44,37,25,0.06)',
                border: `1.5px solid ${d.color}40`,
                borderRadius: '4px',
                padding: '0.5rem 0.75rem',
                minWidth: '90px',
                textAlign: 'center',
              }}>
                <div style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: d.color,
                  letterSpacing: '0.05em',
                }}>{d.label}</div>
                <div style={{
                  fontFamily: 'var(--font-im-fell), Georgia, serif',
                  fontSize: '0.7rem',
                  color: '#4e3629',
                  marginTop: '0.15rem',
                  opacity: 0.7,
                }}>{d.desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* Progress dots */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'center',
          marginBottom: '1.25rem',
        }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i === currentStep ? '20px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: i === currentStep ? '#c5a059' : 'rgba(78,54,41,0.2)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'center',
        }}>
          {/* Skip button */}
          <button
            onClick={onSkip}
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              padding: '0.55rem 1.2rem',
              background: 'none',
              border: '1.5px solid rgba(78,54,41,0.3)',
              borderRadius: '3px',
              color: 'rgba(78,54,41,0.5)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#c5a059';
              e.currentTarget.style.color = '#c5a059';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(78,54,41,0.3)';
              e.currentTarget.style.color = 'rgba(78,54,41,0.5)';
            }}
          >
            {lang === 'zh' ? '跳过' : 'Skip'}
          </button>

          {/* Prev button */}
          {currentStep > 0 && (
            <button
              onClick={onPrev}
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                fontSize: '0.75rem',
                letterSpacing: '0.1em',
                padding: '0.55rem 1.2rem',
                background: 'none',
                border: '1.5px solid rgba(78,54,41,0.3)',
                borderRadius: '3px',
                color: '#4e3629',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#c5a059';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(78,54,41,0.3)';
              }}
            >
              {lang === 'zh' ? '上一步' : 'Back'}
            </button>
          )}

          {/* Next / Finish button */}
          <button
            onClick={onNext}
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              padding: '0.55rem 1.5rem',
              background: '#4e3629',
              border: '2px solid #423023',
              borderRadius: '3px',
              color: '#f4ebd0',
              cursor: 'pointer',
              boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
              transition: 'all 0.2s',
              textShadow: '1px 1px 2px rgba(0,0,0,0.4)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#c5a059';
              e.currentTarget.style.color = '#2c2519';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(197,160,89,0.4)';
              e.currentTarget.style.textShadow = 'none';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#4e3629';
              e.currentTarget.style.color = '#f4ebd0';
              e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.15)';
              e.currentTarget.style.textShadow = '1px 1px 2px rgba(0,0,0,0.4)';
            }}
          >
            {isLastStep
              ? (lang === 'zh' ? '开始探索' : 'Start Exploring')
              : (lang === 'zh' ? '下一步' : 'Next')
            }
          </button>
        </div>
      </div>
    </div>
  );
}
