import { notFound } from "next/navigation";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  getLegalidadContent,
  LEGAL_COUNTRIES,
  type LegalCountry,
} from "@/content/legalidad";

export default function LegalidadCountryPage({
  params,
}: {
  params: { country: string };
}) {
  const locale = useLocale();
  if (!LEGAL_COUNTRIES.includes(params.country as LegalCountry)) {
    notFound();
  }
  const c = getLegalidadContent(locale);
  const country = c.countries[params.country as LegalCountry];

  return (
    <article>
      <Link
        href="/legalidad"
        className="font-mono text-sm text-stone-500 hover:underline block mb-6"
      >
        ← {c.backLabel}
      </Link>
      <header className="mb-10">
        <span className="text-4xl block mb-4">{country.flag}</span>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tighter mb-3">
          {country.name}
        </h1>
        <p className="font-mono text-sm text-stone-500">{country.law}</p>
      </header>

      <div className="space-y-10 text-stone-700 leading-relaxed">
        <p className="text-lg">{country.lawSummary}</p>

        {country.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
              {section.heading}
            </h2>
            <div className="space-y-4">
              {section.paragraphs.map((p) => (
                <p key={p.slice(0, 32)}>{p}</p>
              ))}
            </div>
          </section>
        ))}

        <section className="border-4 border-black p-6 bg-stone-50">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {country.evidenceHeading}
          </h2>
          <ul className="space-y-3">
            {country.evidence.map((item) => (
              <li key={item.slice(0, 32)} className="flex gap-3 text-sm">
                <span className="font-mono">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 tracking-tight">
            {country.limitsHeading}
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-sm">
            {country.limits.map((item) => (
              <li key={item.slice(0, 32)}>{item}</li>
            ))}
          </ul>
        </section>

        <p className="text-sm text-stone-500 border-l-4 border-black pl-4">
          {c.disclaimer}
        </p>
      </div>
    </article>
  );
}
