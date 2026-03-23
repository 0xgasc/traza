'use client';

import { useState, useEffect } from 'react';
import SignatureCapture from '@/components/SignatureCapture';

interface SignatureFieldInputProps {
  fieldId: string;
  value: string | null;
  onFill: (value: string) => void;
  disabled?: boolean;
  signerName?: string;
}

export default function SignatureFieldInput({
  fieldId,
  value,
  onFill,
  disabled = false,
  signerName,
}: SignatureFieldInputProps) {
  const [modalOpen, setModalOpen] = useState(false);

  // Lock body scroll when modal is open (prevents glitchy mobile behavior)
  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [modalOpen]);

  const handleComplete = (dataUrl: string) => {
    onFill(dataUrl);
    setModalOpen(false);
  };

  if (disabled) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-stone-100/60 border-2 border-dashed border-stone-300">
        <span className="text-xs font-bold uppercase tracking-wide text-stone-400">
          SIGNATURE
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full h-full cursor-pointer focus:outline-none"
        data-field-id={fieldId}
      >
        {value ? (
          <div className="w-full h-full border-3 border-black bg-white flex items-center justify-center p-1 hover:border-stone-600 transition-colors">
            <img
              src={value}
              alt="Signature"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-full h-full border-3 border-dashed border-black bg-stone-50 flex items-center justify-center animate-pulse hover:bg-stone-100 transition-colors">
            <span className="text-xs font-bold uppercase tracking-wide text-black">
              CLICK TO SIGN
            </span>
          </div>
        )}
      </button>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          onTouchMove={(e) => e.stopPropagation()}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setModalOpen(false)}
          />
          {/* Modal content — bottom sheet on mobile, centered on desktop */}
          <div className="relative z-10 w-full sm:max-w-lg bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-4 border-black px-4 py-3">
              <h2 className="font-bold uppercase text-sm tracking-wide">
                DRAW YOUR SIGNATURE
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="font-bold text-lg leading-none hover:text-stone-500 transition-colors px-2"
              >
                X
              </button>
            </div>
            <div className="p-4">
              <SignatureCapture onComplete={handleComplete} defaultName={signerName} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
