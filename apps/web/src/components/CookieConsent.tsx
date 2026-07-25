"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const COOKIE_CONSENT_KEY = "traza-cookie-consent";

export function CookieConsent() {
  const t = useTranslations("cookieConsent");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
      }}
    >
      <div
        style={{
          maxWidth: "64rem",
          margin: "0 auto",
          padding: "0 1.5rem 1.5rem",
        }}
      >
        <div className="border-4 border-black bg-white p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          <div className="flex-1">
            <p className="text-sm md:text-base text-stone-700">
              {t("message")}{" "}
              <Link
                href="/privacy"
                className="underline font-semibold text-black hover:text-stone-600"
              >
                {t("learnMore")}
              </Link>
            </p>
          </div>
          <button
            onClick={accept}
            className="btn text-sm whitespace-nowrap"
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
