'use client';

import { useState, useEffect, useRef } from 'react';

// Avoid importing pdfjs-dist types at module level to prevent SSR issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PDFDoc = any;

interface UsePdfDocumentReturn {
  pdfDoc: PDFDoc | null;
  pageCount: number;
  loading: boolean;
  error: string | null;
}

// Cache pdfjs module to avoid re-importing and re-configuring worker
let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

async function getPdfjs() {
  if (typeof window === 'undefined') {
    throw new Error('pdfjs-dist can only be used in the browser');
  }

  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjs) => {
      // Set worker source once when module loads
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      return pdfjs;
    });
  }

  return pdfjsPromise;
}

export function usePdfDocument(url: string | null): UsePdfDocumentReturn {
  const [pdfDoc, setPdfDoc] = useState<PDFDoc | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const docRef = useRef<PDFDoc | null>(null);

  useEffect(() => {
    if (!url) {
      if (docRef.current) {
        docRef.current.destroy();
        docRef.current = null;
      }
      setPdfDoc(null);
      setPageCount(0);
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadDocument() {
      setLoading(true);
      setError(null);

      try {
        const pdfjs = await getPdfjs();
        const loadingTask = pdfjs.getDocument(url!);
        const doc = await loadingTask.promise;

        if (!cancelled) {
          // Clean up old document before setting new one
          if (docRef.current) {
            docRef.current.destroy();
          }
          docRef.current = doc;
          setPdfDoc(doc);
          setPageCount(doc.numPages);
        } else {
          doc.destroy();
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to load PDF document';
          setError(message);
          setPdfDoc(null);
          setPageCount(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDocument();

    return () => {
      cancelled = true;
    };
  }, [url]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (docRef.current) {
        docRef.current.destroy();
        docRef.current = null;
      }
    };
  }, []);

  return { pdfDoc, pageCount, loading, error };
}
