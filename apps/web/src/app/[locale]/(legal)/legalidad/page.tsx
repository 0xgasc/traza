import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getLegalidadContent, LEGAL_COUNTRIES } from "@/content/legalidad";

export default function LegalidadIndexPage() {
  const locale = useLocale();
  const c = getLegalidadContent(locale);

  return (
    <article>
      <header className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4">
          {c.title}
        </h1>
      </header>

      <div className="space-y-10 text-stone-700 leading-relaxed">
        <section className="space-y-4">
          {c.intro.map((p) => (
            <p key={p.slice(0, 32)}>{p}</p>
          ))}
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-6 tracking-tight">
            {c.stackHeading}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {c.stack.map((item) => (
              <div key={item.name} className="border-4 border-black p-5 bg-stone-50">
                <h3 className="font-bold text-black mb-2">{item.name}</h3>
                <p className="text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-6 tracking-tight">
            {c.countriesHeading}
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {LEGAL_COUNTRIES.map((key) => {
              const country = c.countries[key];
              return (
                <Link
                  key={key}
                  href={`/legalidad/${key}`}
                  className="border-4 border-black p-6 bg-white hover:bg-black hover:text-white transition-colors group"
                >
                  <span className="text-3xl block mb-3">{country.flag}</span>
                  <h3 className="text-lg font-bold mb-2">{country.name}</h3>
                  <p className="text-xs font-mono text-stone-500 group-hover:text-stone-300">
                    {country.law}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        <p className="text-sm text-stone-500 border-l-4 border-black pl-4">
          {c.disclaimer}
        </p>
      </div>
    </article>
  );
}
