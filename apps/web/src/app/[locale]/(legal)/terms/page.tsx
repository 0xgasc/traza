import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function TermsOfServicePage() {
  const t = useTranslations("legal.terms");

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
        {/* Acceptance */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {t("acceptance.heading")}
          </h2>
          <p>{t("acceptance.desc")}</p>
        </section>

        {/* Service Description */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {t("service.heading")}
          </h2>
          <p>{t("service.desc")}</p>
        </section>

        {/* Electronic Signatures */}
        <section className="border-4 border-black p-6 bg-stone-50">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {t("esignatures.heading")}
          </h2>
          <p className="mb-3">{t("esignatures.validity")}</p>
          <p className="mb-3">{t("esignatures.consent")}</p>
          <p>{t("esignatures.noGuarantee")}</p>
        </section>

        {/* Account Terms */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {t("accounts.heading")}
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("accounts.age")}</li>
            <li>{t("accounts.accuracy")}</li>
            <li>{t("accounts.security")}</li>
            <li>{t("accounts.oneAccount")}</li>
          </ul>
        </section>

        {/* Document Retention & Blockchain */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {t("retention.heading")}
          </h2>
          <p className="mb-3">{t("retention.obligation")}</p>
          <p className="font-semibold text-black">{t("retention.blockchain")}</p>
        </section>

        {/* Acceptable Use */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {t("acceptableUse.heading")}
          </h2>
          <p className="mb-4">{t("acceptableUse.intro")}</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("acceptableUse.illegal")}</li>
            <li>{t("acceptableUse.fraud")}</li>
            <li>{t("acceptableUse.abuse")}</li>
            <li>{t("acceptableUse.malware")}</li>
            <li>{t("acceptableUse.reverseEngineer")}</li>
          </ul>
        </section>

        {/* Intellectual Property */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {t("ip.heading")}
          </h2>
          <p className="mb-3">{t("ip.platform")}</p>
          <p>{t("ip.content")}</p>
        </section>

        {/* API Usage */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {t("api.heading")}
          </h2>
          <p>{t("api.desc")}</p>
        </section>

        {/* Limitation of Liability */}
        <section className="border-4 border-black p-6 bg-stone-50">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {t("liability.heading")}
          </h2>
          <p className="mb-3 font-semibold text-black uppercase text-sm">{t("liability.disclaimer")}</p>
          <p className="mb-3">{t("liability.limitation")}</p>
          <p>{t("liability.indemnity")}</p>
        </section>

        {/* Termination */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {t("termination.heading")}
          </h2>
          <p className="mb-3">{t("termination.byYou")}</p>
          <p>{t("termination.byUs")}</p>
        </section>

        {/* Governing Law */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {t("law.heading")}
          </h2>
          <p>{t("law.desc")}</p>
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
        <Link href="/privacy" className="font-semibold hover:underline">
          {t("seeAlsoPrivacy")} &rarr;
        </Link>
      </div>
    </article>
  );
}
