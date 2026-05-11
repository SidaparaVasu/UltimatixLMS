import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Camera, Mic, Wifi,
  CheckCircle2, XCircle, Loader2, AlertTriangle,
  Eye, Copy, Monitor, Clock, ArrowRight,
} from 'lucide-react';
import CameraFeedPiP from './CameraFeedPiP';
import { SystemCheckState } from '@/types/assessment-player.types';

interface AssessmentPlayerInstructionsProps {
  assessmentTitle: string;
  durationMinutes: number;
  questionCount: number;
  passingPercentage: string;
  negativeMarking: boolean;
  isResuming?: boolean;
  onBegin: (stream: MediaStream) => void;
}

// ── Rules list ────────────────────────────────────────────────────────────────

const RULES = [
  { icon: Monitor,    text: 'Do not switch tabs or windows during the assessment. Third violation will result in automatic submission.' },
  { icon: Clock,      text: 'Each question has a time limit. Unanswered questions will be marked as not attempted when time runs out.' },
  { icon: ArrowRight, text: 'Questions are presented one at a time. You cannot go back to a previous question.' },
  { icon: Copy,       text: 'Copy, paste, and text selection are disabled during the assessment.' },
  { icon: Eye,        text: 'Your session is monitored. A watermark with your identity is visible on all questions.' },
  { icon: Camera,     text: 'Camera access is required throughout the assessment.' },
];

// ── Check status indicator ────────────────────────────────────────────────────

function CheckItem({ label, status }: { label: string; status: 'pending' | 'ok' | 'fail' | 'checking' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
      padding: 'var(--space-3) var(--space-4)',
      background: status === 'ok' ? 'rgba(22,163,74,0.06)' : status === 'fail' ? 'rgba(220,38,38,0.06)' : 'var(--color-surface-alt)',
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${status === 'ok' ? 'rgba(22,163,74,0.2)' : status === 'fail' ? 'rgba(220,38,38,0.2)' : 'var(--color-border)'}`,
    }}>
      {status === 'ok'       && <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />}
      {status === 'fail'     && <XCircle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />}
      {status === 'checking' && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-accent)', flexShrink: 0 }} />}
      {status === 'pending'  && <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--color-border)', flexShrink: 0 }} />}
      <span style={{
        fontSize: '13px', fontWeight: 500,
        color: status === 'ok' ? '#15803d' : status === 'fail' ? '#dc2626' : 'var(--color-text-secondary)',
      }}>
        {label}
      </span>
      <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--color-text-muted)' }}>
        {status === 'ok' ? 'Ready' : status === 'fail' ? 'Failed' : status === 'checking' ? 'Checking...' : 'Waiting'}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AssessmentPlayerInstructions({
  assessmentTitle,
  durationMinutes,
  questionCount,
  passingPercentage,
  negativeMarking,
  isResuming = false,
  onBegin,
}: AssessmentPlayerInstructionsProps) {
  const [checks, setChecks] = useState<SystemCheckState>({ internet: false, camera: false, microphone: false });
  const [checkStatus, setCheckStatus] = useState<Record<keyof SystemCheckState, 'pending' | 'ok' | 'fail' | 'checking'>>({
    internet: 'pending', camera: 'pending', microphone: 'pending',
  });
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [startInput, setStartInput] = useState('');
  const [isBeginning, setIsBeginning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Check internet on mount
  useEffect(() => {
    setCheckStatus(prev => ({ ...prev, internet: 'checking' }));
    const online = navigator.onLine;
    setTimeout(() => {
      setCheckStatus(prev => ({ ...prev, internet: online ? 'ok' : 'fail' }));
      setChecks(prev => ({ ...prev, internet: online }));
    }, 600);

    const handleOnline  = () => { setCheckStatus(prev => ({ ...prev, internet: 'ok' }));   setChecks(prev => ({ ...prev, internet: true })); };
    const handleOffline = () => { setCheckStatus(prev => ({ ...prev, internet: 'fail' })); setChecks(prev => ({ ...prev, internet: false })); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Request camera + microphone
  const requestPermissions = async () => {
    setIsRequesting(true);
    setCheckStatus(prev => ({ ...prev, camera: 'checking', microphone: 'checking' }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setCameraStream(stream);
      setCheckStatus(prev => ({ ...prev, camera: 'ok', microphone: 'ok' }));
      setChecks(prev => ({ ...prev, camera: true, microphone: true }));
    } catch {
      setCheckStatus(prev => ({ ...prev, camera: 'fail', microphone: 'fail' }));
      setChecks(prev => ({ ...prev, camera: false, microphone: false }));
    } finally {
      setIsRequesting(false);
    }
  };

  // Cleanup stream on unmount — only stop tracks if we did NOT hand the
  // stream off to the parent via onBegin (i.e. the user navigated away
  // without starting). Once onBegin fires, the parent owns the stream.
  const beganRef = useRef(false);

  useEffect(() => {
    return () => {
      if (!beganRef.current) {
        streamRef.current?.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const allChecksPass = checks.internet && checks.camera && checks.microphone;
  const startTyped    = startInput.trim().toLowerCase() === 'start';
  const canBegin      = allChecksPass && consentChecked && startTyped;

  const handleBegin = () => {
    if (!canBegin || !cameraStream || isBeginning) return;
    setIsBeginning(true);
    beganRef.current = true;  // prevent cleanup from stopping the stream
    onBegin(cameraStream);
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        padding: 'var(--space-4) var(--space-8)',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
      }}>
        <ShieldCheck size={20} style={{ color: 'var(--color-accent)' }} />
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {assessmentTitle}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          {questionCount} questions · {durationMinutes} minutes · {parseFloat(passingPercentage)}% to pass
        </span>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: '1fr 380px',
        gap: 'var(--space-8)',
        padding: 'var(--space-8)',
        maxWidth: '1100px', margin: '0 auto', width: '100%',
      }}>

        {/* Left — Rules */}
        <div>
          <h2 style={{ margin: '0 0 var(--space-2)', fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {isResuming ? 'Resume Assessment' : 'Before You Begin'}
          </h2>
          <p style={{ margin: '0 0 var(--space-5)', fontSize: '14px', color: 'var(--color-text-muted)' }}>
            {isResuming
              ? 'Complete the system checks below to continue your assessment from where you left off.'
              : 'Please read the following rules carefully before starting the assessment.'
            }
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
            {RULES.map((rule, i) => (
              <div key={i} style={{
                display: 'flex', gap: 'var(--space-3)', alignItems: 'center',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}>
                <rule.icon size={16} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: '1px' }} />
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  {rule.text}
                </p>
              </div>
            ))}
          </div>

          {negativeMarking && (
            <div style={{
              display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start',
              padding: 'var(--space-3) var(--space-4)',
              background: 'rgba(217,119,6,0.06)',
              border: '1px solid rgba(217,119,6,0.25)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-6)',
            }}>
              <AlertTriangle size={16} style={{ color: '#b45309', flexShrink: 0, marginTop: '1px' }} />
              <p style={{ margin: 0, fontSize: '13px', color: '#b45309', lineHeight: 1.6 }}>
                <strong>Negative marking is enabled.</strong> Incorrect answers will deduct points from your score.
              </p>
            </div>
          )}

          {/* Consent checkbox */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
            cursor: 'pointer', padding: 'var(--space-4)',
            background: consentChecked ? 'rgba(22,163,74,0.06)' : 'var(--color-surface)',
            border: `1px solid ${consentChecked ? 'rgba(22,163,74,0.3)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            transition: 'all 150ms',
          }}>
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={e => setConsentChecked(e.target.checked)}
              style={{ width: '16px', height: '16px', marginTop: '1px', flexShrink: 0, cursor: 'pointer', accentColor: 'var(--color-accent)' }}
            />
            <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
              I have read and understood all the rules above. I agree to follow them throughout the assessment.
            </span>
          </label>
        </div>

        {/* Right — System checks + Begin */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-5)',
          }}>
            <h3 style={{ margin: '0 0 var(--space-4)', fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              System Check
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <CheckItem label="Internet Connection" status={checkStatus.internet} />
              <CheckItem label="Camera Access" status={checkStatus.camera} />
              <CheckItem label="Microphone Access" status={checkStatus.microphone} />
            </div>

            {/* Request permissions button */}
            {(!checks.camera || !checks.microphone) && (
              <button
                onClick={requestPermissions}
                disabled={isRequesting}
                style={{
                  width: '100%', padding: '9px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-alt)',
                  color: 'var(--color-text-secondary)',
                  fontSize: '13px', fontWeight: 500,
                  cursor: isRequesting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  marginBottom: 'var(--space-3)',
                }}
              >
                {isRequesting
                  ? <><Loader2 size={14} className="animate-spin" /> Requesting...</>
                  : <><Camera size={14} /> Allow Camera & Microphone</>
                }
              </button>
            )}

            {/* Camera preview */}
            {cameraStream && (
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <p style={{ margin: '0 0 var(--space-2)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                  Camera Preview
                </p>
                <div style={{
                  width: '100%', aspectRatio: '4/3',
                  borderRadius: 'var(--radius-md)', overflow: 'hidden',
                  background: '#1a1a1a', border: '1px solid var(--color-border)',
                }}>
                  <video
                    autoPlay muted playsInline
                    ref={el => { if (el) el.srcObject = cameraStream; }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                  />
                </div>
              </div>
            )}

            {/* Type "start" to begin — only shown once all checks pass and consent is checked */}
            {allChecksPass && consentChecked && (
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={startInput}
                    onChange={e => setStartInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleBegin(); }}
                    placeholder='Type "start" to begin'
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${startTyped ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      background: 'var(--color-surface)',
                      color: 'var(--color-text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                      transition: 'border-color 150ms',
                    }}
                  />
                  <button
                    onClick={handleBegin}
                    disabled={!startTyped || isBeginning}
                    style={{
                      padding: '9px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: startTyped ? 'var(--color-accent)' : 'var(--color-border)',
                      color: startTyped ? '#fff' : 'var(--color-text-muted)',
                      fontSize: '13px', fontWeight: 600,
                      cursor: startTyped && !isBeginning ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      transition: 'all 150ms',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isBeginning
                      ? <Loader2 size={14} className="animate-spin" />
                      : <>Start <ArrowRight size={14} /></>
                    }
                  </button>
                </div>
              </div>
            )}

            {/* Begin button — shown until all checks + consent are done */}
            {!(allChecksPass && consentChecked) && (
              <button
                disabled
                style={{
                  width: '100%', padding: '11px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--color-border)',
                  color: 'var(--color-text-muted)',
                  fontSize: '14px', fontWeight: 700,
                  cursor: 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                <ShieldCheck size={16} />
                {isResuming ? 'Resume Assessment' : 'Begin Assessment'}
              </button>
            )}

            {!(allChecksPass && consentChecked) && (
              <p style={{ margin: 'var(--space-2) 0 0', fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                {!allChecksPass ? 'Complete all system checks to continue.' : 'Check the consent box to continue.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Camera PiP — shown after permissions granted */}
      {cameraStream && <CameraFeedPiP stream={cameraStream} />}
    </div>
  );
}
