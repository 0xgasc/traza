import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const featureIcons = ["#", "⛓", "/", "•", ">", "$"];

export default function LandingPage() {
  const t = useTranslations("landing");
  const nav = useTranslations("nav");

  const features = [
    { key: "cryptoProof", icon: featureIcons[0] },
    { key: "blockchain", icon: featureIcons[1] },
    { key: "apiFirst", icon: featureIcons[2] },
    { key: "auditTrail", icon: featureIcons[3] },
    { key: "dx", icon: featureIcons[4] },
    { key: "pricing", icon: featureIcons[5] },
  ] as const;

  const planKeys = ["free", "starter", "pro", "enterprise"] as const;
  const highlightedPlan = "pro";

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b-4 border-black px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-2xl font-extrabold uppercase tracking-tighter">
            traza
          </span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="font-semibold hover:underline">
              {nav("signIn")}
            </Link>
            <Link href="/register" className="btn text-sm">
              {nav("startFree")}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b-4 border-black">
        <div className="max-w-4xl mx-auto px-6 py-24 md:py-32 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tighter leading-[0.95]">
            {t("hero.title")}
          </h1>
          <p className="text-xl md:text-2xl mb-10 text-stone-600 max-w-2xl mx-auto">
            {t("hero.subtitle")}
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register" className="btn text-lg">
              {t("hero.startFree")}
            </Link>
            <Link href="/api/docs" className="btn-secondary text-lg">
              {t("hero.viewApi")}
            </Link>
          </div>
          <p className="mt-6 text-sm text-stone-400">
            {t("hero.noCreditCard")}
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-b-4 border-black bg-stone-100">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center tracking-tight">
            {t("howItWorks.heading")}
          </h2>
          <div className="grid md:grid-cols-3 gap-0">
            {(["step1", "step2", "step3"] as const).map((step, i) => (
              <div
                key={step}
                className={`p-8 border-4 border-black ${i > 0 ? "md:border-l-0" : ""} bg-white`}
              >
                <span className="font-mono text-sm text-stone-400 block mb-2">
                  {t(`howItWorks.${step}.num`)}
                </span>
                <h3 className="text-2xl font-bold mb-2">{t(`howItWorks.${step}.title`)}</h3>
                <p className="text-stone-600">{t(`howItWorks.${step}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b-4 border-black">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center tracking-tight">
            {t("features.heading")}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0">
            {features.map((feature) => (
              <div
                key={feature.key}
                className="p-6 border-4 border-black -mt-[4px] first:mt-0 md:-ml-[4px] md:first:ml-0"
              >
                <span className="text-3xl font-mono block mb-3">
                  {feature.icon}
                </span>
                <h3 className="text-lg font-bold mb-2">{t(`features.${feature.key}.title`)}</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  {t(`features.${feature.key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-b-4 border-black bg-stone-100">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center tracking-tight">
            {t("pricing.heading")}
          </h2>
          <p className="text-center text-stone-500 mb-12 text-lg">
            {t("pricing.subheading")}
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-0">
            {planKeys.map((planKey) => {
              const isHighlighted = planKey === highlightedPlan;
              const features = t.raw(`pricing.${planKey}.features`) as string[];
              return (
                <div
                  key={planKey}
                  className={`p-6 border-4 border-black -ml-[4px] first:ml-0 flex flex-col ${
                    isHighlighted ? "bg-black text-white" : "bg-white"
                  }`}
                >
                  <h3 className="text-sm font-bold uppercase tracking-widest mb-1">
                    {t(`pricing.${planKey}.name`)}
                  </h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">{t(`pricing.${planKey}.price`)}</span>
                    {"period" in {} ? null : (
                      <span className={`text-sm ${isHighlighted ? "text-stone-400" : "text-stone-500"}`}>
                        {" "}{t(`pricing.${planKey}.period`)}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2 mb-6 flex-1">
                    {features.map((f) => (
                      <li
                        key={f}
                        className={`text-sm ${isHighlighted ? "text-stone-300" : "text-stone-600"}`}
                      >
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={`block text-center py-3 border-4 font-bold uppercase text-sm tracking-wide transition-colors ${
                      isHighlighted
                        ? "bg-white text-black border-white hover:bg-stone-200"
                        : "bg-black text-white border-black hover:bg-stone-900"
                    }`}
                  >
                    {t(`pricing.${planKey}.cta`)}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b-4 border-black">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
            {t("cta.heading")}
          </h2>
          <p className="text-lg text-stone-600 mb-8">
            {t("cta.subheading")}
          </p>
          <Link href="/register" className="btn text-lg">
            {t("cta.createAccount")}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 bg-black text-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-extrabold uppercase tracking-tighter text-lg">
            traza
          </span>
          <div className="flex gap-6 text-sm text-stone-400">
            <Link href="/api/docs" className="hover:text-white transition-colors">
              {t("footer.terms")}
            </Link>
            <span className="hover:text-white transition-colors cursor-pointer">
              {t("footer.privacy")}
            </span>
            <span className="hover:text-white transition-colors cursor-pointer">
              {t("footer.status")}
            </span>
          </div>
          <span className="text-sm text-stone-500">
            &copy; {new Date().getFullYear()} Traza
          </span>
        </div>
      </footer>
    </div>
  );
}
