'use client';

import { useState, useRef } from 'react';

interface DateFieldInputProps {
  fieldId: string;
  value: string | null;
  onFill: (value: string) => void;
  disabled?: boolean;
  boxHeight?: number;
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
  boxHeight,
}: DateFieldInputProps) {
  // Cap font at 12px to match TextFieldInput — keeps filled values
  // proportional to surrounding PDF body text.
  const fontPx = boxHeight ? Math.max(7, Math.min(boxHeight * 0.6, 12)) : 12;
  const fontStyle = { fontSize: `${fontPx}px`, lineHeight: 1 };
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
      <div className="w-full h-full flex items-center px-1 overflow-hidden">
        {value ? (
          <span className="font-mono text-black whitespace-nowrap" style={fontStyle}>{formatDate(value)}</span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
            DATE
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="w-full h-full relative cursor-pointer"
      onClick={handleClick}
      data-field-id={fieldId}
    >
      {!value && (
        <span aria-hidden className="absolute -inset-3 sm:-inset-1" />
      )}
      {value ? (
        <div className="w-full h-full bg-transparent flex items-center px-1 hover:bg-stone-50/60 transition-colors overflow-hidden">
          <span className="font-mono font-semibold text-black whitespace-nowrap" style={fontStyle}>
            {formatDate(value)}
          </span>
        </div>
      ) : (
        <div className="w-full h-full bg-yellow-100/50 hover:bg-yellow-200/70 flex items-end justify-center transition-colors overflow-hidden">
          <span className="text-[9px] leading-none text-stone-700 select-none">📅</span>
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
