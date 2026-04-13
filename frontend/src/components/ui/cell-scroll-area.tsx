import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CellScrollAreaProps {
  children: React.ReactNode;
  maxHeight?: string | number;
  showFade?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * SlidingCarousel (formerly CellScrollArea)
 * A premium container for high-density lists (e.g. SkillTags) in table cells.
 * Features:
 * - Hover-triggered navigation controls (< >)
 * - Dynamic edge-fading (only fades when content actually exists in that direction)
 * - Vertical-to-Horizontal scroll mapping
 * - Smooth action-based sliding
 */
export const CellScrollArea: React.FC<CellScrollAreaProps> = ({ 
  children, 
  showFade = true,
  className,
  style 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [children]);

  const handleWheel = (e: React.WheelEvent) => {
    if (!scrollRef.current) return;
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
      scrollRef.current.scrollLeft += e.deltaY;
      e.preventDefault();
      checkScroll();
    }
  };

  const scrollBy = (amount: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      // Timeout to check scroll after animation
      setTimeout(checkScroll, 300);
    }
  };

  // Generate the mask based on ability to scroll
  const getMaskImage = () => {
    if (!showFade) return 'none';
    const leftFade = canScrollLeft ? 'transparent, black 40px' : 'black';
    const rightFade = canScrollRight ? 'black calc(100% - 40px), transparent' : 'black';
    return `linear-gradient(to right, ${leftFade}, ${rightFade})`;
  };

  return (
    <div 
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        ...style
      }}
    >
      {/* Left Navigation */}
      {canScrollLeft && isHovered && (
        <button
          onClick={() => scrollBy(-150)}
          style={{
            position: 'absolute',
            left: '-8px',
            zIndex: 10,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            color: 'var(--color-accent)',
          }}
        >
          <ChevronLeft size={16} />
        </button>
      )}

      {/* Main Scrollable Area */}
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        onScroll={checkScroll}
        style={{
          width: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
          WebkitMaskImage: getMaskImage(),
          maskImage: getMaskImage(),
          transition: 'mask-image 0.2s',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            flexWrap: 'nowrap',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 0',
            minHeight: '32px'
          }}
        >
          {children}
        </div>
      </div>

      {/* Right Navigation */}
      {canScrollRight && isHovered && (
        <button
          onClick={() => scrollBy(150)}
          style={{
            position: 'absolute',
            right: '-8px',
            zIndex: 10,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            color: 'var(--color-accent)',
          }}
        >
          <ChevronRight size={16} />
        </button>
      )}

      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};
