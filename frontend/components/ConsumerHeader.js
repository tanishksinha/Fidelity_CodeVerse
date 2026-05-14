import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { cn } from "../lib/cn";

export default function ConsumerHeader({ active }) {
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2 text-xs font-semibold text-gray-600 lg:px-8">
          <span data-track="global_trust_strip">FIDELITY SIMULATION: Secure planning portal</span>
          <span className="hidden font-mono text-fidelity-green sm:inline">MARKET_STATUS: OPEN</span>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3" data-track="nav_brand_home">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-fidelity-green text-white">
            <ShieldCheck size={18} />
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight text-fidelity-dark">FIDELITY</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Wealth Services
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-gray-700 md:flex">
          <Link
            href="/investments"
            data-track="nav_investments"
            className={cn(
              "transition-colors hover:text-fidelity-green",
              active === "investments" && "text-fidelity-green"
            )}
          >
            Investments
          </Link>
          <span data-track="nav_retirement_placeholder" className="transition-colors hover:text-fidelity-green">
            Retirement
          </span>
          <span data-track="nav_planning_placeholder" className="transition-colors hover:text-fidelity-green">
            Planning
          </span>
          <Link
            href="/checkout"
            data-track="nav_open_account"
            className="rounded-md bg-fidelity-green px-4 py-2 text-white transition-colors hover:bg-fidelity-dark"
          >
            Open Account
          </Link>
        </nav>
      </div>
    </header>
  );
}
