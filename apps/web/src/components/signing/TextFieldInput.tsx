'use client';

import { useState, useRef } from 'react';

interface TextFieldInputProps {
  fieldId: string;
  value: string | null;
  onFill: (value: string) => void;
  label?: string;
  disabled?: boolean;
}

export default function TextFieldInput({
  fieldId,
  value,
  onFill,
  label,
  disabled = false,
}: TextFieldInputProps) {
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
      <div className="w-full h-full flex items-center justify-center bg-stone-100/60 border-2 border-dashed border-stone-300">
        <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
          {label || 'TEXT'}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {label && (
        <span className="text-[9px] font-bold uppercase tracking-wide text-stone-500 leading-none mb-0.5 truncate">
          {label}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={label || 'Enter text'}
        data-field-id={fieldId}
        className="flex-1 min-w-0 w-full border-3 border-black bg-stone-50 px-2 py-1 font-semibold text-sm focus:outline-none focus:bg-white focus:border-stone-700 transition-colors placeholder:text-stone-400 placeholder:font-normal"
      />
    </div>
  );
}
