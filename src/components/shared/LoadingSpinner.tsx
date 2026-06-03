'use client';

import { memo } from 'react';

interface LoadingSpinnerProps {
  message: string;
  onBack?: () => void;
  backLabel?: string;
}

export const LoadingSpinner = memo(function LoadingSpinner({ message, onBack, backLabel }: LoadingSpinnerProps) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <div style={{
        width: '40px', height: '40px',
        border: '3px solid rgba(197,160,89,0.3)',
        borderTop: '3px solid #c5a059',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p style={{ fontStyle: 'italic', fontSize: '0.9rem', textAlign: 'center' }}>{message}</p>
      {onBack && backLabel && (
        <button
          onClick={onBack}
          style={{
            marginTop: '1.5rem',
            background: 'none', border: '1px solid rgba(66,48,35,0.4)', color: '#4e3629',
            padding: '0.4rem 1rem', cursor: 'pointer', fontFamily: 'var(--font-cinzel)',
            fontSize: '0.75rem',
          }}
        >
          {backLabel}
        </button>
      )}
    </div>
  );
});
