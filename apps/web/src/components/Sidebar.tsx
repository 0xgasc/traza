'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import OrgSwitcher from './OrgSwitcher';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/documents', label: 'Documents' },
  { href: '/templates', label: 'Templates' },
  { href: '/settings', label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, isSuperAdmin, logout } = useAuth();

  return (
    <aside className="w-64 min-h-screen bg-white border-r-4 border-black flex flex-col justify-between">
      <div>
        {/* Logo */}
        <div className="p-6 border-b-4 border-black">
          <Link href="/dashboard">
            <h1 className="text-2xl font-bold tracking-tighter uppercase">
              Traza
            </h1>
            <p className="text-xs text-stone-500 font-mono mt-1">
              E-SIGNATURE PLATFORM
            </p>
          </Link>
        </div>

        {/* Organization Switcher */}
        <div className="p-4 border-b-4 border-black bg-stone-50">
          <p className="text-xs font-bold uppercase text-stone-500 mb-2">
            Organization
          </p>
          <OrgSwitcher />
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-3 font-semibold uppercase text-sm tracking-wide transition-colors border-4 ${
                  isActive
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-transparent hover:border-black'
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          {/* Admin Link (Super Admin only) */}
          {isSuperAdmin && (
            <Link
              href="/admin"
              className={`block px-4 py-3 font-semibold uppercase text-sm tracking-wide transition-colors border-4 mt-4 ${
                pathname.startsWith('/admin')
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-red-600 border-red-600 hover:bg-red-600 hover:text-white'
              }`}
            >
              Admin Console
            </Link>
          )}
        </nav>
      </div>

      {/* User / Logout */}
      <div className="p-4 border-t-4 border-black">
        {user && (
          <div className="mb-3 px-4">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-xs text-stone-500 font-mono truncate">
              {user.email}
            </p>
            {isSuperAdmin && (
              <p className="text-xs text-red-600 font-bold uppercase mt-1">
                Super Admin
              </p>
            )}
          </div>
        )}
        <button
          onClick={logout}
          className="w-full px-4 py-3 bg-white text-black border-4 border-black font-semibold uppercase text-sm tracking-wide hover:bg-black hover:text-white transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
