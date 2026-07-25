import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getSecurityContent } from "@/content/security";

export default function SecurityPage() {
  const locale = useLocale();
  const c = getSecurityContent(locale);

  return (
    <article>
      <header className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4">
          {c.title}
        </h1>
        <p className="text-lg text-stone-600 max-w-2xl">{c.intro}</p>
      </header>

      <div className="space-y-12 text-stone-700 leading-relaxed">
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-6 tracking-tight">
            {c.practicesHeading}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {c.practices.map((p) => (
              <div key={p.name} className="border-4 border-black p-5 bg-white">
                <h3 className="font-bold text-black mb-2">{p.name}</h3>
                <p className="text-sm">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-4 border-black p-6 bg-stone-50">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-3 tracking-tight">
            {c.evidenceHeading}
          </h2>
          <p className="mb-4">{c.evidenceDesc}</p>
          <Link href="/verify" className="btn-secondary text-sm">
            → /verify
          </Link>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold text-black mb-3 tracking-tight">
            {c.disclosureHeading}
          </h2>
          <p>{c.disclosureDesc}</p>
        </section>
      </div>
    </article>
  );
}
