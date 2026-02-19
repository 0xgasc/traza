"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center shadow-brutal">
        <h1 className="text-4xl font-bold tracking-tighter uppercase mb-2">
          Error
        </h1>
        <p className="text-stone-500 font-mono text-sm mb-6">
          SOMETHING WENT WRONG
        </p>
        <div className="p-4 bg-stone-50 border-2 border-stone-200 mb-6">
          <p className="text-sm font-mono break-all">
            {error.message || "An unexpected error occurred."}
          </p>
        </div>
        <button onClick={reset} className="btn w-full">
          Try Again
        </button>
      </div>
    </div>
  );
}
