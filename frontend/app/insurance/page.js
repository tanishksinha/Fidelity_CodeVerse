"use client";

import Link from "next/link";
import {
  ArrowRight,
  Heart,
  Shield,
  AlertTriangle,
  GraduationCap,
  Landmark,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import ConsumerHeader from "@/components/ConsumerHeader";

const insuranceProducts = [
  {
    id: "term-life",
    name: "Term Life Shield",
    icon: Shield,
    coverage: "₹1 Crore",
    premium: "₹8,400/year",
    claimRatio: "98.74%",
    term: "10 – 40 years",
    description:
      "Pure life coverage with no investment component. Highest sum assured per rupee of premium.",
    features: [
      "No medical exam up to ₹50L (ages 18-45)",
      "Critical illness rider available",
      "Return of premium option",
    ],
    tag: "MOST POPULAR",
    tagColor: "bg-fidelity-green",
    track: "product_term_life",
  },
  {
    id: "health",
    name: "Health Fortress",
    icon: Heart,
    coverage: "₹25 Lakh",
    premium: "₹12,000/year",
    claimRatio: "96.21%",
    term: "1 year (renewable)",
    description:
      "Comprehensive health insurance covering hospitalization, daycare, and pre/post hospitalization expenses.",
    features: [
      "Cashless at 10,000+ network hospitals",
      "No co-payment up to age 60",
      "Restoration benefit: 100% sum insured",
    ],
    tag: "ESSENTIAL",
    tagColor: "bg-blue-600",
    track: "product_health_fortress",
  },
  {
    id: "critical-illness",
    name: "Critical Care Plus",
    icon: AlertTriangle,
    coverage: "₹50 Lakh",
    premium: "₹18,500/year",
    claimRatio: "94.55%",
    term: "Whole life",
    description:
      "Lump-sum payout on diagnosis of 36 critical illnesses. Covers cancer, heart attack, stroke, organ failure.",
    features: [
      "Covers 36 critical illnesses",
      "Lump-sum payout on first diagnosis",
      "Waiver of premium on claim",
    ],
    tag: null,
    tagColor: null,
    track: "product_critical_illness",
  },
  {
    id: "child-ulip",
    name: "Child Future ULIP",
    icon: GraduationCap,
    coverage: "₹30 Lakh + Market-Linked Returns",
    premium: "₹25,000/year",
    claimRatio: "97.10%",
    term: "15 – 25 years",
    description:
      "Unit-linked plan combining life cover with equity/debt market returns. Built for education funding.",
    features: [
      "Lock-in: 5 years (IRDAI mandate)",
      "Partial withdrawal after lock-in",
      "Fund switching: 4 free per year",
    ],
    tag: "LONG-TERM",
    tagColor: "bg-purple-600",
    track: "product_child_ulip",
  },
  {
    id: "pension-annuity",
    name: "Pension Annuity Plan",
    icon: Landmark,
    coverage: "Guaranteed ₹45,000/month post-60",
    premium: "₹50,000/year",
    claimRatio: "99.02%",
    term: "Lifetime annuity",
    description:
      "Guaranteed pension income after retirement. Converts accumulated corpus into predictable monthly income.",
    features: [
      "Joint life annuity with spouse",
      "Guaranteed period: 10/15/20 years",
      "Commutation up to 60% of corpus",
    ],
    tag: "RETIREMENT",
    tagColor: "bg-amber-600",
    track: "product_pension_annuity",
  },
];

export default function InsurancePage() {
  return (
    <div className="min-h-screen bg-white text-gray-950">
      <ConsumerHeader active="insurance" />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 border-b border-gray-800 py-20 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 12px)',
        }} />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <div
              data-track="insurance_hero_badge"
              className="inline-flex items-center gap-2 rounded-full border border-fidelity-green/30 bg-fidelity-green/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-fidelity-green"
            >
              <ShieldCheck size={14} /> IRDAI Regulated
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
              Protection that works while you live
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Comprehensive insurance solutions designed around life stages — from term
              coverage to health, critical illness, and guaranteed pension income.
            </p>
            <div className="mt-6 text-sm text-gray-400 font-mono">
              5 products · ₹8,400 – ₹50,000/year · Claim ratios: 94-99%
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {insuranceProducts.map((product) => {
            const Icon = product.icon;
            return (
              <article
                key={product.id}
                data-track={product.track}
                className="group relative flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-fidelity-green/50 hover:shadow-lg"
              >
                {/* Tag Badge */}
                {product.tag && (
                  <span
                    className={`absolute -top-3 right-5 rounded-full ${product.tagColor} px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm`}
                  >
                    {product.tag}
                  </span>
                )}

                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-fidelity-green/10 text-fidelity-green">
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-950">{product.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">{product.premium}</p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-gray-600">{product.description}</p>

                {/* Key Metrics */}
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-gray-100 pt-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Coverage
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {product.coverage}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Claim Ratio
                    </p>
                    <p className="mt-1 text-sm font-semibold text-fidelity-green">
                      {product.claimRatio}
                    </p>
                  </div>
                </div>

                {/* Features */}
                <ul className="mt-4 space-y-2 flex-1">
                  {product.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                      <ChevronRight
                        size={12}
                        className="mt-0.5 shrink-0 text-fidelity-green"
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href="/checkout"
                  data-track={`btn_get_quote_${product.id}`}
                  className="mt-6 flex items-center justify-center gap-2 rounded-md bg-gray-950 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-fidelity-green"
                >
                  Get Quote <ArrowRight size={14} />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      {/* Fine Print / Exclusions — Behavioral Friction Trap */}
      <section
        data-track="insurance_exclusions_section"
        className="border-t border-gray-200 bg-gray-50"
      >
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-gray-950">
            Important disclosures & exclusions
          </h2>
          <p className="mt-3 text-sm text-gray-500">
            Please review these terms carefully before proceeding.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div
              data-track="exclusion_waiting_period"
              className="rounded-lg border border-gray-200 bg-white p-5"
            >
              <h4 className="font-bold text-gray-900">Waiting Periods</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-600 leading-relaxed">
                <li>• <strong>Initial waiting period:</strong> 30 days from policy inception (no claims)</li>
                <li>• <strong>Pre-existing conditions:</strong> 48 months continuous coverage required</li>
                <li>• <strong>Specific diseases:</strong> 24 months for joint replacement, hernia, cataract</li>
              </ul>
            </div>
            <div
              data-track="exclusion_general_exclusions"
              className="rounded-lg border border-gray-200 bg-white p-5"
            >
              <h4 className="font-bold text-gray-900">General Exclusions</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-600 leading-relaxed">
                <li>• Self-inflicted injuries, substance abuse, war, nuclear events</li>
                <li>• Cosmetic surgery unless medically necessary</li>
                <li>• Treatment outside India (unless rider purchased)</li>
                <li>• Breach of law, hazardous activities without disclosure</li>
              </ul>
            </div>
            <div
              data-track="exclusion_claim_process"
              className="rounded-lg border border-gray-200 bg-white p-5"
            >
              <h4 className="font-bold text-gray-900">Claim Settlement Process</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-600 leading-relaxed">
                <li>• Cashless claims: pre-authorization within 4 hours</li>
                <li>• Reimbursement: 30 days from document submission</li>
                <li>• Death claim (term): 90 days from intimation with investigation</li>
              </ul>
            </div>
            <div
              data-track="exclusion_tax_benefits"
              className="rounded-lg border border-gray-200 bg-white p-5"
            >
              <h4 className="font-bold text-gray-900">Tax Benefits</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-600 leading-relaxed">
                <li>• Premiums: Deductible under Section 80C (life) / 80D (health)</li>
                <li>• Maturity proceeds: Exempt under Section 10(10D) if premium &lt; 10% of SA</li>
                <li>• Annuity income: Taxable as per income slab</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
