import React from 'react';

type BadgeVariant = 'draft' | 'pending' | 'signed' | 'expired' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  draft: 'bg-stone-200 text-stone-800',
  pending: 'bg-stone-400 text-black',
  signed: 'bg-black text-white',
  expired: 'bg-stone-300 text-stone-600',
  default: 'bg-stone-100 text-black',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider border-2 border-black ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
