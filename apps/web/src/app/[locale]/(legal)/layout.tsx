import { Link } from "@/i18n/navigation";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <nav className="border-b-4 border-black px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-extrabold uppercase tracking-tighter hover:underline">
            traza
          </Link>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        {children}
      </main>
      <footer className="px-6 py-8 bg-black text-white">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-extrabold uppercase tracking-tighter text-lg">
            traza
          </span>
          <div className="flex gap-6 text-sm text-stone-400">
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
          </div>
          <span className="text-sm text-stone-500">
            &copy; {new Date().getFullYear()} Traza
          </span>
        </div>
      </footer>
    </div>
  );
}
