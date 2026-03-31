import React, { useRef, useState, useEffect } from 'react';
import { Palette, Sun, Moon } from 'lucide-react';
import { useThemeStore, type ColorTheme, type ColorMode } from '@/stores/themeStore';

export const ThemeSwitcher: React.FC = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { colorTheme, mode, setColorTheme, setMode } = useThemeStore();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const themes: { value: ColorTheme; label: string; dot: string }[] = [
    { value: 'orange', label: 'Orange', dot: '#FF6420' },
    { value: 'blue',   label: 'Blue',   dot: '#2563EB' },
  ];

  const modes: { value: ColorMode; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun  size={13} />, label: 'Light' },
    { value: 'dark',  icon: <Moon size={13} />, label: 'Dark'  },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        id="theme-switcher-btn"
        className="topnav-icon-btn"
        title="Appearance"
        onClick={() => setOpen((v) => !v)}
        style={{ color: open ? 'var(--color-accent)' : undefined }}
      >
        <Palette size={18} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          id="theme-switcher-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 210,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            padding: '14px',
            zIndex: 999,
          }}
        >
          {/* Title */}
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: 'var(--color-text-muted)',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <Palette size={12} />
            Appearance
          </div>

          {/* Theme section */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
              Theme
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {themes.map((t) => {
                const active = colorTheme === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setColorTheme(t.value)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '6px 0',
                      borderRadius: 'var(--radius-md)',
                      border: active
                        ? `1.5px solid ${t.dot}`
                        : '1.5px solid var(--color-border)',
                      background: active ? `${t.dot}15` : 'transparent',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      color: active ? t.dot : 'var(--color-text-secondary)',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <span style={{
                      width: 10, height: 10,
                      borderRadius: '50%',
                      background: t.dot,
                      flexShrink: 0,
                    }} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode section */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
              Mode
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {modes.map((m) => {
                const active = mode === m.value;
                return (
                  <button
                    key={m.value}
                    onClick={() => setMode(m.value)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '6px 0',
                      borderRadius: 'var(--radius-md)',
                      border: active
                        ? '1.5px solid var(--color-accent)'
                        : '1.5px solid var(--color-border)',
                      background: active ? 'var(--color-accent-subtle)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      transition: 'all 150ms ease',
                    }}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
