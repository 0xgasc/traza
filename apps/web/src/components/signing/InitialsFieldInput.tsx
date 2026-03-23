'use client';

import { useState } from 'react';
import SignatureCapture from '@/components/SignatureCapture';

interface InitialsFieldInputProps {
  fieldId: string;
  value: string | null;
  onFill: (value: string) => void;
  disabled?: boolean;
}

export default function InitialsFieldInput({
  fieldId,
  value,
  onFill,
  disabled = false,
}: InitialsFieldInputProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleComplete = (dataUrl: string) => {
    onFill(dataUrl);
    setModalOpen(false);
  };

  if (disabled) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-stone-50/80 border border-stone-200">
        {value ? (
          <img src={value} alt="Initials" className="w-full h-full object-fill" />
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
            INITIALS
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
        className="w-full h-full cursor-pointer focus:outline-none"
        data-field-id={fieldId}
      >
        {value ? (
          <div className="w-full h-full border-2 border-black bg-white flex items-center justify-center hover:border-stone-600 transition-colors">
            <img
              src={value}
              alt="Initials"
              className="w-full h-full object-fill"
            />
          </div>
        ) : (
          <div className="w-full h-full border-3 border-dashed border-black bg-stone-50 flex items-center justify-center animate-pulse hover:bg-stone-100 transition-colors">
            <span className="text-[10px] font-bold uppercase tracking-wide text-black">
              INITIALS
            </span>
          </div>
        )}
      </button>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setModalOpen(false)}
          />
          {/* Modal content */}
          <div className="relative z-10 w-full max-w-sm bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-4 border-black px-4 py-3">
              <h2 className="font-bold uppercase text-sm tracking-wide">
                DRAW YOUR INITIALS
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="font-bold text-lg leading-none hover:text-stone-500 transition-colors px-2"
              >
                X
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs font-semibold text-stone-600 mb-3">
                Draw only your initials (e.g., &quot;JD&quot; for John Doe). Keep it simple and compact.
              </p>
              <SignatureCapture
                onComplete={handleComplete}
                width={300}
                height={120}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
