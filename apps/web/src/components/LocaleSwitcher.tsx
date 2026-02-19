"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTransition } from "react";

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const otherLocale = locale === "en" ? "es" : "en";
  const label = locale === "en" ? "ES" : "EN";

  const handleSwitch = () => {
    startTransition(() => {
      router.replace(pathname, { locale: otherLocale });
    });
  };

  return (
    <button
      onClick={handleSwitch}
      disabled={isPending}
      className={`text-xs font-bold uppercase tracking-widest border-2 border-current px-2 py-1 hover:opacity-70 transition-opacity disabled:opacity-40 ${className ?? ""}`}
      title={`Switch to ${otherLocale === "en" ? "English" : "Español"}`}
    >
      {isPending ? "..." : label}
    </button>
  );
}
