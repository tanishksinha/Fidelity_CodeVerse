"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, Mail, Lock, AlertCircle } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/consumer-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Login failed");
      }

      const data = await res.json();
      localStorage.setItem("fidelity_consumer_token", data.access_token);
      localStorage.setItem("fidelity_user_email", data.email);
      localStorage.setItem("fidelity_user_name", data.name);
      localStorage.setItem("fidelity_user_phone", data.phone || "");  // For WhatsApp cascade
      localStorage.setItem("fidelity_ghost_id", `USR_${data.email.split("@")[0].toUpperCase()}`);

      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-fidelity-green text-white shadow-glow-green">
              <ShieldCheck size={22} />
            </span>
            <span>
              <span className="block text-xl font-bold tracking-tight text-fidelity-dark">FIDELITY</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                Wealth Services
              </span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">Welcome back</h1>
          <p className="mt-2 text-sm text-gray-500">
            Sign in to access your investment dashboard.
          </p>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700">Email</label>
              <div className="relative mt-2">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-fidelity-green focus:ring-2 focus:ring-fidelity-green/15"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">Password</label>
              <div className="relative mt-2">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-fidelity-green focus:ring-2 focus:ring-fidelity-green/15"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-fidelity-green py-3.5 text-sm font-bold text-white transition hover:bg-[#009940] disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-fidelity-green hover:underline">
              Register
            </Link>
          </div>

          {/* Demo hint */}
          <div className="mt-6 rounded-lg bg-gray-50 border border-gray-100 p-4 text-xs text-gray-500">
            <p className="font-semibold text-gray-600 mb-1">Demo Accounts:</p>
            <p className="font-mono">arjun.mehta@demo.com / demo123</p>
            <p className="font-mono">priya.sharma@demo.com / demo123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
