import React, { useEffect, useState } from 'react';

interface WatermarkOverlayProps {
  employeeName: string;
  employeeCode: string;
}

/**
 * WatermarkOverlay — semi-transparent repeating text overlay.
 * Absolutely positioned over the question area.
 * pointer-events: none so it doesn't block interaction.
 * Timestamp refreshes every 60 seconds.
 */
export default function WatermarkOverlay({ employeeName, employeeCode }: WatermarkOverlayProps) {
  const [timestamp, setTimestamp] = useState(() =>
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimestamp(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const text = `${employeeName} · ${employeeCode} · ${timestamp}`;

  // Build a grid of repeated watermark text
  const rows = 6;
  const cols = 3;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      userSelect: 'none',
      zIndex: 10,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-around',
    }}>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} style={{
          display: 'flex',
          justifyContent: 'space-around',
          transform: `rotate(-15deg) translateX(${rowIdx % 2 === 0 ? '0' : '60px'})`,
        }}>
          {Array.from({ length: cols }).map((_, colIdx) => (
            <span key={colIdx} style={{
              fontSize: '11px',
              fontWeight: 500,
              color: 'rgba(0,0,0,0.08)',
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
              fontFamily: 'monospace',
            }}>
              {text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
