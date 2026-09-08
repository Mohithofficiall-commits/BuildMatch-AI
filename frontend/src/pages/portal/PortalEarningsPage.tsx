import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import {
  fetchProfessionalRequestsJoined, fetchMaterialOrders, fetchEngineerByUserId,
  fetchProjects, fetchPayments,
} from '@/lib/data';
import type { ProfessionalRequestJoined, MaterialOrder } from '@/lib/types';
import { LoadingState, EmptyState, Badge, formatINR, formatDate } from '@/components/ui';
import { requestStatus, orderStatus } from '@/components/professional/statuses';
import { Wallet, TrendingUp, ShieldCheck, Info } from 'lucide-react';

interface PaymentLine { id: string; title: string; amount: number; date: string; status: string; }

export default function PortalEarningsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reqLines, setReqLines] = useState<PaymentLine[]>([]);
  const [orderLines, setOrderLines] = useState<PaymentLine[]>([]);
  const [milestoneLines, setMilestoneLines] = useState<PaymentLine[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      if (user.role === 'material_shop') {
        const orders = await fetchMaterialOrders(undefined, user.id).catch(() => []) as MaterialOrder[];
        setOrderLines(orders.map((o) => ({
          id: o.id,
          title: `Order · ${o.quantity} × ${(o as MaterialOrder & { materials?: { name?: string } }).materials?.name ?? 'Material'}`,
          amount: o.total_price,
          date: o.created_at,
          status: o.status,
        })));
      } else {
        const reqs = await fetchProfessionalRequestsJoined(user.id).catch(() => []) as ProfessionalRequestJoined[];
        setReqLines(reqs.map((r) => ({
          id: r.id,
          title: r.project?.title ? `Work · ${r.title} (${r.project.title})` : `Work · ${r.title}`,
          amount: r.budget ?? 0,
          date: r.responded_at ?? r.created_at,
          status: r.status,
        })));
        // Engineers also earn through milestone payments on assigned projects.
        if (user.role === 'engineer') {
          const eng = await fetchEngineerByUserId(user.id).catch(() => null);
          if (eng) {
            const projs = await fetchProjects().catch(() => []);
            const mine = projs.filter((p) => p.engineer_id === eng.id);
            const lines: PaymentLine[] = [];
            for (const p of mine) {
              const pays = await fetchPayments(p.id).catch(() => []);
              for (const pay of pays) {
                lines.push({
                  id: pay.id,
                  title: `${p.title} · ${pay.milestone_name}`,
                  amount: pay.amount,
                  date: pay.paid_date ?? pay.due_date ?? p.start_date,
                  status: pay.status,
                });
              }
            }
            setMilestoneLines(lines);
          }
        }
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  if (!user) return <LoadingState text="Loading..." />;
  if (loading) return <LoadingState text="Calculating your earnings..." />;

  const isShop = user.role === 'material_shop';
  const isEngineer = user.role === 'engineer';

  const completedReqs = reqLines.filter((l) => l.status === 'completed');
  const acceptedReqs = reqLines.filter((l) => l.status === 'accepted');
  const deliveredOrders = orderLines.filter((l) => l.status === 'delivered');
  const pipelineOrders = orderLines.filter((l) => l.status !== 'delivered' && l.status !== 'cancelled' && l.status !== 'pending');
  const pendingOrders = orderLines.filter((l) => l.status === 'pending');
  const paidMilestones = milestoneLines.filter((l) => l.status === 'paid');

  const totalEarned = isShop
    ? deliveredOrders.reduce((s, l) => s + l.amount, 0)
    : completedReqs.reduce((s, l) => s + l.amount, 0) + paidMilestones.reduce((s, l) => s + l.amount, 0);
  const pipeline = isShop
    ? pipelineOrders.reduce((s, l) => s + l.amount, 0)
    : acceptedReqs.reduce((s, l) => s + l.amount, 0);
  const expected = isShop ? pendingOrders.reduce((s, l) => s + l.amount, 0) : 0;

  return (
    <div className="min-h-screen bg-[#F6F8FC] p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Earnings</h1>
        <p className="muted mt-1">Real revenue records only — never simulated payments or income</p>
      </div>

      <div className="card p-4 bg-emerald-50 border-emerald-100">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-800">
            <strong>Revenue integrity:</strong> {isShop ? 'Earnings count only orders marked as delivered.' : isEngineer ? 'Earnings count completed work requests plus milestone payments recorded as paid on your projects.' : 'Earnings count only work requests marked completed by you and your client.'} Nothing is estimated or faked.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm muted">Total Earned</p><p className="text-2xl font-bold text-emerald-600 mt-1">{formatINR(totalEarned)}</p></div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Wallet className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm muted">{isShop ? 'In Delivery' : 'In Progress'}</p><p className="text-2xl font-bold text-navy-900 mt-1">{formatINR(pipeline)}</p></div>
            <div className="w-10 h-10 rounded-xl bg-royal-50 text-royal-600 flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm muted">{isShop ? 'Pending Orders' : 'Completed Jobs'}</p><p className="text-2xl font-bold text-navy-900 mt-1">{isShop ? formatINR(expected) : completedReqs.length + paidMilestones.length}</p></div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Info className="w-5 h-5" /></div>
          </div>
        </div>
      </div>

      {isEngineer && milestoneLines.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-navy-900 mb-4">Milestone Payments (Paid)</h2>
          <div className="space-y-2">
            {milestoneLines.map((l) => {
              const st = l.status;
              return (
                <div key={l.id} className="flex items-center justify-between border border-navy-100 rounded-xl p-3 text-sm">
                  <div>
                    <p className="font-semibold text-navy-900">{l.title}</p>
                    <p className="text-xs muted">{formatDate(l.date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-navy-900">{formatINR(l.amount)}</span>
                    <Badge variant={st === 'paid' ? 'success' : st === 'pending' ? 'warning' : 'danger'}>{st.toUpperCase()}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isShop && reqLines.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-navy-900 mb-4">Service Revenue by Project Request</h2>
          <div className="space-y-2">
            {reqLines.map((l) => {
              const st = requestStatus(l.status);
              return (
                <div key={l.id} className="flex items-center justify-between border border-navy-100 rounded-xl p-3 text-sm">
                  <div>
                    <p className="font-semibold text-navy-900">{l.title}</p>
                    <p className="text-xs muted">{formatDate(l.date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-navy-900">{formatINR(l.amount)}</span>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isShop && orderLines.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-navy-900 mb-4">Order Revenue</h2>
          <div className="space-y-2">
            {orderLines.map((l) => {
              const st = orderStatus(l.status);
              return (
                <div key={l.id} className="flex items-center justify-between border border-navy-100 rounded-xl p-3 text-sm">
                  <div>
                    <p className="font-semibold text-navy-900">{l.title}</p>
                    <p className="text-xs muted">{formatDate(l.date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-navy-900">{formatINR(l.amount)}</span>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(reqLines.length === 0 && orderLines.length === 0 && milestoneLines.length === 0) && (
        <EmptyState
          icon={<Wallet className="w-7 h-7" />}
          title="No earnings recorded yet"
          description="Earnings appear automatically when delivered orders or completed work requests are recorded."
        />
      )}
    </div>
  );
}
