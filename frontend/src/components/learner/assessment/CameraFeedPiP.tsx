import React, { useEffect, useRef } from 'react';
import { VideoOff } from 'lucide-react';

interface CameraFeedPiPProps {
  stream: MediaStream | null;
}

/**
 * CameraFeedPiP — fixed bottom-right picture-in-picture camera self-view.
 * Purely local — no recording, no upload. Psychological deterrent only.
 */
export default function CameraFeedPiP({ stream }: CameraFeedPiPProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div style={{
      position: 'fixed',
      top: '100px',
      right: '20px',
      width: '160px',
      height: '120px',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      border: '2px solid rgba(0,0,0,0.2)',
      background: '#1a1a1a',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
        />
      ) : (
        <VideoOff size={24} style={{ color: '#666' }} />
      )}
    </div>
  );
}
