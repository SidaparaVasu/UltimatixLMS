import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Award, Sparkles } from 'lucide-react';
import type { CelebrationEvent } from '../celebration/types';
import {
  celebrationGifUrl,
  celebrationStaticUrl,
  DEFAULT_CELEBRATION_GIFS,
} from '../celebration/celebrationAssets';
import { BadgeIcon } from './BadgeIcon';

interface CelebrationModalProps {
  event: CelebrationEvent;
  onDismiss: () => void;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

function CelebrationVisual({
  event,
  reducedMotion,
}: {
  event: CelebrationEvent;
  reducedMotion: boolean;
}) {
  const [gifFailed, setGifFailed] = useState(false);
  const gifKey = event.gifKey ?? DEFAULT_CELEBRATION_GIFS.generic;

  if (event.type === 'badge' && event.badge) {
    const badgeForIcon = {
      code: event.badge.code,
      category: event.badge.category,
      name: event.badge.name,
    };
    return (
      <div style={{ position: 'relative', margin: '0 auto 20px', width: 120, height: 120 }}>
        {!reducedMotion && !gifFailed ? (
          <img
            src={celebrationGifUrl(gifKey)}
            alt=""
            role="presentation"
            onError={() => setGifFailed(true)}
            style={{
              width: 120,
              height: 120,
              objectFit: 'contain',
              borderRadius: 16,
            }}
          />
        ) : (
          <div style={{ margin: '16px auto', width: 88, height: 88 }}>
            <BadgeIcon badge={badgeForIcon} size={88} />
          </div>
        )}
      </div>
    );
  }

  if (!reducedMotion && !gifFailed) {
    return (
      <img
        src={celebrationGifUrl(gifKey)}
        alt=""
        role="presentation"
        onError={() => setGifFailed(true)}
        style={{
          width: 140,
          height: 140,
          objectFit: 'contain',
          margin: '0 auto 20px',
          display: 'block',
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: 88,
        height: 88,
        margin: '0 auto 20px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #FDF1E8 0%, #EBF5FF 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Sparkles size={40} style={{ color: '#E8833A' }} aria-hidden />
    </div>
  );
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({ event, onDismiss }) => {
  const reducedMotion = usePrefersReducedMotion();
  const dismissRef = useRef<HTMLButtonElement>(null);
  const gifKey = event.gifKey ?? DEFAULT_CELEBRATION_GIFS.generic;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    dismissRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [onDismiss]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
      className={reducedMotion ? '' : 'celebration-backdrop-in'}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.55)',
        padding: 24,
      }}
      onClick={onDismiss}
    >
      {!reducedMotion ? <div className="celebration-confetti" aria-hidden /> : null}

      <div
        className={reducedMotion ? '' : 'celebration-card-in'}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'var(--color-surface, #fff)',
          borderRadius: 20,
          border: '1px solid var(--color-border)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
          maxWidth: 400,
          width: '100%',
          padding: '32px 28px 24px',
          textAlign: 'center',
        }}
      >
        <CelebrationVisual event={event} reducedMotion={reducedMotion} />

        <h2
          id="celebration-title"
          style={{
            fontSize: 26,
            fontWeight: 800,
            margin: '0 0 8px',
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          {event.title}
        </h2>
        {event.subtitle ? (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: '0 0 20px' }}>
            {event.subtitle}
          </p>
        ) : null}

        {event.type === 'badge' && event.badge?.description ? (
          <p
            style={{
              fontSize: 12,
              color: 'var(--color-text-secondary)',
              margin: '0 0 20px',
              lineHeight: 1.5,
            }}
            title={event.badge.description}
          >
            {event.badge.description}
          </p>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            ref={dismissRef}
            type="button"
            className="btn w-full"
            onClick={onDismiss}
            style={{ minHeight: 44 }}
          >
            Awesome!
          </button>
          {event.type === 'badge' ? (
            <Link
              to="/profile/gamification"
              className="btn btn-secondary w-full"
              onClick={onDismiss}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Award size={16} />
              View all badges
            </Link>
          ) : null}
        </div>

        {reducedMotion ? (
          <img
            src={celebrationStaticUrl(gifKey)}
            alt=""
            role="presentation"
            style={{ display: 'none' }}
          />
        ) : null}
      </div>
    </div>,
    document.body,
  );
};
