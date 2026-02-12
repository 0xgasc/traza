import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  const base =
    'px-6 py-3 border-4 border-black font-semibold uppercase tracking-wide transition-colors active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:pointer-events-none';

  const variants = {
    primary: 'bg-black text-white hover:bg-stone-900',
    secondary: 'bg-white text-black hover:bg-stone-100',
    danger: 'bg-black text-white hover:bg-stone-800',
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
