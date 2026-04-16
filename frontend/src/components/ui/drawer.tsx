import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position?: 'left' | 'right' | 'top' | 'bottom';
  size?: string; // width for left/right, height for top/bottom
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  hideCloseButton?: boolean;
  className?: string;
  fullScreen?: boolean;
}

export const Drawer = ({ 
  open, 
  onOpenChange, 
  position = 'right',
  size = '400px',
  title, 
  description, 
  children, 
  footer,
  hideCloseButton = false,
  className,
  fullScreen = false,
}: DrawerProps) => {
  
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [open]);

  if (!open) return null;

  const styleProps: React.CSSProperties = 
    fullScreen 
      ? { width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh' }
      : (position === 'left' || position === 'right') 
        ? { width: size, maxWidth: '100vw' } 
        : { height: size, maxHeight: '100vh' };

  return (
    <div 
      className={`drawer-overlay anim ${className || ''}`} 
      style={{ animationDuration: '200ms', zIndex: fullScreen ? 100 : 50 }}
      onClick={() => !fullScreen && onOpenChange(false)}
    >
      <div 
        className={`drawer-content drawer-${position} ${fullScreen ? 'drawer-fullscreen' : ''}`}
        style={{ 
          ...styleProps, 
          borderRadius: fullScreen ? 0 : undefined,
          boxShadow: fullScreen ? 'none' : undefined 
        }}
        onClick={e => e.stopPropagation()} 
      >
        {!fullScreen && (title || description || !hideCloseButton) && (
          <div className="dialog-header" style={{ flexShrink: 0 }}>
            <div>
              {title && <h2 className="dialog-title">{title}</h2>}
              {description && <p className="dialog-desc">{description}</p>}
            </div>
            {!hideCloseButton && (
              <button 
                onClick={() => onOpenChange(false)}
                className="dialog-close-btn"
                aria-label="Close drawer"
              >
                <X size={18} strokeWidth={2} />
              </button>
            )}
          </div>
        )}
        
        <div className={`dialog-body ${fullScreen ? 'p-0 overflow-hidden flex flex-col' : ''}`} style={{ flex: 1, overflowY: fullScreen ? 'hidden' : 'auto' }}>
          {children}
        </div>

        {footer && (
          <div className="dialog-footer" style={{ position: 'relative', flexShrink: 0, width: '100%', bottom: 'auto', left: 'auto' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
