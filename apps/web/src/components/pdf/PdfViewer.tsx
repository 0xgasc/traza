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
}

interface PdfViewerProps {
  pdfUrl: string;
  scale?: number;
  onPageChange?: (page: number) => void;
  renderOverlay?: (pageNumber: number) => ReactNode;
  className?: string;
  authToken?: string; // JWT token for authenticated PDF endpoints
}

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

export default function PdfViewer({
  pdfUrl,
  scale = 1.0,
  onPageChange,
  renderOverlay,
  className = '',
  authToken,
}: PdfViewerProps) {
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageDimensions, setPageDimensions] = useState<Record<number, { width: number; height: number }>>({});
  const [pdfData, setPdfData] = useState<ArrayBuffer | string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pdfDocRef = useRef<PDFDocument | null>(null);
  const onPageChangeRef = useRef(onPageChange);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

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

    async function renderPages() {
      const pdfDoc = pdfDocRef.current;
      if (!pdfDoc) return;

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const canvas = canvasRefs.current.get(pageNum);
        if (!canvas) continue;

        try {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale });
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
          console.error(`Error rendering page ${pageNum}:`, err);
        }
      }
    }

    renderPages();
  }, [numPages, scale]);

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
    <div ref={containerRef} className={`overflow-auto bg-stone-200 ${className}`}>
      <div className="flex flex-col items-center gap-6 p-6">
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => {
          const dims = pageDimensions[pageNumber];
          return (
            <div
              key={pageNumber}
              data-page-number={pageNumber}
              className="relative"
            >
              <div
                className="relative bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                style={dims ? { width: dims.width, height: dims.height } : undefined}
              >
                <canvas ref={setCanvasRef(pageNumber)} className="block" />
                {/* Overlay for field positioning */}
                {renderOverlay && dims && (
                  <div
                    className="absolute inset-0"
                    style={{ width: dims.width, height: dims.height }}
                  >
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
