'use client';

import { useState, useCallback, useEffect } from 'react';

interface PdfToolbarProps {
  currentPage: number;
  totalPages: number;
  scale: number;
  onPageChange: (page: number) => void;
  onScaleChange: (scale: number) => void;
}

const SCALE_MIN = 0.25;
const SCALE_MAX = 3.0;
const SCALE_STEP = 0.25;

export default function PdfToolbar({
  currentPage,
  totalPages,
  scale,
  onPageChange,
  onScaleChange,
}: PdfToolbarProps) {
  const [pageInput, setPageInput] = useState(String(currentPage));

  // Sync input when currentPage changes externally (e.g. from scrolling)
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, onPageChange]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, onPageChange]);

  const handlePageInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPageInput(e.target.value);
    },
    []
  );

  const handlePageInputSubmit = useCallback(
    (e: React.FormEvent | React.FocusEvent) => {
      e.preventDefault();
      const parsed = parseInt(pageInput, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
        onPageChange(parsed);
      } else {
        // Reset to current page if invalid
        setPageInput(String(currentPage));
      }
    },
    [pageInput, totalPages, currentPage, onPageChange]
  );

  const zoomIn = useCallback(() => {
    const newScale = Math.min(scale + SCALE_STEP, SCALE_MAX);
    onScaleChange(Math.round(newScale * 100) / 100);
  }, [scale, onScaleChange]);

  const zoomOut = useCallback(() => {
    const newScale = Math.max(scale - SCALE_STEP, SCALE_MIN);
    onScaleChange(Math.round(newScale * 100) / 100);
  }, [scale, onScaleChange]);

  const scalePercent = Math.round(scale * 100);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-stone-50 border-b-4 border-black">
      {/* Page navigation */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-stone-500 mr-1">
          Page
        </span>

        <button
          type="button"
          onClick={goToPreviousPage}
          disabled={currentPage <= 1}
          className="w-9 h-9 flex items-center justify-center bg-white border-3 border-black font-bold text-lg leading-none hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-black disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          &larr;
        </button>

        <form onSubmit={handlePageInputSubmit} className="flex items-center">
          <input
            type="text"
            inputMode="numeric"
            value={pageInput}
            onChange={handlePageInputChange}
            onBlur={handlePageInputSubmit}
            className="w-12 h-9 text-center bg-white border-3 border-black font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-black"
            aria-label="Page number"
          />
        </form>

        <span className="text-sm font-bold text-stone-500">/</span>
        <span className="text-sm font-mono font-bold text-stone-700">
          {totalPages}
        </span>

        <button
          type="button"
          onClick={goToNextPage}
          disabled={currentPage >= totalPages}
          className="w-9 h-9 flex items-center justify-center bg-white border-3 border-black font-bold text-lg leading-none hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-black disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          &rarr;
        </button>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-stone-500 mr-1">
          Zoom
        </span>

        <button
          type="button"
          onClick={zoomOut}
          disabled={scale <= SCALE_MIN}
          className="w-9 h-9 flex items-center justify-center bg-white border-3 border-black font-bold text-lg leading-none hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-black disabled:cursor-not-allowed"
          aria-label="Zoom out"
        >
          &minus;
        </button>

        <span className="w-14 h-9 flex items-center justify-center bg-white border-3 border-black font-mono font-bold text-sm">
          {scalePercent}%
        </span>

        <button
          type="button"
          onClick={zoomIn}
          disabled={scale >= SCALE_MAX}
          className="w-9 h-9 flex items-center justify-center bg-white border-3 border-black font-bold text-lg leading-none hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-black disabled:cursor-not-allowed"
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
    </div>
  );
}
