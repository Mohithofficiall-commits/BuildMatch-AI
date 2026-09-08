import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import {
  fetchSubscriptionPlans, fetchAllSubscriptions, createSubscription, updateSubscriptionStatus,
} from '@/lib/data';
import type { SubscriptionPlan, Subscription } from '@/lib/types';
import { LoadingState, Badge, Toast, formatINR, formatDate, Modal } from '@/components/ui';
import { subscriptionStatus } from '@/components/professional/statuses';
import { CreditCard, Check, Crown, Rocket, Info, XCircle } from 'lucide-react';

export default function PortalSubscriptionPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [current, setCurrent] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmPlan, setConfirmPlan] = useState<SubscriptionPlan | null>(null);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [ps, subs] = await Promise.all([fetchSubscriptionPlans().catch(() => []), fetchAllSubscriptions().catch(() => [])]);
      setPlans(ps);
      const mine = subs.find((s) => s.user_id === user.id);
      setCurrent(mine ?? null);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  if (!user) return <LoadingState text="Loading..." />;
  if (loading) return <LoadingState text="Loading subscription plans..." />;

  const handleChoose = async () => {
    if (!confirmPlan || !user) return;
    setBusy(true);
    try {
      const isFree = confirmPlan.tier === 'free';
      const starts = new Date();
      const expires = new Date(starts);
      if (cycle === 'monthly') expires.setMonth(expires.getMonth() + 1);
      else expires.setFullYear(expires.getFullYear() + 1);

      if (isFree) {
        // Free tier is genuinely free — activate immediately, no payment involved.
        await createSubscription({
          user_id: user.id,
          plan_id: confirmPlan.id,
          tier: confirmPlan.tier,
          status: 'active',
          billing_cycle: cycle,
          expires_at: expires.toISOString(),
        });
        setToast({ msg: 'You are now on the Free plan.', type: 'success' });
      } else {
        // Paid plans: record a PENDING subscription — no payment gateway exists in
        // this prototype, so we never claim a payment succeeded or charge revenue.
        await createSubscription({
          user_id: user.id,
          plan_id: confirmPlan.id,
          tier: confirmPlan.tier,
          status: 'pending',
          billing_cycle: cycle,
          expires_at: expires.toISOString(),
        });
        setToast({ msg: `${confirmPlan.name} plan requested — it stays PENDING until payment is confirmed. No payment was simulated.`, type: 'info' });
      }
      setConfirmPlan(null);
      await load();
    } catch {
      setToast({ msg: 'Could not update your subscription.', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!current || current.status !== 'active') return;
    setBusy(true);
    try {
      await updateSubscriptionStatus(current.id, 'cancelled');
      setToast({ msg: 'Your subscription has been cancelled. You can re-subscribe anytime.', type: 'info' });
      await load();
    } catch {
      setToast({ msg: 'Could not cancel the subscription.', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const tierIcons: Record<string, typeof Crown> = { free: Rocket, pro: Crown, business: Crown };
  const currentPlan = plans.find((p) => p.id === current?.plan_id) ?? null;
  const subBadge = current ? subscriptionStatus(current.status) : null;

  return (
    <div className="min-h-screen bg-[#F6F8FC] p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Subscription</h1>
          <p className="muted mt-1">Choose a plan to grow your business on BuildMatch</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCycle('monthly')} className={`btn text-sm ${cycle === 'monthly' ? 'bg-navy-900 text-white' : 'btn-secondary'}`}>Monthly</button>
          <button onClick={() => setCycle('yearly')} className={`btn text-sm ${cycle === 'yearly' ? 'bg-navy-900 text-white' : 'btn-secondary'}`}>Yearly</button>
        </div>
      </div>

      <div className="card p-4 bg-amber-50 border-amber-100">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <strong>No simulated payments:</strong> the Free plan activates instantly. Paid plans are recorded as <strong>Pending</strong> — this prototype has no payment gateway, so a plan only becomes active when real payment confirmation exists.
          </p>
        </div>
      </div>

      {/* Current plan */}
      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-navy-900 text-white flex items-center justify-center"><CreditCard className="w-6 h-6" /></div>
            <div>
              <p className="text-sm muted">Current Plan</p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-navy-900">{currentPlan?.name ?? 'No active plan'}</p>
                {subBadge && <Badge variant={subBadge.variant}>{subBadge.label}</Badge>}
              </div>
              {current && (
                <p className="text-xs muted mt-0.5">
                  {current.billing_cycle === 'yearly' ? 'Yearly' : 'Monthly'} billing · Started {formatDate(current.started_at)}
                  {current.expires_at ? ` · Renews/expires ${formatDate(current.expires_at)}` : ''}
                </p>
              )}
            </div>
          </div>
          {current && current.status === 'active' && (
            <button onClick={handleCancel} disabled={busy} className="btn-secondary text-sm"><XCircle className="w-4 h-4" /> Cancel Subscription</button>
          )}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-5">
        {plans.map((p) => {
          const Icon = tierIcons[p.tier] ?? Crown;
          const isCurrent = currentPlan?.id === p.id && current?.status === 'active';
          const isPending = currentPlan?.id === p.id && current?.status === 'pending';
          const price = cycle === 'monthly' ? p.price_monthly : p.price_yearly;
          return (
            <div key={p.id} className={`card p-6 flex flex-col ${isCurrent ? 'border-emerald-300 shadow-glow' : isPending ? 'border-amber-200' : ''}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.tier === 'business' ? 'bg-navy-900 text-white' : 'bg-royal-50 text-royal-700'}`}><Icon className="w-5 h-5" /></div>
                <div>
                  <p className="font-bold text-navy-900">{p.name}</p>
                  <p className="text-[10px] uppercase tracking-wide text-royal-600 font-semibold">{p.tier}</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-navy-900 mb-1">
                {price === 0 ? 'Free' : formatINR(price)}
                {price > 0 && <span className="text-sm font-medium muted">/{cycle === 'monthly' ? 'mo' : 'yr'}</span>}
              </p>
              {isCurrent && <Badge variant="success" >Current Plan</Badge>}
              {isPending && <Badge variant="warning">Pending Payment</Badge>}
              <ul className="mt-4 mb-5 space-y-2 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-navy-700"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />{f}</li>
                ))}
              </ul>
              <button
                onClick={() => setConfirmPlan(p)}
                disabled={isCurrent}
                className={isCurrent ? 'btn-secondary w-full opacity-60' : p.tier === 'business' ? 'btn-primary w-full' : 'btn-royal w-full'}
              >
                {isCurrent ? 'Current Plan' : isPending ? 'Change Plan' : p.price_monthly === 0 ? 'Choose Free' : 'Upgrade'}
              </button>
            </div>
          );
        })}
      </div>

      <Modal open={!!confirmPlan} onClose={() => setConfirmPlan(null)} title={`Confirm ${confirmPlan?.name ?? ''} Plan`}>
        {confirmPlan && (
          <div className="space-y-4">
            <div className="bg-navy-50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-navy-900">{confirmPlan.name} · {cycle === 'monthly' ? 'Monthly' : 'Yearly'}</p>
                <p className="text-xs muted">{confirmPlan.features.length} features included</p>
              </div>
              <p className="text-xl font-bold text-navy-900">{confirmPlan.price_monthly === 0 ? 'Free' : formatINR(cycle === 'monthly' ? confirmPlan.price_monthly : confirmPlan.price_yearly)}</p>
            </div>
            {confirmPlan.tier === 'free' ? (
              <p className="text-sm text-navy-700">Switching to Free activates immediately — no payment required.</p>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-800">
                  <Info className="w-3.5 h-3.5 inline mr-1" />
                  No payment gateway is connected in this prototype. Your subscription will be recorded with status <strong>Pending</strong> and will only activate when real payment is confirmed. No amount will be charged or displayed as paid.
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setConfirmPlan(null)} className="btn-secondary flex-1">Back</button>
              <button onClick={handleChoose} disabled={busy} className={confirmPlan.tier === 'free' ? 'btn-success flex-1' : 'btn-primary flex-1'}>
                {busy ? 'Please wait...' : confirmPlan.tier === 'free' ? 'Switch to Free' : `Request ${confirmPlan.name}`}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
