'use client';

import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';

// Declare pdfjsLib on window
declare global {
  interface Window {
    pdfjsLib?: {
      GlobalWorkerOptions: { workerSrc: string };
      getDocument: (src: string | ArrayBuffer | { data: ArrayBuffer }) => { promise: Promise<PDFDocument> };
    };
  }
}

interface PDFDocument {
  numPages: number;
  getPage: (num: number) => Promise<PDFPage>;
  destroy: () => void;
}

interface PDFPage {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
  getTextContent: () => Promise<{ items: Array<{ str: string; transform: number[]; width: number; height: number }> }>;
}

// A horizontal underline detected in the PDF. yPercent is the line's vertical
// position as a fraction of page height; xStartPercent/xEndPercent are the
// horizontal extent.
export interface SnapLine {
  page: number;
  yPercent: number;
  xStartPercent: number;
  xEndPercent: number;
}

interface PdfViewerProps {
  pdfUrl: string;
  scale?: number;
  onPageChange?: (page: number) => void;
  renderOverlay?: (pageNumber: number) => ReactNode;
  className?: string;
  authToken?: string; // JWT token for authenticated PDF endpoints
  onSnapLinesDetected?: (lines: SnapLine[]) => void;
  showSnapGuides?: boolean;
}

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

// Padding inside the scrollable container (matches p-4 on mobile, p-6 on desktop)
const CONTAINER_PADDING_MOBILE = 16; // px each side
const CONTAINER_PADDING_DESKTOP = 24;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export default function PdfViewer({
  pdfUrl,
  scale: scaleProp = 1.0,
  onPageChange,
  renderOverlay,
  className = '',
  authToken,
  onSnapLinesDetected,
  showSnapGuides = false,
}: PdfViewerProps) {
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageDimensions, setPageDimensions] = useState<Record<number, { width: number; height: number }>>({});
  const [pdfData, setPdfData] = useState<ArrayBuffer | string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [userZoom, setUserZoom] = useState(1);
  const blobUrlRef = useRef<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pdfDocRef = useRef<PDFDocument | null>(null);
  const onPageChangeRef = useRef(onPageChange);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  // Track container width for responsive scaling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
        setContainerWidth(width);
      }
    });

    ro.observe(container);
    // Set initial width
    setContainerWidth(container.clientWidth);

    return () => ro.disconnect();
  }, []);

  // Load PDF.js from CDN
  useEffect(() => {
    // Check if already loaded
    if (window.pdfjsLib) {
      setPdfjsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = PDFJS_CDN;
    script.type = 'module';
    script.onload = () => {
      // The module export needs to be accessed differently
      import(/* webpackIgnore: true */ PDFJS_CDN).then((pdfjsLib) => {
        window.pdfjsLib = pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
        setPdfjsLoaded(true);
      }).catch((err) => {
        console.error('Failed to load PDF.js:', err);
        setError('Failed to load PDF viewer');
        setLoading(false);
      });
    };
    script.onerror = () => {
      setError('Failed to load PDF viewer');
      setLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
      }
    };
  }, []);

  // Fetch PDF with auth if token is provided
  useEffect(() => {
    if (!pdfUrl) return;

    let cancelled = false;

    async function fetchPdf() {
      try {
        setLoading(true);
        setError(null);

        // Clean up previous blob URL
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }

        if (authToken) {
          // Fetch with auth header
          const response = await fetch(pdfUrl, {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          if (!cancelled) {
            setPdfData(arrayBuffer);
          }
        } else {
          // No auth needed, use URL directly
          if (!cancelled) {
            setPdfData(pdfUrl);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('PDF fetch error:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch PDF');
          setLoading(false);
        }
      }
    }

    fetchPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl, authToken]);

  // Load PDF document when pdfjsLib is ready and data is available
  useEffect(() => {
    if (!pdfjsLoaded || !window.pdfjsLib || !pdfData) return;

    const dataToLoad = pdfData; // Capture for async closure
    let cancelled = false;

    async function loadPdf() {
      try {
        // pdfData can be ArrayBuffer or URL string
        const loadingTask = window.pdfjsLib!.getDocument(dataToLoad);
        const pdfDoc = await loadingTask.promise;

        if (cancelled) {
          pdfDoc.destroy();
          return;
        }

        if (pdfDocRef.current) {
          pdfDocRef.current.destroy();
        }
        pdfDocRef.current = pdfDoc;
        setNumPages(pdfDoc.numPages);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error('PDF load error:', err);
          setError(err instanceof Error ? err.message : 'Failed to load PDF');
          setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfjsLoaded, pdfData]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  // Render pages when document is loaded
  useEffect(() => {
    if (!pdfDocRef.current || numPages === 0) return;

    let cancelled = false;

    async function renderPages() {
      const pdfDoc = pdfDocRef.current;
      if (!pdfDoc) return;

      // Determine padding based on screen width
      const padding = containerWidth < 640 ? CONTAINER_PADDING_MOBILE : CONTAINER_PADDING_DESKTOP;
      const availableWidth = containerWidth > 0 ? containerWidth - padding * 2 : 0;

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        if (cancelled) return;
        const canvas = canvasRefs.current.get(pageNum);
        if (!canvas) continue;

        try {
          const page = await pdfDoc.getPage(pageNum);
          if (cancelled) return;

          // Get the viewport at the requested scale
          const desiredViewport = page.getViewport({ scale: scaleProp });

          // Compute a base "fit-to-container" scale, then multiply by userZoom.
          let fitScale = scaleProp;
          if (desiredViewport.width > availableWidth && availableWidth > 0) {
            fitScale = (availableWidth / desiredViewport.width) * scaleProp;
          }
          const finalScale = fitScale * userZoom;

          const viewport = page.getViewport({ scale: finalScale });
          const outputScale = window.devicePixelRatio || 1;

          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;

          setPageDimensions(prev => ({
            ...prev,
            [pageNum]: { width: Math.floor(viewport.width), height: Math.floor(viewport.height) }
          }));

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);
            await page.render({ canvasContext: ctx, viewport }).promise;
          }
        } catch (err) {
          if (!cancelled) {
            console.error(`Error rendering page ${pageNum}:`, err);
          }
        }
      }
    }

    renderPages();

    return () => {
      cancelled = true;
    };
  }, [numPages, scaleProp, containerWidth, userZoom]);

  // Detect underline-shaped text runs (3+ underscores) on every page and
  // expose them as snap targets. Runs once per loaded document.
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
  const onSnapLinesDetectedRef = useRef(onSnapLinesDetected);
  useEffect(() => {
    onSnapLinesDetectedRef.current = onSnapLinesDetected;
  }, [onSnapLinesDetected]);
  useEffect(() => {
    if (!pdfDocRef.current || numPages === 0) return;
    let cancelled = false;

    async function detect() {
      const pdfDoc = pdfDocRef.current;
      if (!pdfDoc) return;
      const all: SnapLine[] = [];
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        try {
          const page = await pdfDoc.getPage(pageNum);
          const tc = await page.getTextContent();
          const vp = page.getViewport({ scale: 1 });
          for (const item of tc.items) {
            if (!item.str) continue;
            const underscoreCount = (item.str.match(/_/g) || []).length;
            if (underscoreCount < 3) continue;
            // item.transform is [a, b, c, d, e, f]; e/f are the text origin
            // (baseline) in PDF user space — y is bottom-up.
            const [, , , , x, y] = item.transform;
            const yFromTop = vp.height - y;
            const yPercent = (yFromTop / vp.height) * 100;
            // Estimate underline horizontal extent. If the item is mostly
            // underscores, use its full width; otherwise approximate using the
            // proportion of underscores at the trailing end (handles labels
            // like "Signature: _______").
            const ratio = underscoreCount / item.str.length;
            const trailingUs = item.str.length - item.str.replace(/_+$/, '').length;
            const usableFraction = ratio > 0.7 ? 1 : trailingUs / item.str.length;
            const usableWidth = item.width * usableFraction;
            const xStart = x + (item.width - usableWidth);
            const xEnd = x + item.width;
            all.push({
              page: pageNum,
              yPercent,
              xStartPercent: (xStart / vp.width) * 100,
              xEndPercent: (xEnd / vp.width) * 100,
            });
          }
        } catch (err) {
          // Ignore — pages without extractable text just don't get snap targets
          console.warn(`[PdfViewer] snap-line detect failed for page ${pageNum}:`, err);
        }
      }
      if (!cancelled) {
        setSnapLines(all);
        onSnapLinesDetectedRef.current?.(all);
      }
    }
    detect();
    return () => {
      cancelled = true;
    };
  }, [numPages]);

  // Anchor the scroll position to the visual center of the viewport during zoom,
  // so the user stays roughly where they were instead of being flung around.
  const scrollAnchorRef = useRef<{ xFrac: number; yFrac: number } | null>(null);

  const captureScrollAnchor = useCallback(() => {
    const c = containerRef.current;
    if (!c || c.scrollWidth === 0 || c.scrollHeight === 0) return;
    scrollAnchorRef.current = {
      xFrac: (c.scrollLeft + c.clientWidth / 2) / c.scrollWidth,
      yFrac: (c.scrollTop + c.clientHeight / 2) / c.scrollHeight,
    };
  }, []);

  // After zoom-triggered re-render, restore scroll so viewport center stays put
  useEffect(() => {
    const anchor = scrollAnchorRef.current;
    if (!anchor) return;
    const raf = requestAnimationFrame(() => {
      const c = containerRef.current;
      if (!c) return;
      c.scrollLeft = anchor.xFrac * c.scrollWidth - c.clientWidth / 2;
      c.scrollTop = anchor.yFrac * c.scrollHeight - c.clientHeight / 2;
      scrollAnchorRef.current = null;
    });
    return () => cancelAnimationFrame(raf);
  }, [userZoom]);

  const zoomIn = useCallback(() => {
    captureScrollAnchor();
    setUserZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  }, [captureScrollAnchor]);
  const zoomOut = useCallback(() => {
    captureScrollAnchor();
    setUserZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
  }, [captureScrollAnchor]);
  const zoomReset = useCallback(() => {
    captureScrollAnchor();
    setUserZoom(1);
  }, [captureScrollAnchor]);

  const setCanvasRef = useCallback((pageNumber: number) => (el: HTMLCanvasElement | null) => {
    if (el) {
      canvasRefs.current.set(pageNumber, el);
    } else {
      canvasRefs.current.delete(pageNumber);
    }
  }, []);

  // Intersection observer for page visibility
  useEffect(() => {
    const container = containerRef.current;
    if (!container || numPages === 0) return;

    const visiblePages = new Map<number, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageNum = Number((entry.target as HTMLElement).dataset.pageNumber);
          if (entry.isIntersecting) {
            visiblePages.set(pageNum, entry.intersectionRatio);
          } else {
            visiblePages.delete(pageNum);
          }
        });

        let maxRatio = 0;
        let mostVisiblePage = 1;
        visiblePages.forEach((ratio, pageNum) => {
          if (ratio > maxRatio) {
            maxRatio = ratio;
            mostVisiblePage = pageNum;
          }
        });

        if (visiblePages.size > 0) {
          onPageChangeRef.current?.(mostVisiblePage);
        }
      },
      { root: container, threshold: [0, 0.25, 0.5, 0.75, 1.0] }
    );

    // Observe all page wrappers
    container.querySelectorAll('[data-page-number]').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [numPages]);

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] bg-stone-100 ${className}`}>
        <div className="bg-white border-4 border-black p-6 max-w-md shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <p className="font-bold uppercase text-sm tracking-wide text-red-600 mb-2">
            Error Loading PDF
          </p>
          <p className="text-sm font-mono text-stone-600">{error}</p>
        </div>
      </div>
    );
  }

  if (loading || !pdfjsLoaded) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] bg-stone-100 ${className}`}>
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent animate-spin mb-4" />
          <p className="font-bold uppercase text-sm tracking-wide text-stone-700">
            Loading Document...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto bg-stone-200 ${className}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Zoom controls — absolute inside the scroll container so they stay
          glued to its top-right corner without taking layout space. */}
      <div className="absolute top-2 right-2 z-30 pointer-events-none">
        <div className="pointer-events-auto inline-flex items-stretch gap-px bg-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <button
            type="button"
            onClick={zoomOut}
            disabled={userZoom <= MIN_ZOOM}
            aria-label="Zoom out"
            className="px-2.5 py-1 bg-white text-sm font-bold hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            −
          </button>
          <button
            type="button"
            onClick={zoomReset}
            aria-label="Reset zoom"
            className="px-2 py-1 bg-white text-[10px] font-bold uppercase tracking-wide tabular-nums hover:bg-stone-100 min-w-[3.5rem]"
          >
            {Math.round(userZoom * 100)}%
          </button>
          <button
            type="button"
            onClick={zoomIn}
            disabled={userZoom >= MAX_ZOOM}
            aria-label="Zoom in"
            className="px-2.5 py-1 bg-white text-sm font-bold hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>
      </div>
      <div className="flex flex-col items-center gap-4 p-4 sm:gap-6 sm:p-6">
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => {
          const dims = pageDimensions[pageNumber];
          return (
            <div
              key={pageNumber}
              data-page-number={pageNumber}
              className="relative w-full flex justify-center"
            >
              <div
                className="relative bg-white ring-2 ring-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-full"
                style={dims ? { width: dims.width, height: dims.height } : undefined}
              >
                <canvas ref={setCanvasRef(pageNumber)} className="block max-w-full h-auto" />
                {/* Snap-line guides — render faint blue underlays so users see
                    where fields will snap to. Only when showSnapGuides=true
                    (prepare view); hidden in signing. */}
                {showSnapGuides && dims && snapLines
                  .filter((l) => l.page === pageNumber)
                  .map((line, idx) => (
                    <div
                      key={`snap-${pageNumber}-${idx}`}
                      className="absolute pointer-events-none border-t border-dashed border-blue-400/40"
                      style={{
                        top: `${line.yPercent}%`,
                        left: `${line.xStartPercent}%`,
                        width: `${line.xEndPercent - line.xStartPercent}%`,
                      }}
                    />
                  ))}
                {/* Overlay for field positioning. Inset-0 alone (no inline
                    width/height) keeps the overlay coordinate space exactly
                    aligned with the canvas — both fill the same box. */}
                {renderOverlay && dims && (
                  <div className="absolute inset-0">
                    {renderOverlay(pageNumber)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
