"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Compass, FileCheck, GraduationCap, HeartHandshake } from "lucide-react";
import ConsumerHeader from "@/components/ConsumerHeader";
import { cn } from "@/lib/cn";

const planningModules = [
  {
    id: "education",
    title: "Education Funding",
    icon: GraduationCap,
    description: "Structured investment plans to counter education inflation, utilizing tax-advantaged accounts where applicable.",
  },
  {
    id: "estate",
    title: "Estate & Legacy",
    icon: FileCheck,
    description: "Multi-generational wealth transfer strategies, succession planning, and trust structuring.",
  },
  {
    id: "philanthropy",
    title: "Charitable Giving",
    icon: HeartHandshake,
    description: "Donor-advised funds and tax-efficient philanthropic structuring for maximum social and financial impact.",
  },
];

export default function PlanningPage() {
  const [activeModule, setActiveModule] = useState(null);

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <ConsumerHeader active="planning" />

      {/* Hero Section */}
      <section className="bg-gray-950 border-b border-gray-800 py-20 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/wealth-hero.png')] opacity-20 object-cover mix-blend-luminosity" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent" />
        
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <div data-track="planning_hero_badge" className="inline-flex items-center gap-2 rounded-full border border-fidelity-green/30 bg-fidelity-green/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-fidelity-green">
              <Compass size={14} /> Comprehensive Advisory
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
              Architecture for your wealth
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Go beyond simple portfolio management. We construct robust financial architectures designed for complex life transitions.
            </p>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-12">
          
          <div className="lg:col-span-5">
            <h2 className="text-3xl font-bold tracking-tight">Specialized Planning Modules</h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              Select an area of focus to understand how Fidelity’s fiduciary advisors structure solutions around your specific life goals.
            </p>
            
            <div className="mt-10 space-y-4">
              {planningModules.map((mod) => {
                const Icon = mod.icon;
                const isActive = activeModule === mod.id;
                
                return (
                  <button
                    key={mod.id}
                    onClick={() => setActiveModule(isActive ? null : mod.id)}
                    data-track={`module_click_${mod.id}`}
                    className={cn(
                      "w-full text-left rounded-xl border p-5 transition-all duration-200 shadow-sm",
                      isActive 
                        ? "border-fidelity-green bg-fidelity-green/5" 
                        : "border-gray-200 bg-white hover:border-gray-300"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn("p-2 rounded-lg", isActive ? "bg-fidelity-green text-white" : "bg-gray-100 text-gray-500")}>
                          <Icon size={20} />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">{mod.title}</h3>
                      </div>
                      <ChevronDown 
                        size={20} 
                        className={cn("text-gray-400 transition-transform", isActive && "rotate-180 text-fidelity-green")} 
                      />
                    </div>
                    {isActive && (
                      <div className="mt-4 pl-14 text-sm text-gray-600 leading-relaxed pr-4 animate-in fade-in slide-in-from-top-2">
                        {mod.description}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="lg:col-span-7">
            <div data-track="advisory_consult_card" className="rounded-2xl border border-gray-200 bg-gray-50 p-10 h-full flex flex-col justify-center">
              <p className="text-xs font-bold uppercase tracking-widest text-fidelity-green">Private Wealth Group</p>
              <h3 className="mt-3 text-2xl font-bold text-gray-900">Need a custom blueprint?</h3>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Connect with a Fidelity Wealth Advisor to discuss your unique financial situation. We provide objective, fee-transparent guidance structured around your best interests.
              </p>
              
              <ul className="mt-8 space-y-3">
                <li className="flex items-center gap-3 text-sm font-medium text-gray-700">
                  <div className="h-1.5 w-1.5 rounded-full bg-fidelity-green" /> Documented Fiduciary Standard
                </li>
                <li className="flex items-center gap-3 text-sm font-medium text-gray-700">
                  <div className="h-1.5 w-1.5 rounded-full bg-fidelity-green" /> Coordination with CPAs & Attorneys
                </li>
                <li className="flex items-center gap-3 text-sm font-medium text-gray-700">
                  <div className="h-1.5 w-1.5 rounded-full bg-fidelity-green" /> Dedicated Relationship Manager
                </li>
              </ul>

              <div className="mt-10">
                <Link
                  href="/checkout"
                  data-track="btn_schedule_consultation"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-gray-800"
                >
                  Schedule a Consultation <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
