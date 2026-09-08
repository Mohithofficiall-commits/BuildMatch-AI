import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { fetchMaterialOrders, fetchMaterials, fetchAppUsers, fetchProjects, updateMaterialOrderStatus } from '@/lib/data';
import type { MaterialOrder, Material, AppUser, Project } from '@/lib/types';
import { LoadingState, EmptyState, Badge, Toast, formatINR, formatDate } from '@/components/ui';
import { orderStatus } from '@/components/professional/statuses';
import { ShoppingCart, CheckCircle2, Truck, PackageCheck, XCircle, MapPin } from 'lucide-react';
import { onMaterialImgError } from '@/lib/people';

const FILTERS = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;

export default function ShopOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<MaterialOrder[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [ord, mats, usrs, projs] = await Promise.all([
        fetchMaterialOrders(undefined, user.id).catch(() => []),
        fetchMaterials(user.id).catch(() => []),
        fetchAppUsers().catch(() => []),
        fetchProjects().catch(() => []),
      ]);
      setOrders(ord); setMaterials(mats); setUsers(usrs); setProjects(projs);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  if (!user) return <LoadingState text="Loading..." />;
  if (loading) return <LoadingState text="Loading orders..." />;

  const matMap = new Map(materials.map((m) => [m.id, m]));
  const userMap = new Map(users.map((u) => [u.id, u]));
  const projMap = new Map(projects.map((p) => [p.id, p]));

  const updateStatus = async (o: MaterialOrder, status: MaterialOrder['status']) => {
    setBusy(o.id);
    try {
      await updateMaterialOrderStatus(o.id, status);
      setToast({ msg: `Order marked as ${status}.`, type: 'success' });
      await load();
    } catch {
      setToast({ msg: 'Could not update the order.', type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);
  const counts: Record<string, number> = { all: orders.length };
  for (const f of FILTERS) if (f !== 'all') counts[f] = orders.filter((o) => o.status === f).length;

  const revenue = orders.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.total_price, 0);

  return (
    <div className="min-h-screen bg-[#F6F8FC] p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <h1 className="text-2xl font-bold text-navy-900">Orders</h1>
        <p className="muted mt-1">Manage incoming material orders — update statuses as orders progress</p>
      </div>

      <div className="card p-5 bg-gradient-to-br from-navy-900 to-navy-800 text-white flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-navy-200">Delivered revenue (real, recorded)</p>
          <p className="text-2xl font-bold text-emerald-400">{formatINR(revenue)}</p>
        </div>
        <div className="flex gap-6 text-center">
          <div><p className="text-xl font-bold">{counts.pending ?? 0}</p><p className="text-xs text-navy-200">Pending</p></div>
          <div><p className="text-xl font-bold">{(counts.confirmed ?? 0) + (counts.shipped ?? 0)}</p><p className="text-xs text-navy-200">In Progress</p></div>
          <div><p className="text-xl font-bold">{counts.delivered ?? 0}</p><p className="text-xs text-navy-200">Delivered</p></div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`btn text-sm capitalize ${filter === f ? 'bg-navy-900 text-white' : 'btn-secondary'}`}>
            {f} <span className="text-xs opacity-70">({counts[f] ?? 0})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<ShoppingCart className="w-7 h-7" />} title="No orders here" description="Orders placed on your materials will appear in this list." />
      ) : (
        <div className="space-y-4">
          {filtered.map((o) => {
            const st = orderStatus(o.status);
            const material = matMap.get(o.material_id);
            const buyer = userMap.get(o.buyer_id);
            const project = projMap.get(o.project_id ?? '');
            return (
              <div key={o.id} className="card p-5">
                <div className="flex items-start gap-4 flex-wrap">
                  {material?.image_url
                    ? <img src={material.image_url} alt="" onError={onMaterialImgError} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                    : <div className="w-14 h-14 rounded-xl bg-navy-50 flex items-center justify-center text-navy-300 shrink-0"><PackageCheck className="w-6 h-6" /></div>}
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-navy-900">{material?.name ?? 'Material'}</p>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </div>
                    <p className="text-xs muted mt-0.5">
                      Qty: {o.quantity} {material?.unit ?? ''} · {formatINR(o.total_price)} · Placed {formatDate(o.created_at)}
                    </p>
                    <p className="text-xs muted mt-1">Buyer: {buyer?.name ?? 'Unknown'} ({buyer?.role ?? '—'})</p>
                    {project && <p className="text-xs muted flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />For project: {project.title}</p>}
                    {o.notes && <p className="text-xs muted mt-1 italic">"{o.notes}"</p>}
                  </div>
                  <div className="shrink-0 space-y-2 text-right">
                    <p className="text-lg font-bold text-navy-900">{formatINR(o.total_price)}</p>
                    {(o.status === 'pending' || o.status === 'confirmed' || o.status === 'shipped') && (
                      <div className="flex flex-col gap-1.5 items-end">
                        {o.status === 'pending' && (
                          <button onClick={() => updateStatus(o, 'confirmed')} disabled={busy === o.id} className="btn-royal text-xs py-2"><CheckCircle2 className="w-3.5 h-3.5" /> Confirm Order</button>
                        )}
                        {o.status === 'confirmed' && (
                          <button onClick={() => updateStatus(o, 'shipped')} disabled={busy === o.id} className="btn-primary text-xs py-2"><Truck className="w-3.5 h-3.5" /> Mark Shipped</button>
                        )}
                        {o.status === 'shipped' && (
                          <button onClick={() => updateStatus(o, 'delivered')} disabled={busy === o.id} className="btn-success text-xs py-2"><PackageCheck className="w-3.5 h-3.5" /> Mark Delivered</button>
                        )}
                        {(o.status === 'pending' || o.status === 'confirmed') && (
                          <button onClick={() => updateStatus(o, 'cancelled')} disabled={busy === o.id} className="btn-secondary text-xs py-1.5 text-rose-600"><XCircle className="w-3.5 h-3.5" /> Cancel</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
