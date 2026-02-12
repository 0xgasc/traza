import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Traza \u2014 Contracts, signed with proof.",
  description:
    "Modern e-signature platform with cryptographic verification and blockchain anchoring.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontClasses = inter.variable + " " + jetbrainsMono.variable;
  return (
    <html lang="en" className={fontClasses}>
      <body>
        <ErrorBoundary>
          <AuthProvider>{children}</AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
