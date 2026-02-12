import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center shadow-brutal">
        <h1 className="text-6xl font-bold tracking-tighter uppercase mb-2">
          404
        </h1>
        <p className="text-stone-500 font-mono text-sm mb-6">
          PAGE NOT FOUND
        </p>
        <p className="text-stone-600 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link href="/" className="btn inline-block">
          Go Home
        </Link>
      </div>
    </div>
  );
}
