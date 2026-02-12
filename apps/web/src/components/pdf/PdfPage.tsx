'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

// Avoid importing pdfjs-dist types at module level to prevent SSR/webpack issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PDFDoc = any;

interface PdfPageProps {
  pdfDoc: PDFDoc;
  pageNumber: number;
  scale: number;
  children?: ReactNode;
}

export default function PdfPage({
  pdfDoc,
  pageNumber,
  scale,
  children,
}: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTaskRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      const canvas = canvasRef.current;
      if (!canvas || !pdfDoc) return;

      try {
        // Cancel any in-progress render
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled) return;

        const viewport = page.getViewport({ scale });
        const outputScale = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        setDimensions({
          width: Math.floor(viewport.width),
          height: Math.floor(viewport.height),
        });

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        const renderTask = page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (err: unknown) {
        // Ignore cancellation errors
        if (
          err instanceof Error &&
          err.message?.includes('Rendering cancelled')
        ) {
          return;
        }
        if (!cancelled) {
          console.error(`Error rendering page ${pageNumber}:`, err);
        }
      }
    }

    renderPage();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, pageNumber, scale]);

  return (
    <div
      className="relative bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
      style={
        dimensions
          ? { width: dimensions.width, height: dimensions.height }
          : undefined
      }
      data-page-number={pageNumber}
    >
      <canvas ref={canvasRef} className="block" />
      {/* Overlay container for field positioning */}
      {dimensions && children && (
        <div
          className="absolute inset-0"
          style={{ width: dimensions.width, height: dimensions.height }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
