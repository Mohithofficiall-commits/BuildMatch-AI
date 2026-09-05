import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import {
  fetchProfessionalRequestsJoined, fetchProjectMembersByUser, fetchMaterialOrders, fetchMaterials,
  fetchUserSubscription, fetchSubscriptionPlans,
} from '@/lib/data';
import {
  useProfessionalProfile, profileName, profilePhoto, isVerified, roleLabel, isProfessionalRole, roleHomePath,
} from '@/lib/portal';
import { VerifiedBadge, Badge, LoadingState, formatINR, formatDate } from '@/components/ui';
import { requestStatus, memberStatus, orderStatus } from '@/components/professional/statuses';
import {
  ClipboardList, FolderKanban, Wallet, Package, ShieldCheck, CreditCard, ShoppingCart,
  CheckCircle2, ArrowRight, Star,
} from 'lucide-react';
import { personPhoto, onPersonImgError } from '@/lib/people';

export default function PortalDashboardPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Awaited<ReturnType<typeof fetchProfessionalRequestsJoined>>>([]);
  const [memberships, setMemberships] = useState<Awaited<ReturnType<typeof fetchProjectMembersByUser>>>([]);
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof fetchMaterialOrders>>>([]);
  const [materials, setMaterials] = useState<Awaited<ReturnType<typeof fetchMaterials>>>([]);
  const [planName, setPlanName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const role = user && isProfessionalRole(user.role) ? user.role : null;
  const { profile } = useProfessionalProfile(role ?? 'engineer');

  const isShop = role === 'material_shop';

  useEffect(() => {
    if (!role || !user) return;
    (async () => {
      try {
        const [reqs, mems, sub] = await Promise.all([
          fetchProfessionalRequestsJoined(user.id).catch(() => []),
          fetchProjectMembersByUser(user.id).catch(() => []),
          fetchUserSubscription(user.id).catch(() => null),
        ]);
        setRequests(reqs); setMemberships(mems);
        if (sub) {
          const plans = await fetchSubscriptionPlans().catch(() => []);
          setPlanName(plans.find((p) => p.id === sub.plan_id)?.name ?? null);
        }
        if (isShop) {
          const [ord, mats] = await Promise.all([
            fetchMaterialOrders(undefined, user.id).catch(() => []),
            fetchMaterials(user.id).catch(() => []),
          ]);
          setOrders(ord); setMaterials(mats);
        }
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, [role, user, isShop]);

  if (!user || !role || !isProfessionalRole(user.role)) return <LoadingState text="Loading workspace..." />;
  if (loading) return <LoadingState text="Loading your dashboard..." />;

  const materialById = new Map(materials.map((m) => [m.id, m]));

  const pending = requests.filter((r) => r.status === 'pending');
  const activeMembers = memberships.filter((m) => m.status === 'active');
  const myActiveProjects = activeMembers.filter((m) => m.project?.status === 'active');
  const completedCount = memberships.filter((m) => m.project?.status === 'completed' || m.status === 'completed').length;
  const deliveredRevenue = orders.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.total_price, 0);
  const requestRevenue = requests.filter((r) => r.status === 'completed').reduce((s, r) => s + (r.budget ?? 0), 0);
  const lowStock = materials.filter((m) => m.availability === 'low_stock' || m.availability === 'out_of_stock').length;
  const openOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length;

  return (
    <div className="min-h-screen bg-[#F6F8FC] p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Hero header */}
      <div className="card p-6 bg-gradient-to-br from-navy-900 to-navy-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-navy [background-size:32px_32px] opacity-10" />
        <div className="relative flex items-start gap-4 flex-wrap">
          <img src={profile ? profilePhoto(profile) : personPhoto(user.avatar_url, user.role)} alt="" onError={(e) => onPersonImgError(e, profile && 'profession' in profile ? profile.profession : user.role)} className="w-16 h-16 rounded-2xl object-cover" />
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{profile ? profileName(profile) : user.name}</h1>
              {profile && isVerified(profile) && <VerifiedBadge />}
              {profile && !isVerified(profile) && profile.verification_status === 'pending' && <Badge variant="warning">Verification Pending</Badge>}
            </div>
            <p className="text-navy-200 text-sm capitalize">{roleLabel(role)} · {profile?.location ?? user.location ?? '—'}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap text-sm">
              {profile && (
                <>
                  <span className="flex items-center gap-1 text-amber-300"><Star className="w-4 h-4 fill-current" /> {profile.rating} ({profile.reviews_count} reviews)</span>
                  <span className="text-navy-200">{profile.experience_years} yrs experience</span>
                  {planName && <span className="badge-royal !text-royal-800">Plan: {planName}</span>}
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-navy-200">Availability</p>
            <p className="font-semibold text-emerald-300">{profile?.availability ?? 'Available'}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm muted">Pending Requests</p>
              <p className="text-2xl font-bold text-navy-900 mt-1">{pending.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><ClipboardList className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm muted">Active Projects</p>
              <p className="text-2xl font-bold text-navy-900 mt-1">{myActiveProjects.length}</p>
              <p className="text-xs muted">{completedCount} completed</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-royal-50 text-royal-600 flex items-center justify-center"><FolderKanban className="w-5 h-5" /></div>
          </div>
        </div>
        {isShop ? (
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm muted">Open Orders</p>
                <p className="text-2xl font-bold text-navy-900 mt-1">{openOrders}</p>
                <p className="text-xs muted">{lowStock} low/out-of-stock items</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center"><ShoppingCart className="w-5 h-5" /></div>
            </div>
          </div>
        ) : (
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm muted">Delivered Jobs</p>
                <p className="text-2xl font-bold text-navy-900 mt-1">{requests.filter((r) => r.status === 'completed').length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div>
            </div>
          </div>
        )}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm muted">Total Earned</p>
              <p className="text-2xl font-bold text-navy-900 mt-1">{formatINR(isShop ? deliveredRevenue : requestRevenue)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Wallet className="w-5 h-5" /></div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent requests */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-navy-900">Recent Project Requests</h2>
            <Link to={`${roleHomePath(role)}/requests`} className="btn-ghost text-sm">View All <ArrowRight className="w-4 h-4" /></Link>
          </div>
          {requests.length === 0 ? (
            <p className="text-sm muted">No requests yet. Homeowners can request you from a project page.</p>
          ) : (
            <div className="space-y-2.5">
              {requests.slice(0, 5).map((r) => {
                const st = requestStatus(r.status);
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 border border-navy-100 rounded-xl p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy-900 truncate">{r.project?.title ?? 'Project'}</p>
                      <p className="text-xs muted truncate">{r.requester?.name ?? 'Homeowner'} · {r.title}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.budget != null && <span className="text-xs font-semibold text-navy-900">{formatINR(r.budget)}</span>}
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active projects */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-navy-900">My Projects</h2>
            <Link to={`${roleHomePath(role)}/projects`} className="btn-ghost text-sm">View All <ArrowRight className="w-4 h-4" /></Link>
          </div>
          {activeMembers.length === 0 ? (
            <p className="text-sm muted">Accepted requests will appear here as projects.</p>
          ) : (
            <div className="space-y-2.5">
              {activeMembers.slice(0, 5).map((m) => {
                const st = memberStatus(m.status);
                const progress = m.project?.progress ?? 0;
                return (
                  <div key={m.id} className="border border-navy-100 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-navy-900 truncate">{m.project?.title ?? 'Project'}</p>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-navy-100 rounded-full overflow-hidden">
                        <div className="h-full bg-royal-600 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-navy-900">{progress}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { icon: ClipboardList, label: 'Project Requests', to: `${roleHomePath(role)}/requests`, desc: 'Accept or decline homeowner requests' },
          isShop
            ? { icon: Package, label: 'Inventory', to: `${roleHomePath(role)}/inventory`, desc: `${materials.length} materials listed · ${lowStock} low stock` }
            : { icon: FolderKanban, label: 'My Projects', to: `${roleHomePath(role)}/projects`, desc: 'Track active and completed work' },
          { icon: ShieldCheck, label: 'Verification', to: `${roleHomePath(role)}/verification`, desc: 'Submit credentials & certificates' },
          { icon: CreditCard, label: 'Subscription', to: `${roleHomePath(role)}/subscription`, desc: planName ? `Current plan: ${planName}` : 'View Free / Pro / Business plans' },
        ].map((a) => (
          <Link key={a.label} to={a.to} className="card p-5 card-hover group">
            <div className="w-10 h-10 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center mb-3 group-hover:bg-royal-50 group-hover:text-royal-700 transition-colors">
              <a.icon className="w-5 h-5" />
            </div>
            <p className="font-semibold text-navy-900">{a.label}</p>
            <p className="text-sm muted mt-0.5 line-clamp-2">{a.desc}</p>
          </Link>
        ))}
      </div>

      {/* Shop: recent orders */}
      {isShop && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-royal-600" /><h2 className="text-lg font-bold text-navy-900">Recent Orders</h2></div>
            <Link to={`${roleHomePath(role)}/orders`} className="btn-ghost text-sm">All Orders <ArrowRight className="w-4 h-4" /></Link>
          </div>
          {orders.length === 0 ? (
            <p className="text-sm muted">No orders yet. Order notifications will appear here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-navy-100 text-left text-xs muted">
                    <th className="pb-3 font-medium">Material</th>
                    <th className="pb-3 font-medium">Qty</th>
                    <th className="pb-3 font-medium">Total</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 6).map((o) => {
                    const st = orderStatus(o.status);
                    return (
                      <tr key={o.id} className="border-b border-navy-50">
                        <td className="py-3 text-sm font-medium text-navy-900">{materialById.get(o.material_id)?.name ?? 'Material'}</td>
                        <td className="py-3 text-sm muted">{o.quantity} {materialById.get(o.material_id)?.unit ?? ''}</td>
                        <td className="py-3 text-sm font-semibold text-navy-900">{formatINR(o.total_price)}</td>
                        <td className="py-3 text-sm muted">{formatDate(o.created_at)}</td>
                        <td className="py-3"><Badge variant={st.variant}>{st.label}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
