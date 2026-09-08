import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import {
  fetchProfessionalRequestsJoined, fetchProjectMembersByUser, fetchMaterialOrders, fetchAppUsers,
} from '@/lib/data';
import type { AppUser } from '@/lib/types';
import { LoadingState, EmptyState, Badge, formatINR } from '@/components/ui';
import { Users, FolderKanban, Wallet } from 'lucide-react';
import { personPhoto, onPersonImgError } from '@/lib/people';

interface ClientSummary {
  user: AppUser;
  projects: number;
  requests: number;
  orders: number;
  revenue: number;
}

export default function PortalClientsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientSummary[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [reqs, mems, users] = await Promise.all([
        fetchProfessionalRequestsJoined(user.id).catch(() => []),
        fetchProjectMembersByUser(user.id).catch(() => []),
        fetchAppUsers().catch(() => []),
      ]);
      const orders = user.role === 'material_shop' ? await fetchMaterialOrders(undefined, user.id).catch(() => []) : [];
      const userMap = new Map(users.map((u) => [u.id, u]));
      const summary = new Map<string, ClientSummary>();

      const bump = (id: string, key: 'projects' | 'requests' | 'orders', revenue = 0) => {
        const u = userMap.get(id);
        if (!u) return;
        const cur = summary.get(id) ?? { user: u, projects: 0, requests: 0, orders: 0, revenue: 0 };
        cur[key] += 1;
        cur.revenue += revenue;
        summary.set(id, cur);
      };

      // Requests: homeowner is the client.
      for (const r of reqs) {
        if (r.status === 'declined' || r.status === 'cancelled') continue;
        bump(r.homeowner_id, 'requests', r.status === 'completed' ? (r.budget ?? 0) : 0);
      }
      // Memberships: project owner is the client.
      for (const m of mems) {
        if (m.status === 'declined') continue;
        if (m.project) bump(m.project.homeowner_id, 'projects');
      }
      // Orders: buyer is the customer.
      for (const o of orders) {
        if (o.status === 'cancelled') continue;
        bump(o.buyer_id, 'orders', o.status === 'delivered' ? o.total_price : 0);
      }

      setClients([...summary.values()].sort((a, b) => b.revenue - a.revenue || b.projects - a.projects));
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  if (!user) return <LoadingState text="Loading..." />;
  if (loading) return <LoadingState text="Loading your clients..." />;

  const isShop = user.role === 'material_shop';

  return (
    <div className="min-h-screen bg-[#F6F8FC] p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">{isShop ? 'Customers' : 'Clients'}</h1>
        <p className="muted mt-1">Homeowners and buyers you work with — built from real requests, projects and orders</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5 text-center"><p className="text-3xl font-bold text-navy-900">{clients.length}</p><p className="text-xs muted mt-1">{isShop ? 'Customers' : 'Clients'}</p></div>
        <div className="card p-5 text-center"><p className="text-3xl font-bold text-navy-900">{clients.reduce((s, c) => s + c.projects, 0)}</p><p className="text-xs muted mt-1">Projects</p></div>
        <div className="card p-5 text-center"><p className="text-3xl font-bold text-emerald-600">{formatINR(clients.reduce((s, c) => s + c.revenue, 0))}</p><p className="text-xs muted mt-1">Total Earned</p></div>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={<Users className="w-7 h-7" />}
          title="No clients yet"
          description="When homeowners request your services, accept projects or place orders, your clients will appear here."
        />
      ) : (
        <div className="space-y-4">
          {clients.map((c) => (
            <div key={c.user.id} className="card p-5 flex items-start gap-4 flex-wrap">
              <img src={personPhoto(c.user.avatar_url, c.user.role)} alt="" onError={(e) => onPersonImgError(e, c.user.role)} className="w-12 h-12 rounded-xl object-cover" />
              <div className="flex-1 min-w-[180px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-navy-900">{c.user.name}</p>
                  <Badge variant="navy" >{c.user.role}</Badge>
                </div>
                <p className="text-xs muted">{c.user.location ?? '—'}</p>
              </div>
              <div className="flex gap-6 text-center">
                <div><p className="text-lg font-bold text-navy-900 flex items-center gap-1"><FolderKanban className="w-4 h-4 text-royal-500" />{c.projects}</p><p className="text-xs muted">Projects</p></div>
                {!isShop && <div><p className="text-lg font-bold text-navy-900">{c.requests}</p><p className="text-xs muted">Requests</p></div>}
                {isShop && <div><p className="text-lg font-bold text-navy-900">{c.orders}</p><p className="text-xs muted">Orders</p></div>}
                <div><p className="text-lg font-bold text-emerald-600 flex items-center gap-1"><Wallet className="w-4 h-4" />{formatINR(c.revenue)}</p><p className="text-xs muted">Earned</p></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
