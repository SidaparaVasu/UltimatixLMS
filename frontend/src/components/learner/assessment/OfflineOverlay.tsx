import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

/**
 * OfflineOverlay — full-screen overlay shown when the network drops during an assessment.
 * Timers are frozen while this is visible.
 * The learner can still interact with the current question (answer stored locally).
 */
export default function OfflineOverlay() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: '400px',
        background: 'white',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-8)',
        textAlign: 'center',
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
      }}>
        {/* Icon */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'rgba(220,38,38,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto var(--space-4)',
        }}>
          <WifiOff size={28} style={{ color: '#dc2626' }} />
        </div>

        {/* Title */}
        <h2 style={{ margin: '0 0 var(--space-2)', fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Connection Lost
        </h2>

        {/* Message */}
        <p style={{ margin: '0 0 var(--space-5)', fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          Your progress is saved. The timer has been paused.
          Waiting for your connection to return...
        </p>

        {/* Animated reconnecting indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--color-surface-alt)',
          borderRadius: 'var(--radius-md)',
          fontSize: '13px', color: 'var(--color-text-muted)',
        }}>
          <RefreshCw size={14} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
          Reconnecting...
        </div>

        {/* Reassurance note */}
        <p style={{ margin: 'var(--space-4) 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Once reconnected, your timer will resume and any pending answers will sync automatically.
        </p>
      </div>
    </div>
  );
}
