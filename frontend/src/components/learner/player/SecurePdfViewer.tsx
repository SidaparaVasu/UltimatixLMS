import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useDocumentProtection } from '@/hooks/useDocumentProtection';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// ── PDF.js worker — CDN to avoid bundling ────────────────────────────────────
pdfjs.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface SecurePdfViewerProps {
  blobUrl: string;
  className?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.25;
const DEFAULT_SCALE = 1.0;

// Pages within this many viewport-heights of the current view are rendered.
// Pages outside this window are replaced with placeholders (canvas memory freed).
const RENDER_WINDOW_VIEWPORTS = 3;

// Pre-load this many pages ahead of the last visible page
const PRELOAD_AHEAD = 2;

// Horizontal padding inside the scroll container (px each side)
const HORIZONTAL_PADDING = 32;

// ── Component ─────────────────────────────────────────────────────────────────

export const SecurePdfViewer = ({ blobUrl, className }: SecurePdfViewerProps) => {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDocLoading, setIsDocLoading] = useState(true);
  const [docError, setDocError] = useState<string | null>(null);

  // Set of page numbers that should be rendered (visible + preload window)
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set([1, 2]));

  // Responsive: actual pixel width available for the page canvas
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // DRM restrictions
  const protectionRef = useDocumentProtection<HTMLDivElement>();

  // ── Responsive container width ────────────────────────────────────────────

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const measure = () => {
      const width = container.clientWidth - HORIZONTAL_PADDING * 2;
      setContainerWidth(Math.max(width, 300));
    };

    // Initial measurement
    measure();

    // Debounced resize observer — avoids layout thrash on rapid resize
    resizeObserverRef.current = new ResizeObserver(() => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(measure, 100);
    });
    resizeObserverRef.current.observe(container);

    return () => {
      resizeObserverRef.current?.disconnect();
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, []);

  // ── Computed page width ───────────────────────────────────────────────────
  // A standard PDF page is 595pt wide. We scale to fit the container at 1x,
  // then apply the user's zoom scale on top.
  const pageWidth = useMemo(() => {
    if (containerWidth === 0) return undefined; // let react-pdf use its default
    const baseWidth = Math.min(containerWidth, 900); // cap at 900px for readability
    return baseWidth * scale;
  }, [containerWidth, scale]);

  // ── Document load handlers ────────────────────────────────────────────────

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsDocLoading(false);
    setDocError(null);
    setRenderedPages(new Set([1, 2].filter(p => p <= numPages)));
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    setIsDocLoading(false);
    setDocError('Failed to load PDF. The file may be corrupted or unsupported.');
    console.error('[SecurePdfViewer] PDF load error:', error);
  }, []);

  // ── Lazy load + unload via IntersectionObserver ───────────────────────────

  useEffect(() => {
    if (numPages === 0 || !scrollContainerRef.current) return;

    const scrollEl = scrollContainerRef.current;
    const viewportHeight = scrollEl.clientHeight;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageNum = parseInt(entry.target.getAttribute('data-page') ?? '0', 10);
          if (!pageNum) return;

          if (entry.isIntersecting) {
            setCurrentPage(pageNum);

            setRenderedPages((prev) => {
              const next = new Set(prev);

              // Add current + preload window ahead
              for (let i = pageNum; i <= Math.min(numPages, pageNum + PRELOAD_AHEAD); i++) {
                next.add(i);
              }

              // Unload pages outside the render window
              // Window = RENDER_WINDOW_VIEWPORTS * viewport height above and below
              const windowPages = Math.ceil(
                (RENDER_WINDOW_VIEWPORTS * viewportHeight) /
                // Approximate page height in px (842pt at current scale)
                Math.max(842 * (pageWidth ? pageWidth / 595 : scale), 200)
              );

              next.forEach((p) => {
                if (Math.abs(p - pageNum) > windowPages + PRELOAD_AHEAD) {
                  next.delete(p);
                }
              });

              return next;
            });
          }
        });
      },
      {
        root: scrollEl,
        rootMargin: '300px 0px',  // pre-load 300px before entering viewport
        threshold: 0.05,
      }
    );

    pageRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [numPages, pageWidth, scale]);

  // ── Zoom controls ─────────────────────────────────────────────────────────

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(+(s + SCALE_STEP).toFixed(2), MAX_SCALE));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(+(s - SCALE_STEP).toFixed(2), MIN_SCALE));
  }, []);

  // ── Page navigation ───────────────────────────────────────────────────────

  const goToPage = useCallback((pageNum: number) => {
    const el = pageRefs.current.get(pageNum);
    if (el && scrollContainerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // ── Placeholder dimensions ────────────────────────────────────────────────
  // Used for unloaded pages to maintain scroll position.
  // A4 aspect ratio: 595 × 842 pt
  const placeholderStyle = useMemo(() => {
    const w = pageWidth ?? 595 * scale;
    const h = (w / 595) * 842;
    return { width: w, height: h };
  }, [pageWidth, scale]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      ref={protectionRef}
      className={cn('flex flex-col h-full bg-gray-100', className)}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
    >
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0">
        {/* Page navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => goToPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="text-xs text-gray-600 tabular-nums min-w-[56px] text-center">
            {numPages > 0 ? `${currentPage} / ${numPages}` : '—'}
          </span>

          <button
            onClick={() => goToPage(Math.min(numPages, currentPage + 1))}
            disabled={currentPage >= numPages}
            className="flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={zoomOut}
            disabled={scale <= MIN_SCALE}
            className="flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          <span className="text-xs text-gray-600 tabular-nums w-12 text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={zoomIn}
            disabled={scale >= MAX_SCALE}
            className="flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── PDF scroll area ── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-auto no-scrollbar"
      >
        {/* Loading state */}
        {isDocLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <p className="text-xs text-gray-500">Loading PDF...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {docError && !isDocLoading && (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-gray-500 text-center px-4">{docError}</p>
          </div>
        )}

        {/* PDF Document */}
        <Document
          file={blobUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          className="flex flex-col items-center py-4 gap-3"
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
            <div
              key={pageNum}
              data-page={pageNum}
              ref={(el) => {
                if (el) pageRefs.current.set(pageNum, el);
                else pageRefs.current.delete(pageNum);
              }}
            >
              {renderedPages.has(pageNum) ? (
                <Page
                  pageNumber={pageNum}
                  width={pageWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="border border-gray-200"
                  loading={
                    <div
                      className="bg-white border border-gray-200 flex items-center justify-center"
                      style={placeholderStyle}
                    >
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  }
                />
              ) : (
                // Placeholder — maintains scroll height, canvas memory freed
                <div
                  className="bg-white border border-gray-200"
                  style={placeholderStyle}
                />
              )}
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
};
