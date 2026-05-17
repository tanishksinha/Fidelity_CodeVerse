"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  X,
} from "lucide-react";
import ConsumerHeader from "@/components/ConsumerHeader";
import { useTracker } from "@/hooks/tracker";

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
    tagColor: "bg-synaptic-green",
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
  const router = useRouter();
  const { pushIntentEvent } = useTracker();
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [calculatedPremium, setCalculatedPremium] = useState(null);

  const handleOpenQuote = (product) => {
    pushIntentEvent(`btn_get_quote_${product.id}_clicked`, { product: product.name });
    setSelectedProduct(product);
    setCalculatedPremium(null);
    setQuoteModalOpen(true);
  };

  const handleCalculate = (e) => {
    e.preventDefault();
    pushIntentEvent(`quote_calculated_${selectedProduct.id}`);
    setCalculating(true);
    setTimeout(() => {
      setCalculating(false);
      setCalculatedPremium(selectedProduct.premium);
    }, 1500);
  };

  const handleProceed = () => {
    pushIntentEvent(`quote_proceed_${selectedProduct.id}`);
    router.push("/checkout");
  };

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
              className="inline-flex items-center gap-2 rounded-full border border-synaptic-green/30 bg-synaptic-green/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-synaptic-green"
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
                className="group relative flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-synaptic-green/50 hover:shadow-lg"
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-synaptic-green/10 text-synaptic-green">
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
                    <p className="mt-1 text-sm font-semibold text-synaptic-green">
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
                        className="mt-0.5 shrink-0 text-synaptic-green"
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  type="button"
                  onClick={() => handleOpenQuote(product)}
                  data-track={`btn_get_quote_${product.id}`}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-gray-950 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-synaptic-green"
                >
                  Get Quote <ArrowRight size={14} />
                </button>
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

      {/* Quote Calculator Modal */}
      {quoteModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 px-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-xl font-bold text-gray-900">Get Quote: {selectedProduct.name}</h3>
              <button onClick={() => setQuoteModalOpen(false)} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900">
                <X size={20} />
              </button>
            </div>
            
            {!calculatedPremium ? (
              <form onSubmit={handleCalculate} className="mt-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Current Age</label>
                  <input required type="number" min="18" max="75" defaultValue="30" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-synaptic-green focus:outline-none focus:ring-1 focus:ring-synaptic-green" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">Gender</label>
                    <select className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-synaptic-green focus:outline-none focus:ring-1 focus:ring-synaptic-green">
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">Tobacco User</label>
                    <select className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-synaptic-green focus:outline-none focus:ring-1 focus:ring-synaptic-green">
                      <option>No</option>
                      <option>Yes</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Desired Coverage</label>
                  <select className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-synaptic-green focus:outline-none focus:ring-1 focus:ring-synaptic-green">
                    <option>{selectedProduct.coverage}</option>
                    <option>₹10 Lakh</option>
                    <option>₹50 Lakh</option>
                    <option>₹2 Crore</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={calculating}
                  className="mt-6 flex w-full items-center justify-center rounded-md bg-synaptic-green px-4 py-3 text-sm font-bold text-white transition hover:bg-[#009940] disabled:bg-gray-400"
                >
                  {calculating ? "Calculating..." : "Calculate Premium"}
                </button>
              </form>
            ) : (
              <div className="mt-6 text-center animate-in slide-in-from-bottom-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-synaptic-green/10 text-synaptic-green mb-4">
                  <ShieldCheck size={32} />
                </div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500">Estimated Premium</h4>
                <p className="mt-2 text-4xl font-bold text-gray-900">{calculatedPremium}</p>
                <p className="mt-2 text-sm text-gray-600">Based on standard health disclosures.</p>
                
                <div className="mt-8">
                  <button
                    onClick={handleProceed}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-gray-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
                  >
                    Proceed to Application <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
