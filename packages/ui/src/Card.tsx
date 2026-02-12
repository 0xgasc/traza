import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  shadow?: boolean;
}

export function Card({ children, className = '', shadow = false }: CardProps) {
  return (
    <div
      className={`bg-white border-4 border-black p-6 ${shadow ? 'shadow-brutal' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
