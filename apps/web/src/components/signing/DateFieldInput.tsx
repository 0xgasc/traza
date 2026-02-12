'use client';

import { useState, useRef } from 'react';

interface DateFieldInputProps {
  fieldId: string;
  value: string | null;
  onFill: (value: string) => void;
  disabled?: boolean;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DateFieldInput({
  fieldId,
  value,
  onFill,
  disabled = false,
}: DateFieldInputProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (disabled) return;

    if (!value) {
      // Auto-fill with today's date on first click
      const today = getTodayISO();
      onFill(today);
    } else {
      // Open native date picker
      setEditing(true);
      setTimeout(() => {
        inputRef.current?.showPicker?.();
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    if (newVal) {
      onFill(newVal);
    }
    setEditing(false);
  };

  const handleBlur = () => {
    setEditing(false);
  };

  if (disabled) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-stone-100/60 border-2 border-dashed border-stone-300">
        <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
          DATE
        </span>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full relative cursor-pointer"
      onClick={handleClick}
      data-field-id={fieldId}
    >
      {value ? (
        <div className="w-full h-full border-3 border-black bg-stone-50 flex items-center px-2 hover:bg-white transition-colors">
          <span className="font-mono font-semibold text-sm text-black">
            {formatDate(value)}
          </span>
        </div>
      ) : (
        <div className="w-full h-full border-3 border-dashed border-black bg-stone-50 flex items-center justify-center hover:bg-stone-100 transition-colors">
          <span className="text-xs font-bold uppercase tracking-wide text-stone-500">
            CLICK FOR DATE
          </span>
        </div>
      )}

      {editing && (
        <input
          ref={inputRef}
          type="date"
          value={value || getTodayISO()}
          onChange={handleChange}
          onBlur={handleBlur}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      )}
    </div>
  );
}
