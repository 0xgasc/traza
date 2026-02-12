import Link from "next/link";

const features = [
  {
    title: "Cryptographic Proof",
    description:
      "Every document is SHA-256 hashed at upload. Tamper-proof verification, instantly.",
    icon: "#",
  },
  {
    title: "Blockchain Anchored",
    description:
      "Optional Polygon anchoring gives you immutable, timestamped proof on-chain.",
    icon: "\u26D3",
  },
  {
    title: "API-First",
    description:
      "Clean REST API with webhooks. Integrate signing into your product in minutes.",
    icon: "/",
  },
  {
    title: "Audit Trail",
    description:
      "Every view, sign, and download is logged with IP, timestamp, and user agent.",
    icon: "\u2022",
  },
  {
    title: "Developer Experience",
    description:
      "TypeScript SDK, OpenAPI docs, and webhook signatures. Built for developers.",
    icon: ">",
  },
  {
    title: "Transparent Pricing",
    description:
      "Free tier included. No per-envelope surprises. Scale when you need to.",
    icon: "$",
  },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "5 documents / month",
      "Email signatures",
      "SHA-256 hashing",
      "Basic audit trail",
    ],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "$12",
    period: "/ month",
    features: [
      "50 documents / month",
      "Custom branding",
      "API access",
      "Webhook notifications",
      "Priority support",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$39",
    period: "/ month",
    features: [
      "Unlimited documents",
      "Blockchain anchoring",
      "Team accounts",
      "Advanced audit logs",
      "Custom webhook events",
      "Bulk send",
    ],
    cta: "Go Pro",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: [
      "Everything in Pro",
      "SSO / SAML",
      "Dedicated support",
      "Custom SLA",
      "On-prem option",
      "Compliance packages",
    ],
    cta: "Contact Us",
    highlighted: false,
  },
];

export default function LandingPage() {
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
              Sign In
            </Link>
            <Link href="/register" className="btn text-sm">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b-4 border-black">
        <div className="max-w-4xl mx-auto px-6 py-24 md:py-32 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tighter leading-[0.95]">
            Contracts,
            <br />
            signed with proof.
          </h1>
          <p className="text-xl md:text-2xl mb-10 text-stone-600 max-w-2xl mx-auto">
            A modern e-signature platform with cryptographic verification,
            audit-grade security, and pricing that makes sense.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register" className="btn text-lg">
              Start Free
            </Link>
            <Link href="/api/docs" className="btn-secondary text-lg">
              View API
            </Link>
          </div>
          <p className="mt-6 text-sm text-stone-400">
            No credit card required. 5 free documents per month.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-b-4 border-black bg-stone-100">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center tracking-tight">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-0">
            {[
              {
                step: "01",
                title: "Upload",
                desc: "Drop your PDF. We hash it with SHA-256 immediately.",
              },
              {
                step: "02",
                title: "Send",
                desc: "Add signers. They get a secure link. No account needed.",
              },
              {
                step: "03",
                title: "Prove",
                desc: "Download the signed doc with a cryptographic proof bundle.",
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className={`p-8 border-4 border-black ${i > 0 ? "md:border-l-0" : ""} bg-white`}
              >
                <span className="font-mono text-sm text-stone-400 block mb-2">
                  {item.step}
                </span>
                <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
                <p className="text-stone-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b-4 border-black">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center tracking-tight">
            Built different
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 border-4 border-black -mt-[4px] first:mt-0 md:-ml-[4px] md:first:ml-0"
              >
                <span className="text-3xl font-mono block mb-3">
                  {feature.icon}
                </span>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  {feature.description}
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
            Simple pricing
          </h2>
          <p className="text-center text-stone-500 mb-12 text-lg">
            Start free. Upgrade when it matters.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-0">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`p-6 border-4 border-black -ml-[4px] first:ml-0 flex flex-col ${
                  plan.highlighted ? "bg-black text-white" : "bg-white"
                }`}
              >
                <h3 className="text-sm font-bold uppercase tracking-widest mb-1">
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span
                      className={`text-sm ${plan.highlighted ? "text-stone-400" : "text-stone-500"}`}
                    >
                      {" "}
                      {plan.period}
                    </span>
                  )}
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className={`text-sm ${plan.highlighted ? "text-stone-300" : "text-stone-600"}`}
                    >
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block text-center py-3 border-4 font-bold uppercase text-sm tracking-wide transition-colors ${
                    plan.highlighted
                      ? "bg-white text-black border-white hover:bg-stone-200"
                      : "bg-black text-white border-black hover:bg-stone-900"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b-4 border-black">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
            Ready to sign with proof?
          </h2>
          <p className="text-lg text-stone-600 mb-8">
            Join developers and businesses who trust cryptographic verification
            over legacy e-signature platforms.
          </p>
          <Link href="/register" className="btn text-lg">
            Create Free Account
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
              API Docs
            </Link>
            <span className="hover:text-white transition-colors cursor-pointer">
              Terms
            </span>
            <span className="hover:text-white transition-colors cursor-pointer">
              Privacy
            </span>
            <span className="hover:text-white transition-colors cursor-pointer">
              Status
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
