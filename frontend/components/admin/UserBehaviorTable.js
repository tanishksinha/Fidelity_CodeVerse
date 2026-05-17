'use client';

import { useEffect, useState } from 'react';
import { Users, Clock, MousePointer, Mail, Zap } from 'lucide-react';
import { AuthService } from '@/services/auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export default function UserBehaviorTable() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = AuthService.getAccessToken();
        const res = await fetch(`${BACKEND_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
    const interval = setInterval(fetchUsers, 8000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="warroom-panel xl:col-span-2">
        <div className="warroom-header">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-intent-analyzing" />
            <h2 className="font-bold">Registered Users</h2>
          </div>
        </div>
        <div className="flex items-center justify-center p-10 text-warroom-text-secondary text-sm font-mono">
          Loading user data...
        </div>
      </div>
    );
  }

  return (
    <div className="warroom-panel xl:col-span-2">
      <div className="warroom-header">
        <div>
          <div className="flex items-center gap-2">
            <Users size={18} className="text-intent-analyzing" />
            <h2 className="font-bold">Registered Users — Behavior Summary</h2>
          </div>
          <p className="mt-1 text-sublabel">
            All consumer accounts with aggregated behavioral event data.
          </p>
        </div>
        <span className="warroom-badge border-synaptic-green/30 bg-synaptic-green/10 text-synaptic-green">
          {users.length} users
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-warroom-border bg-warroom-bg text-xs uppercase tracking-[0.12em] text-warroom-text-secondary">
            <tr>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">
                <div className="flex items-center gap-1"><Clock size={11} /> Last Visit</div>
              </th>
              <th className="px-5 py-3">Pages</th>
              <th className="px-5 py-3">
                <div className="flex items-center gap-1"><MousePointer size={11} /> Events</div>
              </th>
              <th className="px-5 py-3">Clicks</th>
              <th className="px-5 py-3">
                <div className="flex items-center gap-1"><Zap size={11} /> Rules</div>
              </th>
              <th className="px-5 py-3">
                <div className="flex items-center gap-1"><Mail size={11} /> Emails</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warroom-border">
            {users.map((u) => (
              <tr key={u.id} className="transition-colors hover:bg-warroom-bg">
                <td className="px-5 py-4 font-semibold text-white">{u.name}</td>
                <td className="px-5 py-4 font-mono text-xs text-warroom-text-secondary">{u.email}</td>
                <td className="px-5 py-4 font-mono text-xs text-warroom-text-secondary">
                  {u.last_visit ? new Date(u.last_visit).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                </td>
                <td className="px-5 py-4">
                  <span className="warroom-badge border-intent-analyzing/30 bg-intent-analyzing/10 text-intent-analyzing">
                    {u.pages_visited}
                  </span>
                </td>
                <td className="px-5 py-4 font-mono text-xs text-white">{u.total_events}</td>
                <td className="px-5 py-4 font-mono text-xs text-white">{u.total_clicks}</td>
                <td className="px-5 py-4">
                  {u.rules_triggered > 0 ? (
                    <span className="warroom-badge border-intent-hesitate/30 bg-intent-hesitate/10 text-intent-hesitate">
                      {u.rules_triggered}
                    </span>
                  ) : (
                    <span className="text-warroom-text-secondary text-xs">0</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {u.emails_sent > 0 ? (
                    <span className="warroom-badge border-synaptic-green/30 bg-synaptic-green/10 text-synaptic-green">
                      {u.emails_sent}
                    </span>
                  ) : (
                    <span className="text-warroom-text-secondary text-xs">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
