"use client";

import { useAuth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useEffect } from "react";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: "📊" },
  { name: "Organizations", href: "/admin/organizations", icon: "🏢" },
  { name: "Users", href: "/admin/users", icon: "👥" },
  { name: "Audit Logs", href: "/admin/audit-logs", icon: "📝" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (!user || user.platformRole !== "SUPER_ADMIN")) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user || user.platformRole !== "SUPER_ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Admin Header */}
      <header className="bg-black text-white border-b-4 border-black">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-2xl font-extrabold uppercase tracking-tighter hover:underline">
                traza
              </Link>
              <span className="text-xs font-bold uppercase tracking-widest bg-white text-black px-2 py-1">
                Admin
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-stone-300">{user.email}</span>
              <Link href="/dashboard" className="text-sm hover:underline">
                Back to App →
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <div className="md:hidden overflow-x-auto border-b-4 border-black bg-white">
        <nav className="flex gap-1 p-2 min-w-max">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wide whitespace-nowrap border-2 border-black transition-colors ${
                  isActive
                    ? "bg-black text-white"
                    : "bg-white hover:bg-stone-100"
                }`}
              >
                <span>{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 bg-white border-r-4 border-black min-h-screen">
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold border-4 border-black transition-colors ${
                    isActive
                      ? "bg-black text-white"
                      : "bg-white hover:bg-stone-100"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
