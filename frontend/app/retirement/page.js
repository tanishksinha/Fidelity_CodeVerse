"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Calculator, PieChart, ShieldCheck, Target } from "lucide-react";
import ConsumerHeader from "@/components/ConsumerHeader";
import { cn } from "@/lib/cn";

export default function RetirementPage() {
  const [currentAge, setCurrentAge] = useState(30);
  const [retirementAge, setRetirementAge] = useState(65);
  const [monthlyContribution, setMonthlyContribution] = useState(25000);
  
  const yearsToInvest = Math.max(0, retirementAge - currentAge);
  const totalInvested = monthlyContribution * 12 * yearsToInvest;
  // Simple compound interest estimation: 10% annual return
  const estimatedCorpus = Math.round(monthlyContribution * 12 * (Math.pow(1.10, yearsToInvest) - 1) / 0.10);

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <ConsumerHeader active="retirement" />

      {/* Hero Section */}
      <section className="bg-gray-50 border-b border-gray-200 py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight text-gray-950 sm:text-6xl">
              Retire with certainty
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Build a resilient post-career portfolio designed to weather market volatility, inflation, and changing life circumstances.
            </p>
          </div>
        </div>
      </section>

      {/* Calculator Section */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          
          {/* Interactive Calculator */}
          <div 
            data-track="retirement_calculator_panel"
            className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm"
          >
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <Calculator className="text-fidelity-green" size={24} />
              <h2 className="text-xl font-bold">Corpus Estimator</h2>
            </div>

            <div className="mt-6 space-y-8">
              {/* Current Age Slider */}
              <div>
                <div className="flex justify-between text-sm font-semibold text-gray-900 mb-2">
                  <label htmlFor="currentAge">Current Age</label>
                  <span>{currentAge} years</span>
                </div>
                <input
                  type="range"
                  id="currentAge"
                  data-track="input_current_age"
                  min="20"
                  max="60"
                  value={currentAge}
                  onChange={(e) => setCurrentAge(Number(e.target.value))}
                  className="w-full accent-fidelity-green"
                />
              </div>

              {/* Retirement Age Slider */}
              <div>
                <div className="flex justify-between text-sm font-semibold text-gray-900 mb-2">
                  <label htmlFor="retirementAge">Target Retirement Age</label>
                  <span>{retirementAge} years</span>
                </div>
                <input
                  type="range"
                  id="retirementAge"
                  data-track="input_retirement_age"
                  min="40"
                  max="80"
                  value={retirementAge}
                  onChange={(e) => setRetirementAge(Number(e.target.value))}
                  className="w-full accent-fidelity-green"
                />
              </div>

              {/* Monthly Contribution */}
              <div>
                <div className="flex justify-between text-sm font-semibold text-gray-900 mb-2">
                  <label htmlFor="monthlyContribution">Monthly Investment (₹)</label>
                  <span>₹{monthlyContribution.toLocaleString('en-IN')}</span>
                </div>
                <input
                  type="range"
                  id="monthlyContribution"
                  data-track="input_monthly_contribution"
                  min="5000"
                  max="200000"
                  step="5000"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                  className="w-full accent-fidelity-green"
                />
              </div>
            </div>
          </div>

          {/* Results Display */}
          <div 
            data-secure="true"
            data-track="retirement_results_panel" 
            className="flex flex-col justify-center rounded-xl bg-gray-950 p-8 text-white relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-fidelity-dark/80 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-fidelity-green">Estimated Future Value</p>
              <h3 className="mt-4 text-5xl font-bold tracking-tight">
                ₹{(estimatedCorpus / 10000000).toFixed(2)} <span className="text-2xl text-gray-400">Crores</span>
              </h3>
              
              <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/10 pt-8">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Total Invested</p>
                  <p className="mt-1 text-lg font-mono font-semibold">₹{(totalInvested / 100000).toFixed(1)}L</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Assumed Return</p>
                  <p className="mt-1 text-lg font-mono font-semibold text-fidelity-green">10% p.a.</p>
                </div>
              </div>

              <div className="mt-10">
                <Link
                  href="/checkout"
                  data-track="btn_start_retirement_sip"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-fidelity-green px-5 py-3 text-sm font-bold text-white transition hover:bg-[#009940]"
                >
                  Start your Retirement SIP <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Strategy Highlights */}
      <section className="bg-gray-50 border-t border-gray-200 py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 grid gap-8 md:grid-cols-3">
          <div data-track="card_inflation_hedge" className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:border-fidelity-green/50 transition">
            <Target className="text-fidelity-green mb-4" size={28} />
            <h4 className="font-bold text-gray-900 text-lg">Inflation Hedging</h4>
            <p className="mt-2 text-sm text-gray-600">Equities and real assets structured to outpace long-term inflation, protecting purchasing power.</p>
          </div>
          <div data-track="card_tax_efficiency" className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:border-fidelity-green/50 transition">
            <PieChart className="text-fidelity-green mb-4" size={28} />
            <h4 className="font-bold text-gray-900 text-lg">Tax-Free Drawdowns</h4>
            <p className="mt-2 text-sm text-gray-600">Strategic allocation between EPF, PPF, and Equity Mutual Funds to minimize tax drag upon withdrawal.</p>
          </div>
          <div data-track="card_fiduciary" className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:border-fidelity-green/50 transition">
            <ShieldCheck className="text-fidelity-green mb-4" size={28} />
            <h4 className="font-bold text-gray-900 text-lg">Fiduciary Oversight</h4>
            <p className="mt-2 text-sm text-gray-600">Continuous monitoring of your risk capacity as you approach your target retirement date.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
