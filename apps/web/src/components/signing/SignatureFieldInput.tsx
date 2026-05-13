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
      <div className="w-full h-full flex items-center justify-center bg-stone-50/80 border border-stone-200">
        {value ? (
          <img src={value} alt="Signature" className="w-full h-full object-fill" />
        ) : (
          <span className="text-xs font-bold uppercase tracking-wide text-stone-400">
            SIGNATURE
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full h-full cursor-pointer focus:outline-none relative"
        data-field-id={fieldId}
      >
        {/* Invisible expanded hit area — makes a tiny signature box easy to
            tap on mobile without changing the saved field size. */}
        {!value && (
          <span aria-hidden className="absolute -inset-3 sm:-inset-1" />
        )}
        {value ? (
          <div className="w-full h-full bg-transparent flex items-center justify-center overflow-hidden">
            <img
              src={value}
              alt="Signature"
              className="w-full h-full object-fill"
            />
          </div>
        ) : (
          <div className="w-full h-full bg-yellow-100/50 hover:bg-yellow-200/70 flex items-end justify-center animate-pulse transition-colors overflow-hidden relative">
            <span className="text-[9px] leading-none text-stone-700 select-none">✍</span>
          </div>
        )}
      </button>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onTouchMove={(e) => e.stopPropagation()}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setModalOpen(false)}
          />
          {/* Modal content — centered, scrollable, respects safe area */}
          <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b-4 border-black px-4 py-3 bg-white">
              <h2 className="font-bold uppercase text-sm tracking-wide">
                SIGN HERE
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
