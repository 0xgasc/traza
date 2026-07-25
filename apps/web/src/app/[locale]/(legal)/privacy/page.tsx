import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function PrivacyPolicyPage() {
  const t = useTranslations("legal.privacy");

  return (
    <article>
      <header className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tighter mb-2">
          {t("title")}
        </h1>
        <p className="text-sm text-stone-500 uppercase tracking-wide">
          {t("lastUpdated")}
        </p>
      </header>

      <div className="space-y-10 text-stone-700 leading-relaxed">
        {/* Introduction */}
        <section>
          <p className="text-lg">{t("intro")}</p>
        </section>

        {/* Data We Collect */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {t("dataCollected.heading")}
          </h2>
          <div className="space-y-4">
            <div className="border-l-4 border-black pl-4">
              <h3 className="font-bold text-black">{t("dataCollected.account.heading")}</h3>
              <p>{t("dataCollected.account.desc")}</p>
            </div>
            <div className="border-l-4 border-black pl-4">
              <h3 className="font-bold text-black">{t("dataCollected.documents.heading")}</h3>
              <p>{t("dataCollected.documents.desc")}</p>
            </div>
            <div className="border-l-4 border-black pl-4">
              <h3 className="font-bold text-black">{t("dataCollected.signatures.heading")}</h3>
              <p>{t("dataCollected.signatures.desc")}</p>
            </div>
            <div className="border-l-4 border-black pl-4">
              <h3 className="font-bold text-black">{t("dataCollected.audit.heading")}</h3>
              <p>{t("dataCollected.audit.desc")}</p>
            </div>
          </div>
        </section>

        {/* Blockchain Anchoring */}
        <section className="border-4 border-black p-6 bg-stone-50">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {t("blockchain.heading")}
          </h2>
          <p className="font-semibold text-black mb-2">{t("blockchain.warning")}</p>
          <p>{t("blockchain.details")}</p>
        </section>

        {/* How We Use Your Data */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {t("usage.heading")}
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("usage.item1")}</li>
            <li>{t("usage.item2")}</li>
            <li>{t("usage.item3")}</li>
            <li>{t("usage.item4")}</li>
            <li>{t("usage.item5")}</li>
          </ul>
        </section>

        {/* Third-Party Services */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {t("thirdParties.heading")}
          </h2>
          <p className="mb-4">{t("thirdParties.intro")}</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border-4 border-black p-4">
              <h3 className="font-bold text-black text-sm uppercase tracking-wide">{t("thirdParties.supabase.name")}</h3>
              <p className="text-sm mt-1">{t("thirdParties.supabase.purpose")}</p>
            </div>
            <div className="border-4 border-black p-4">
              <h3 className="font-bold text-black text-sm uppercase tracking-wide">{t("thirdParties.vercel.name")}</h3>
              <p className="text-sm mt-1">{t("thirdParties.vercel.purpose")}</p>
            </div>
            <div className="border-4 border-black p-4">
              <h3 className="font-bold text-black text-sm uppercase tracking-wide">{t("thirdParties.railway.name")}</h3>
              <p className="text-sm mt-1">{t("thirdParties.railway.purpose")}</p>
            </div>
            <div className="border-4 border-black p-4">
              <h3 className="font-bold text-black text-sm uppercase tracking-wide">{t("thirdParties.stash.name")}</h3>
              <p className="text-sm mt-1">{t("thirdParties.stash.purpose")}</p>
            </div>
          </div>
        </section>

        {/* Cookies */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {t("cookies.heading")}
          </h2>
          <p className="mb-4">{t("cookies.intro")}</p>
          <div className="space-y-3">
            <div className="border-l-4 border-black pl-4">
              <h3 className="font-bold text-black">{t("cookies.session.heading")}</h3>
              <p className="text-sm">{t("cookies.session.desc")}</p>
            </div>
            <div className="border-l-4 border-black pl-4">
              <h3 className="font-bold text-black">{t("cookies.csrf.heading")}</h3>
              <p className="text-sm">{t("cookies.csrf.desc")}</p>
            </div>
            <div className="border-l-4 border-black pl-4">
              <h3 className="font-bold text-black">{t("cookies.consent.heading")}</h3>
              <p className="text-sm">{t("cookies.consent.desc")}</p>
            </div>
          </div>
          <p className="mt-4 text-sm">{t("cookies.noTracking")}</p>
        </section>

        {/* Data Retention */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {t("retention.heading")}
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("retention.account")}</li>
            <li>{t("retention.documents")}</li>
            <li>{t("retention.blockchain")}</li>
            <li>{t("retention.audit")}</li>
          </ul>
        </section>

        {/* Your Rights */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {t("rights.heading")}
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("rights.access")}</li>
            <li>{t("rights.correction")}</li>
            <li>{t("rights.deletion")}</li>
            <li>{t("rights.export")}</li>
          </ul>
          <p className="mt-4">{t("rights.note")}</p>
        </section>

        {/* No Data Sales */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {t("noSales.heading")}
          </h2>
          <p className="font-semibold text-black">{t("noSales.statement")}</p>
        </section>

        {/* Age Requirement */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {t("age.heading")}
          </h2>
          <p>{t("age.desc")}</p>
        </section>

        {/* Changes */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {t("changes.heading")}
          </h2>
          <p>{t("changes.desc")}</p>
        </section>

        {/* Contact */}
        <section className="border-4 border-black p-6">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {t("contact.heading")}
          </h2>
          <p>{t("contact.desc")}</p>
          <p className="mt-2 font-mono text-black font-bold">{t("contact.email")}</p>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t-4 border-black">
        <Link href="/terms" className="font-semibold hover:underline">
          {t("seeAlsoTerms")} &rarr;
        </Link>
      </div>
    </article>
  );
}
