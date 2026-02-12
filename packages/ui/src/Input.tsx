import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={inputId} className="font-semibold text-sm uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`px-4 py-3 bg-white border-3 border-black focus:outline-none focus:ring-4 focus:ring-stone-300 ${className}`}
        {...props}
      />
    </div>
  );
}
