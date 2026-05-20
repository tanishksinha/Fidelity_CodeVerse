'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Menu, X, LogIn, User } from "lucide-react";
import { cn } from "../lib/cn";
import { motion, AnimatePresence } from "framer-motion";

export default function ConsumerHeader({ active }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState(null);

  useEffect(() => {
    const name = localStorage.getItem('fidelity_user_name');
    if (name) setUserName(name);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('fidelity_consumer_token');
    localStorage.removeItem('fidelity_user_email');
    localStorage.removeItem('fidelity_user_name');
    setUserName(null);
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2 text-xs font-semibold text-gray-600 lg:px-8">
          <span data-track="global_trust_strip">SYNAPTIC SIMULATION: Secure planning portal</span>
          <span className="hidden font-mono text-fidelity-green sm:inline">MARKET_STATUS: OPEN</span>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3" data-track="nav_brand_home">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-fidelity-green text-white">
            <ShieldCheck size={18} />
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight text-fidelity-dark">SYNAPTIC</span>
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
          <Link
            href="/insurance"
            data-track="nav_insurance"
            className={cn(
              "transition-colors hover:text-fidelity-green",
              active === "insurance" && "text-fidelity-green"
            )}
          >
            Insurance
          </Link>
          <Link
            href="/retirement"
            data-track="nav_retirement"
            className={cn(
              "transition-colors hover:text-fidelity-green",
              active === "retirement" && "text-fidelity-green"
            )}
          >
            Retirement
          </Link>
          <Link
            href="/planning"
            data-track="nav_planning"
            className={cn(
              "transition-colors hover:text-fidelity-green",
              active === "planning" && "text-fidelity-green"
            )}
          >
            Planning
          </Link>

          {/* Auth / User */}
          {userName ? (
            <div className="flex items-center gap-3 border-l border-gray-200 pl-5">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <User size={14} />
                <span className="font-semibold text-gray-800">{userName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="rounded border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-50"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              data-track="nav_login"
              className="flex items-center gap-1.5 rounded border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-fidelity-green hover:text-fidelity-green"
            >
              <LogIn size={14} /> Login
            </Link>
          )}

          <Link
            href="/checkout"
            data-track="nav_open_account"
            className="rounded-md bg-fidelity-green px-4 py-2 text-white transition-colors hover:bg-fidelity-dark"
          >
            Open Account
          </Link>
        </nav>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2 text-gray-600 hover:text-gray-900"
          onClick={() => setMobileMenuOpen(true)}
          data-track="nav_mobile_toggle"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-0 left-0 w-full h-screen bg-white z-50 flex flex-col pt-20 px-6"
          >
            <button 
              className="absolute top-6 right-6 p-2 text-gray-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X size={28} />
            </button>
            <nav className="flex flex-col gap-6 text-xl font-bold text-gray-900 mt-10">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className={cn(active === "home" && "text-fidelity-green")}>Home</Link>
              <Link href="/investments" onClick={() => setMobileMenuOpen(false)} className={cn(active === "investments" && "text-fidelity-green")}>Investments</Link>
              <Link href="/insurance" onClick={() => setMobileMenuOpen(false)} className={cn(active === "insurance" && "text-fidelity-green")}>Insurance</Link>
              <Link href="/retirement" onClick={() => setMobileMenuOpen(false)} className={cn(active === "retirement" && "text-fidelity-green")}>Retirement</Link>
              <Link href="/planning" onClick={() => setMobileMenuOpen(false)} className={cn(active === "planning" && "text-fidelity-green")}>Planning</Link>

              {/* Auth */}
              {userName ? (
                <div className="pt-4 border-t border-gray-100 space-y-4">
                  <p className="text-sm text-gray-500 font-normal">Signed in as <span className="font-bold text-gray-800">{userName}</span></p>
                  <button onClick={handleLogout} className="w-full rounded-md border border-gray-200 py-3 text-base font-medium text-gray-600">Logout</button>
                </div>
              ) : (
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-fidelity-green">Login</Link>
              )}

              <div className="pt-6 border-t border-gray-100">
                <Link href="/checkout" onClick={() => setMobileMenuOpen(false)} className="flex w-full justify-center rounded-md bg-fidelity-green py-4 text-white text-lg">
                  Open Account
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
