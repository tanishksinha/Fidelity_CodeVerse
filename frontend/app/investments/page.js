"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ChevronDown,
  Info,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ConsumerHeader from "../../components/ConsumerHeader";
import { cn } from "../../lib/cn";
import { useTracker } from "../../hooks/tracker";

const sipPerformance = [
  { month: "Jan 2021", sip: 1000000, index: 1000000 },
  { month: "Jul 2021", sip: 1164000, index: 1108000 },
  { month: "Jan 2022", sip: 1292000, index: 1199000 },
  { month: "Jul 2022", sip: 1218000, index: 1123000 },
  { month: "Jan 2023", sip: 1467000, index: 1316000 },
  { month: "Jul 2023", sip: 1694000, index: 1482000 },
  { month: "Jan 2024", sip: 1889000, index: 1621000 },
  { month: "Jul 2024", sip: 2146000, index: 1813000 },
  { month: "Jan 2025", sip: 2368000, index: 1975000 },
  { month: "Jul 2025", sip: 2683000, index: 2179000 },
  { month: "Jan 2026", sip: 3046000, index: 2412000 },
];

const funds = [
  {
    name: "Parag Parikh Flexi Cap Fund",
    category: "Flexi Cap",
    cagr: "23.4%",
    risk: "Very High",
    minSip: "₹1,000",
    track: "know_more_parag_parikh_flexi",
    exitLoadTrack: "exit_load_parag_parikh",
    expenseTrack: "expense_ratio_parag_parikh",
    detail: "Invests in domestic and international equities with a value-oriented bottom-up approach.",
  },
  {
    name: "SBI Small Cap Fund",
    category: "Small Cap",
    cagr: "26.1%",
    risk: "Very High",
    minSip: "₹500",
    track: "know_more_sbi_small_cap",
    exitLoadTrack: "exit_load_sbi_small_cap",
    expenseTrack: "expense_ratio_sbi_small_cap",
    detail: "High growth potential by identifying undiscovered or under-researched small-cap businesses.",
  },
  {
    name: "HDFC Index Fund Nifty 50 Plan",
    category: "Index Fund",
    cagr: "15.2%",
    risk: "High",
    minSip: "₹500",
    track: "know_more_hdfc_index",
    exitLoadTrack: "exit_load_hdfc_index",
    expenseTrack: "expense_ratio_hdfc_index",
    detail: "Low-cost passive exposure strictly replicating the NIFTY 50 index with minimal tracking error.",
  },
  {
    name: "ICICI Prudential Balanced Advantage Fund",
    category: "Hybrid / Dynamic Asset Allocation",
    cagr: "13.8%",
    risk: "Moderate",
    minSip: "₹100",
    track: "know_more_icici_balanced",
    exitLoadTrack: "exit_load_icici_balanced",
    expenseTrack: "expense_ratio_icici_balanced",
    detail: "Dynamically shifts between equity and debt based on in-house valuation models to cushion downside risk.",
  },
  {
    name: "Nippon India Liquid Fund",
    category: "Debt / Liquid",
    cagr: "6.9%",
    risk: "Low",
    minSip: "₹1,000",
    track: "know_more_nippon_liquid",
    exitLoadTrack: "exit_load_nippon_liquid",
    expenseTrack: "expense_ratio_nippon_liquid",
    detail: "Highly liquid parking fund investing in short-term money market instruments with maturity up to 91 days.",
  },
];

export default function InvestmentsPage() {
  const router = useRouter();
  const { pushIntentEvent } = useTracker();
  const [expandedFund, setExpandedFund] = useState(null);
  const [marketData, setMarketData] = useState([
    ["NIFTY 50", "Loading..."],
    ["S&P 500", "Loading..."],
    ["USD/INR", "Loading..."]
  ]);

  useEffect(() => {
    fetch("http://localhost:8080/api/market-data")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          setMarketData(data.data);
        }
      })
      .catch((err) => console.error("Failed to fetch market data:", err));
  }, []);

  const handleKnowMore = (fund) => {
    // Track the telemetry first
    pushIntentEvent("fund_know_more_clicked", {
      fund: fund.name,
      track: fund.track,
      inferred_stage: "pre_checkout_hesitation",
    });
    
    // Toggle the UI state
    setExpandedFund(expandedFund === fund.name ? null : fund.name);
  };

  const handleInvestNow = (fund) => {
    pushIntentEvent(`btn_invest_now_clicked`, { fund: fund.name });
    router.push("/checkout");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950">
      <ConsumerHeader active="investments" />
      <div className="border-b border-gray-200 bg-gray-950 text-white" data-track="investments_market_ticker">
        <div className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-6 py-3 font-mono text-xs lg:px-8">
          <div className="flex items-center gap-2 pr-4 border-r border-gray-800 text-fidelity-green">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fidelity-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-fidelity-green"></span>
            </span>
            LIVE MARKETS
          </div>
          {marketData.map(([label, value, change]) => (
            <span key={label} className="flex min-w-fit items-center gap-2">
              <span className="text-white/55">{label}</span>
              <span className="text-white font-bold">{value}</span>
              {change && (
                <span className={change.startsWith("-") ? "text-red-400" : "text-fidelity-green"}>
                  {change}
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      <main>
        <section className="border-b border-gray-200 bg-white bg-[radial-gradient(circle_at_top_right,rgba(0,122,51,0.12),transparent_34%)]">
          <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-fidelity-green">
                  Systematic Investment Plans
                </p>
                <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight text-gray-950 md:text-5xl">
                  Compare long-term SIP performance before opening your account.
                </h1>
                <p data-track="sip_page_intro_copy" className="mt-5 max-w-3xl text-base leading-7 text-gray-600">
                  Review benchmark-relative performance, liquidity terms, expense ratios, and lock-in clauses before
                  committing to a recurring contribution.
                </p>
              </div>
              <div className="rounded-lg border border-fidelity-green/20 bg-fidelity-light p-5 shadow-sm" data-track="sip_suitability_panel">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-fidelity-green" size={24} />
                  <h2 className="text-base font-bold text-fidelity-dark">Suitability checkpoint</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-700">
                  SIPs are best evaluated over full market cycles. Short exits may trigger tax events, fees, or lower
                  realized returns.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-md bg-white/80 p-3">
                    <p className="text-xs font-semibold text-gray-500">Risk profile</p>
                    <p className="mt-1 font-mono text-lg font-bold text-fidelity-dark">Balanced</p>
                  </div>
                  <div className="rounded-md bg-white/80 p-3">
                    <p className="text-xs font-semibold text-gray-500">Horizon</p>
                    <p className="mt-1 font-mono text-lg font-bold text-fidelity-dark">5Y+</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
          <div
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
            data-track="sip_performance_vs_index_chart"
          >
            <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <div className="flex items-center gap-2 text-fidelity-green">
                  <BarChart3 size={20} />
                  <h2 className="text-lg font-bold text-gray-950">SIP performance vs. broad market index</h2>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Simulated ₹10,00,000 indexed starting value with monthly contribution compounding.
                </p>
              </div>
              <div data-track="chart_disclaimer_historical_returns" className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">
                Past performance is not a guarantee of future results.
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
              <div className="min-h-[300px] h-[390px] rounded-md border border-gray-100 bg-gray-50/60 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sipPerformance} margin={{ top: 12, right: 24, left: 0, bottom: 8 }}>
                    <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `₹${Math.round(value / 100000)}L`}
                    />
                    <Tooltip
                      formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, ""]}
                      labelClassName="font-bold"
                      contentStyle={{ borderRadius: 8, borderColor: "#E5E7EB" }}
                    />
                    <Legend />
                    <Line
                      name="Fidelity model SIP"
                      type="monotone"
                      dataKey="sip"
                      stroke="#007A33"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      name="Market index"
                      type="monotone"
                      dataKey="index"
                      stroke="#6B7280"
                      strokeWidth={2}
                      strokeDasharray="6 6"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                <ChartBrief label="Model terminal value" value="₹30.46 L" tone="green" track="chart_terminal_value" />
                <ChartBrief label="Index terminal value" value="₹24.12 L" tone="gray" track="chart_index_value" />
                <ChartBrief label="Outperformance" value="+26.3%" tone="blue" track="chart_outperformance_value" />
                <div data-track="chart_risk_note" className="rounded-md border border-intent-hesitate/30 bg-intent-hesitate/10 p-4 text-sm leading-6 text-gray-700">
                  Volatility, exit loads, taxation, and NAV timing can change actual realized outcomes.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col md:grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {funds.map((fund) => (
              <article key={fund.name} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">{fund.category}</p>
                    <h3 className="mt-2 text-xl font-bold text-gray-950">{fund.name}</h3>
                  </div>
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-bold",
                      fund.risk === "High"
                        ? "bg-intent-bounce/10 text-intent-bounce"
                        : "bg-intent-hesitate/15 text-amber-700"
                    )}
                    data-track={`risk_badge_${fund.track}`}
                  >
                    {fund.risk}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <Metric label="5Y CAGR" value={fund.cagr} track={`cagr_${fund.track}`} />
                  <Metric label="Min SIP" value={fund.minSip} track={`min_sip_${fund.track}`} />
                </div>

                <div className="mt-5 space-y-3 border-t border-gray-100 pt-5 text-sm text-gray-600">
                  <p data-track={fund.expenseTrack}>
                    Expense ratio: <span className="font-semibold text-gray-950">0.72%</span>
                  </p>
                  <p data-track={fund.exitLoadTrack}>
                    <span className="inline-flex items-center gap-1 font-semibold text-intent-bounce">
                      <AlertTriangle size={14} />
                      Exit Load: 1% before 12 months
                    </span>
                  </p>
                  <p data-track={`fund_strategy_copy_${fund.track}`} className="leading-6">
                    {fund.detail}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    data-track={fund.track}
                    onClick={() => handleKnowMore(fund)}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-fidelity-green px-4 py-3 text-sm font-bold text-fidelity-green transition-colors hover:bg-fidelity-light"
                  >
                    {expandedFund === fund.name ? "Close" : "Know More"}
                    <ChevronDown size={16} className={cn("transition-transform", expandedFund === fund.name ? "rotate-180" : "")} />
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleInvestNow(fund)}
                    data-track={`btn_invest_now_${fund.track}`}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-gray-950 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-fidelity-green"
                  >
                    Invest Now <ArrowRight size={14} />
                  </button>
                </div>

                {/* Expanded Details Section */}
                {expandedFund === fund.name && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2 rounded-md bg-gray-50 p-4 text-sm text-gray-700">
                    <p className="font-semibold text-gray-900 mb-2">Asset Allocation Strategy</p>
                    <p className="mb-4 text-gray-600">
                      The fund manager maintains a dynamic approach, identifying deep-value 
                      opportunities while keeping a tight leash on downside volatility. 
                      Top holdings include financials, IT, and cyclical consumables.
                    </p>
                    <div className="grid grid-cols-2 gap-y-2 border-t border-gray-200 pt-3 text-xs">
                      <div><span className="font-semibold">Fund Manager:</span> S. Mehta</div>
                      <div><span className="font-semibold">AUM:</span> ₹12,450 Cr</div>
                      <div><span className="font-semibold">Benchmark:</span> NIFTY 500</div>
                      <div><span className="font-semibold">Inception:</span> Aug 2012</div>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="rounded-lg border border-gray-200 bg-white p-5" data-track="liquidity_terms_explainer">
              <div className="flex items-center gap-2">
                <Info className="text-intent-analyzing" size={20} />
                <h2 className="text-lg font-bold">Important liquidity terms</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Redemption cut-off times, exit loads, NAV applicability, and tax treatment vary by fund structure.
                Investors who need near-term cash access should review these terms carefully before proceeding.
              </p>
            </div>
            <Link
              href="/checkout"
              data-track="sip_continue_to_checkout_cta"
              className="flex items-center justify-between rounded-lg bg-fidelity-green p-5 text-white transition-colors hover:bg-fidelity-dark"
            >
              <span>
                <span className="block text-xs font-bold uppercase tracking-[0.16em] text-white/80">
                  Ready to proceed
                </span>
                <span className="mt-2 block text-xl font-bold">Start account setup</span>
              </span>
              <ArrowRight size={24} />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value, track }) {
  return (
    <div data-track={track} className="rounded-md bg-gray-50 p-3">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-gray-950">{value}</p>
    </div>
  );
}

function ChartBrief({ label, value, tone, track }) {
  const tones = {
    green: "text-fidelity-green",
    gray: "text-gray-950",
    blue: "text-intent-analyzing",
  };

  return (
    <div data-track={track} className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-bold ${tones[tone]}`}>{value}</p>
    </div>
  );
}
