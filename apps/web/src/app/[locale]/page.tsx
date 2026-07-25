import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const CURL_SAMPLE = `curl -X POST https://traza-api-production.up.railway.app/api/v1/documents \\
  -H "X-API-Key: $TRAZA_API_KEY" \\
  -F "file=@contrato-arrendamiento.pdf" \\
  -F "title=Contrato de arrendamiento"`;

const WEBHOOK_SAMPLE = `POST https://tu-app.com/webhooks/traza
X-Traza-Event: document.completed
X-Traza-Signature: sha256=9f2b1c...

{
  "event": "document.completed",
  "data": {
    "documentId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "fileHash": "sha256:e3b0c44298fc1c149afbf4c8996fb924...",
    "status": "SIGNED"
  }
}`;

export default function LandingPage() {
  const t = useTranslations("landing");
  const nav = useTranslations("nav");

  const useCaseKeys = ["fintech", "proptech", "hr", "marketplace"] as const;
  const featureKeys = [
    "cryptoProof",
    "blockchain",
    "apiFirst",
    "auditTrail",
    "identity",
    "legal",
  ] as const;
  const featureIcons: Record<(typeof featureKeys)[number], string> = {
    cryptoProof: "#",
    blockchain: "⛓",
    apiFirst: "/",
    auditTrail: "•",
    identity: "@",
    legal: "§",
  };

  const planKeys = ["free", "starter", "pro", "api"] as const;
  const highlightedPlan = "api";

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b-4 border-black px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-2xl font-extrabold uppercase tracking-tighter">
            traza
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="/developers"
              className="font-semibold hover:underline hidden sm:inline"
            >
              {nav("developers")}
            </Link>
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
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-6 tracking-tighter leading-[0.95]">
              {t("hero.title")}
            </h1>
            <p className="text-lg md:text-xl mb-8 text-stone-600 max-w-xl">
              {t("hero.subtitle")}
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link href="/register" className="btn text-lg">
                {t("hero.startFree")}
              </Link>
              <Link href="/developers" className="btn-secondary text-lg">
                {t("hero.quickstart")}
              </Link>
            </div>
            <p className="mt-6 text-sm text-stone-400">{t("hero.noCreditCard")}</p>
          </div>
          <div className="space-y-4 min-w-0">
            <div className="border-4 border-black bg-black text-stone-100 p-4 overflow-x-auto">
              <p className="font-mono text-xs text-stone-500 mb-2">
                $ {t("hero.codeCaptionSend")}
              </p>
              <pre className="font-mono text-xs md:text-sm leading-relaxed whitespace-pre">
                {CURL_SAMPLE}
              </pre>
            </div>
            <div className="border-4 border-black bg-black text-stone-100 p-4 overflow-x-auto">
              <p className="font-mono text-xs text-stone-500 mb-2">
                → {t("hero.codeCaptionWebhook")}
              </p>
              <pre className="font-mono text-xs md:text-sm leading-relaxed whitespace-pre">
                {WEBHOOK_SAMPLE}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Two products */}
      <section className="border-b-4 border-black bg-stone-100">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center tracking-tight">
            {t("products.heading")}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {(["sign", "verify"] as const).map((product) => (
              <div key={product} className="border-4 border-black bg-white p-8 flex flex-col">
                <span className="font-mono text-sm text-stone-400 uppercase tracking-widest mb-2">
                  {t(`products.${product}.kicker`)}
                </span>
                <h3 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">
                  {t(`products.${product}.title`)}
                </h3>
                <p className="text-stone-600 mb-6 flex-1">
                  {t(`products.${product}.desc`)}
                </p>
                <ul className="space-y-2 mb-8">
                  {(t.raw(`products.${product}.bullets`) as string[]).map((b) => (
                    <li key={b} className="text-sm text-stone-700 flex gap-2">
                      <span className="font-mono">→</span>
                      {b}
                    </li>
                  ))}
                </ul>
                <Link
                  href={product === "sign" ? "/developers" : "/verify"}
                  className="btn-secondary text-sm self-start"
                >
                  {t(`products.${product}.cta`)}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-b-4 border-black">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center tracking-tight">
            {t("howItWorks.heading")}
          </h2>
          <div className="grid md:grid-cols-3 gap-4 md:gap-0">
            {(["step1", "step2", "step3"] as const).map((step, i) => (
              <div
                key={step}
                className={`p-6 md:p-8 border-4 border-black ${i > 0 ? "md:border-l-0" : ""} bg-white`}
              >
                <span className="font-mono text-sm text-stone-400 block mb-2">
                  {t(`howItWorks.${step}.num`)}
                </span>
                <h3 className="text-xl md:text-2xl font-bold mb-2">
                  {t(`howItWorks.${step}.title`)}
                </h3>
                <p className="text-sm md:text-base text-stone-600">
                  {t(`howItWorks.${step}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="border-b-4 border-black bg-stone-100">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center tracking-tight">
            {t("useCases.heading")}
          </h2>
          <p className="text-center text-stone-500 mb-12 text-lg">
            {t("useCases.subheading")}
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {useCaseKeys.map((key) => (
              <div key={key} className="border-4 border-black bg-white p-6">
                <h3 className="text-lg font-bold mb-2">{t(`useCases.${key}.title`)}</h3>
                <p className="text-sm text-stone-600 mb-4">
                  {t(`useCases.${key}.desc`)}
                </p>
                <p className="font-mono text-xs text-stone-400">
                  {t(`useCases.${key}.doc`)}
                </p>
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
            {featureKeys.map((key) => (
              <div
                key={key}
                className="p-6 border-4 border-black -mt-[4px] first:mt-0 md:-ml-[4px] md:first:ml-0"
              >
                <span className="text-3xl font-mono block mb-3">{featureIcons[key]}</span>
                <h3 className="text-lg font-bold mb-2">{t(`features.${key}.title`)}</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  {t(`features.${key}.desc`)}
                </p>
              </div>
            ))}
          </div>
          <p className="text-center mt-8 text-sm text-stone-500">
            {t("features.legalNote")}{" "}
            <Link href="/legalidad" className="underline font-semibold">
              {t("features.legalLink")}
            </Link>
          </p>
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
                    <span className="text-4xl font-bold">
                      {t(`pricing.${planKey}.price`)}
                    </span>
                    <span
                      className={`text-sm ${isHighlighted ? "text-stone-400" : "text-stone-500"}`}
                    >
                      {" "}
                      {t(`pricing.${planKey}.period`)}
                    </span>
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
          <p className="text-center mt-8 text-sm text-stone-500">
            {t("pricing.enterpriseNote")}
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b-4 border-black">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
            {t("cta.heading")}
          </h2>
          <p className="text-lg text-stone-600 mb-8">{t("cta.subheading")}</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register" className="btn text-lg">
              {t("cta.createAccount")}
            </Link>
            <Link href="/developers" className="btn-secondary text-lg">
              {t("cta.apiDocs")}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 bg-black text-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-extrabold uppercase tracking-tighter text-lg">
            traza
          </span>
          <div className="flex gap-6 text-sm text-stone-400 flex-wrap justify-center">
            <Link href="/developers" className="hover:text-white transition-colors">
              {t("footer.developers")}
            </Link>
            <Link href="/legalidad" className="hover:text-white transition-colors">
              {t("footer.legal")}
            </Link>
            <Link href="/security" className="hover:text-white transition-colors">
              {t("footer.security")}
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              {t("footer.terms")}
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              {t("footer.privacy")}
            </Link>
            <Link href="/status" className="hover:text-white transition-colors">
              {t("footer.status")}
            </Link>
          </div>
          <span className="text-sm text-stone-500">
            &copy; {new Date().getFullYear()} Traza
          </span>
        </div>
      </footer>
    </div>
  );
}
