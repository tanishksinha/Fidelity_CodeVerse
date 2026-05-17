'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, User, Loader2 } from 'lucide-react';
import { loginAdmin } from '@/services/api';
import { cn } from '@/lib/cn';

export default function AdminLogin() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('synaptic2024');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await loginAdmin(username, password);
      router.push('/admin');
    } catch (err) {
      setError('Invalid tactical credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-warroom-bg p-5 font-mono">
      <div className="w-full max-w-md">
        <div className="warroom-panel border-synaptic-green/30 p-8 shadow-glow-green/10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-synaptic-green/10 text-synaptic-green">
              <Shield size={32} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white uppercase italic">War Room Access</h1>
            <p className="mt-2 text-xs text-warroom-text-secondary uppercase tracking-widest">
              Behavioral Command Authorization Required
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-warroom-text-secondary">
                Operator ID
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-warroom-text-secondary" size={18} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded border border-warroom-border bg-warroom-bg py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-synaptic-green"
                  placeholder="USERNAME"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-warroom-text-secondary">
                Tac-Key
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-warroom-text-secondary" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded border border-warroom-border bg-warroom-bg py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-synaptic-green"
                  placeholder="PASSWORD"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-center text-xs font-bold text-intent-bounce uppercase tracking-tighter">
                [ERROR] {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded bg-synaptic-green py-4 text-xs font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-[#009940] hover:shadow-glow-green",
                loading && "opacity-70"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Authorizing...
                </>
              ) : (
                "Initiate Command"
              )}
            </button>
          </form>

          <div className="mt-8 border-t border-warroom-border pt-6 text-[10px] text-warroom-text-secondary uppercase">
            <div className="flex justify-between">
              <span>System: Synaptic-v3.4</span>
              <span>Enc: AES-256</span>
            </div>
            <p className="mt-2 text-center text-sublabel">Unauthorized access is logged and prosecuted.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
