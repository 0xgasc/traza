import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { AuthProvider } from "@/lib/auth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CookieConsent } from "@/components/CookieConsent";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Traza — Contracts, signed with proof.",
  description:
    "Modern e-signature platform with cryptographic verification and blockchain anchoring.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='black'/%3E%3Ctext x='50' y='72' font-size='72' font-weight='900' font-family='system-ui,sans-serif' text-anchor='middle' fill='white'%3ET%3C/text%3E%3C/svg%3E",
  },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "en" | "es")) {
    notFound();
  }

  const messages = await getMessages();
  const fontClasses = inter.variable + " " + jetbrainsMono.variable;

  return (
    <html lang={locale} className={fontClasses}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ErrorBoundary>
            <AuthProvider>{children}</AuthProvider>
            <CookieConsent />
          </ErrorBoundary>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
