'use client';

import { useState, useRef } from 'react';

interface TextFieldInputProps {
  fieldId: string;
  value: string | null;
  onFill: (value: string) => void;
  label?: string;
  disabled?: boolean;
  boxHeight?: number;
}

export default function TextFieldInput({
  fieldId,
  value,
  onFill,
  label,
  disabled = false,
  boxHeight,
}: TextFieldInputProps) {
  const fontPx = boxHeight ? Math.max(8, Math.min(boxHeight * 0.7, 16)) : undefined;
  const fontStyle = fontPx ? { fontSize: `${fontPx}px`, lineHeight: 1 } : undefined;
  const [localValue, setLocalValue] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleBlur = () => {
    if (localValue !== (value || '')) {
      onFill(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onFill(localValue);
      inputRef.current?.blur();
    }
  };

  if (disabled) {
    return (
      <div className="w-full h-full flex items-center px-1 overflow-hidden">
        {value ? (
          <span className="font-mono text-black truncate" style={fontStyle}>{value}</span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
            {label || 'TEXT'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={label || 'Enter text'}
        data-field-id={fieldId}
        style={fontStyle}
        className="flex-1 min-w-0 w-full border-0 bg-yellow-100/50 hover:bg-yellow-200/70 focus:bg-white px-1 font-semibold focus:outline-none transition-colors placeholder:text-stone-500 placeholder:font-normal"
      />
    </div>
  );
}
