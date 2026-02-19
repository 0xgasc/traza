'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import PdfViewer from '@/components/pdf/PdfViewer';
import SignableField from './SignableField';
import { useSigningState } from './useSigningState';

interface FieldPosition {
  id: string;
  fieldType: string;
  label?: string;
  page: number;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  required?: boolean;
  signerEmail?: string;
}

interface SigningViewProps {
  token: string;
  pdfUrl: string;
  fields: FieldPosition[];
  signerEmail: string;
  onDecline?: () => void;
  onDelegate?: () => void;
}

export default function SigningView({
  token,
  pdfUrl,
  fields,
  signerEmail,
  onDecline,
  onDelegate,
}: SigningViewProps) {
  const {
    values,
    setFieldValue,
    allRequiredFilled,
    filledCount,
    totalRequired,
    submit,
    submitting,
    submitted,
    error,
  } = useSigningState(fields);

  const [pageDimensions, setPageDimensions] = useState<
    Record<number, { width: number; height: number }>
  >({});

  // We use a MutationObserver-style approach: measure page overlay containers
  const overlayRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const measureOverlay = useCallback((pageNumber: number, el: HTMLDivElement | null) => {
    if (el) {
      overlayRefs.current.set(pageNumber, el);
      // Read dimensions from the parent (the PdfPage overlay container sets width/height)
      const measure = () => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setPageDimensions((prev) => {
            const existing = prev[pageNumber];
            if (
              existing &&
              existing.width === rect.width &&
              existing.height === rect.height
            ) {
              return prev;
            }
            return {
              ...prev,
              [pageNumber]: { width: rect.width, height: rect.height },
            };
          });
        }
      };
      // Measure after a short delay to ensure PDF page has rendered
      measure();
      const timer = setTimeout(measure, 500);
      return () => clearTimeout(timer);
    } else {
      overlayRefs.current.delete(pageNumber);
    }
  }, []);

  // Remeasure on window resize
  useEffect(() => {
    const handleResize = () => {
      overlayRefs.current.forEach((el, pageNumber) => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setPageDimensions((prev) => ({
            ...prev,
            [pageNumber]: { width: rect.width, height: rect.height },
          }));
        }
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleFill = useCallback(
    (fieldId: string, value: string) => {
      setFieldValue(fieldId, value);
    },
    [setFieldValue]
  );

  const handleSubmit = async () => {
    await submit(token);
  };

  // --- Next Field navigation ---
  // Build a stable list of required fields sorted by page, then y, then x
  const requiredFields = useMemo(
    () =>
      fields
        .filter(
          (f) =>
            f.required &&
            (!f.signerEmail || f.signerEmail === signerEmail)
        )
        .sort((a, b) => {
          if (a.page !== b.page) return a.page - b.page;
          if (a.yPercent !== b.yPercent) return a.yPercent - b.yPercent;
          return a.xPercent - b.xPercent;
        }),
    [fields, signerEmail]
  );

  // Derive which required fields are still unfilled
  const unfilledRequired = useMemo(
    () => requiredFields.filter((f) => !values[f.id]),
    [requiredFields, values]
  );

  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [highlightFieldId, setHighlightFieldId] = useState<string | null>(null);

  // Clamp index when unfilled list shrinks (fields get filled)
  useEffect(() => {
    if (currentFieldIndex >= unfilledRequired.length && unfilledRequired.length > 0) {
      setCurrentFieldIndex(0);
    }
  }, [currentFieldIndex, unfilledRequired.length]);

  const handleNextField = useCallback(() => {
    if (unfilledRequired.length === 0) return;

    const idx = currentFieldIndex % unfilledRequired.length;
    const targetField = unfilledRequired[idx];

    // Scroll to the page containing this field
    const pageEl = document.querySelector(
      `[data-page-number="${targetField.page}"]`
    );
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Highlight the field briefly
    setHighlightFieldId(targetField.id);
    setTimeout(() => setHighlightFieldId(null), 1500);

    // Advance to the next unfilled field for the following click
    setCurrentFieldIndex((idx + 1) % unfilledRequired.length);
  }, [unfilledRequired, currentFieldIndex]);

  if (submitted) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="bg-white border-4 border-black p-8 max-w-lg w-full text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-2xl font-bold tracking-tighter uppercase mb-4">
            SIGNATURE COMPLETE
          </h1>
          <p className="text-stone-600 mb-6">
            You have successfully signed the document. All fields have been
            submitted.
          </p>
          <div className="p-4 bg-green-100 border-4 border-green-400">
            <p className="font-semibold uppercase text-green-800 text-sm">
              DOCUMENT SIGNED SUCCESSFULLY
            </p>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent =
    totalRequired > 0 ? (filledCount / totalRequired) * 100 : 0;

  const renderOverlay = (pageNumber: number) => {
    const pageFields = fields.filter((f) => f.page === pageNumber);
    if (pageFields.length === 0) return null;

    const dims = pageDimensions[pageNumber];

    return (
      <div
        ref={(el) => measureOverlay(pageNumber, el)}
        className="absolute inset-0"
      >
        {dims &&
          pageFields.map((field) => {
            const isCurrentSigner =
              !field.signerEmail || field.signerEmail === signerEmail;
            const isHighlighted = highlightFieldId === field.id;
            return (
              <div key={field.id} className="contents">
                <SignableField
                  field={field}
                  value={values[field.id] || null}
                  onFill={handleFill}
                  disabled={!isCurrentSigner}
                  containerWidth={dims.width}
                  containerHeight={dims.height}
                />
                {/* Highlight pulse overlay */}
                {isHighlighted && (
                  <div
                    className="absolute z-50 pointer-events-none border-4 border-black bg-yellow-300/30 animate-pulse"
                    style={{
                      left: `${field.xPercent}%`,
                      top: `${field.yPercent}%`,
                      width: `${field.widthPercent}%`,
                      height: `${field.heightPercent}%`,
                      boxShadow: '0 0 0 4px rgba(0,0,0,0.3)',
                    }}
                  />
                )}
              </div>
            );
          })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      {/* Progress bar */}
      <div className="sticky top-0 z-40 bg-white border-b-4 border-black">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-bold uppercase text-sm tracking-wide">
              TRAZA
            </h1>
            <span className="text-xs font-mono text-stone-500">
              E-SIGNATURE
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wide text-stone-600">
              {filledCount} OF {totalRequired} FIELDS
            </span>
          </div>
        </div>
        {/* Progress bar track */}
        <div className="h-2 bg-stone-200">
          <div
            className="h-full bg-black transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* PDF viewer with fields */}
      <div className="flex-1">
        <PdfViewer
          pdfUrl={pdfUrl}
          renderOverlay={renderOverlay}
          className="min-h-[calc(100vh-200px)]"
        />
      </div>

      {/* Bottom action bar */}
      <div className="sticky bottom-0 z-40 bg-white border-t-4 border-black">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          {/* Decline / Delegate links */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {onDecline && (
              <button
                onClick={onDecline}
                className="text-xs font-bold uppercase tracking-wide text-stone-400 hover:text-black transition-colors underline"
              >
                Decline
              </button>
            )}
            {onDelegate && (
              <button
                onClick={onDelegate}
                className="text-xs font-bold uppercase tracking-wide text-blue-400 hover:text-blue-700 transition-colors underline"
              >
                Delegate
              </button>
            )}
          </div>

          {error && (
            <div className="flex-1 p-2 border-2 border-black bg-stone-100">
              <p className="text-xs font-semibold text-red-600">{error}</p>
            </div>
          )}
          {!error && <div className="flex-1" />}

          {/* Next Field navigation button */}
          {unfilledRequired.length > 0 && (
            <button
              onClick={handleNextField}
              className="px-6 py-3 font-bold uppercase text-sm tracking-wide border-4 border-black bg-yellow-300 text-black hover:bg-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
            >
              NEXT: FIELD {(currentFieldIndex % unfilledRequired.length) + 1} OF{' '}
              {unfilledRequired.length}
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!allRequiredFilled || submitting}
            className={`px-8 py-3 font-bold uppercase text-sm tracking-wide transition-colors border-4 border-black ${
              allRequiredFilled && !submitting
                ? 'bg-black text-white hover:bg-stone-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
          >
            {submitting ? 'SUBMITTING...' : 'SUBMIT SIGNATURE'}
          </button>
        </div>
      </div>
    </div>
  );
}
