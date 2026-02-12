'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/admin', label: 'Overview', icon: '📊' },
  { href: '/admin/organizations', label: 'Organizations', icon: '🏢' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/feature-flags', label: 'Feature Flags', icon: '🚩' },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: '📋' },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-zinc-900 text-white flex flex-col border-r-4 border-black">
      <div className="p-6 border-b-4 border-black bg-red-600">
        <Link href="/admin" className="block">
          <h1 className="text-xl font-black uppercase tracking-tighter">
            Traza Admin
          </h1>
          <p className="text-xs text-red-200 uppercase tracking-wide mt-1">
            Super Admin Console
          </p>
        </Link>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wide transition-colors border-2 ${
                    isActive
                      ? 'bg-white text-black border-white'
                      : 'border-transparent hover:bg-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t-4 border-black">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wide border-2 border-zinc-700 hover:bg-zinc-800 transition-colors"
        >
          <span>←</span>
          Back to App
        </Link>
      </div>
    </aside>
  );
}
