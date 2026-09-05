import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import {
  fetchProfessionalRequestsJoined, updateProfessionalRequestStatus, addProjectMember,
  fetchProjectMembersByUser, updateProjectMemberStatus, fetchEngineerByUserId, updateProjectEngineer,
} from '@/lib/data';
import type { ProfessionalRequestJoined } from '@/lib/types';
import { LoadingState, EmptyState, Badge, Toast, formatINR, formatDate } from '@/components/ui';
import { requestStatus } from '@/components/professional/statuses';
import { ClipboardList, CheckCircle2, XCircle, MapPin, CalendarClock, TrendingUp, ArrowRight } from 'lucide-react';

const FILTERS = ['all', 'pending', 'accepted', 'completed', 'declined', 'cancelled'] as const;

export default function PortalRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ProfessionalRequestJoined[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try { setRequests(await fetchProfessionalRequestsJoined(user.id)); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  if (!user) return <LoadingState text="Loading..." />;

  const handleAccept = async (r: ProfessionalRequestJoined) => {
    if (!user || !r.project) return;
    setBusy(r.id);
    try {
      await updateProfessionalRequestStatus(r.id, 'accepted');
      await addProjectMember({ project_id: r.project_id, user_id: user.id, role: r.professional_type });
      // For engineers: also attach the engineer profile to the project when unassigned.
      if (r.professional_type === 'engineer') {
        const eng = await fetchEngineerByUserId(user.id).catch(() => null);
        if (eng && !r.project.engineer_id) {
          await updateProjectEngineer(r.project_id, eng.id).catch(() => { /* project may already have an engineer */ });
        }
      }
      setToast({ msg: 'Request accepted — you are now a member of this project.', type: 'success' });
    } catch {
      setToast({ msg: 'Could not accept the request. Please try again.', type: 'error' });
    } finally {
      setBusy(null);
      await load();
    }
  };

  const handleDecline = async (r: ProfessionalRequestJoined) => {
    setBusy(r.id);
    try {
      await updateProfessionalRequestStatus(r.id, 'declined');
      setToast({ msg: 'Request declined.', type: 'info' });
    } catch {
      setToast({ msg: 'Could not decline the request.', type: 'error' });
    } finally {
      setBusy(null);
      await load();
    }
  };

  const handleComplete = async (r: ProfessionalRequestJoined) => {
    setBusy(r.id);
    try {
      await updateProfessionalRequestStatus(r.id, 'completed');
      // Complete the matching project membership if present.
      const members = await fetchProjectMembersByUser(user.id).catch(() => []);
      const member = members.find((m) => m.project_id === r.project_id && m.status === 'active');
      if (member) await updateProjectMemberStatus(member.id, 'completed').catch(() => { /* ignore */ });
      setToast({ msg: 'Work marked as completed.', type: 'success' });
    } catch {
      setToast({ msg: 'Could not update the request.', type: 'error' });
    } finally {
      setBusy(null);
      await load();
    }
  };

  if (loading) return <LoadingState text="Loading project requests..." />;

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);
  const counts: Record<string, number> = { all: requests.length };
  for (const f of FILTERS) if (f !== 'all') counts[f] = requests.filter((r) => r.status === f).length;

  return (
    <div className="min-h-screen bg-[#F6F8FC] p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <h1 className="text-2xl font-bold text-navy-900">Project Requests</h1>
        <p className="muted mt-1">Homeowner requests for your services — accepting adds you to the project team</p>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`btn text-sm capitalize ${filter === f ? 'bg-navy-900 text-white' : 'btn-secondary'}`}>
            {f} <span className="text-xs opacity-70">({counts[f] ?? 0})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-7 h-7" />}
          title="No project requests"
          description={filter === 'all' ? 'When homeowners request your services, requests will appear here for you to accept or decline.' : `No ${filter} requests right now.`}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => {
            const st = requestStatus(r.status);
            return (
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-navy-900">{r.title}</h3>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs muted flex-wrap">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{r.project?.location ?? '—'}</span>
                      <span className="flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />Expected {formatDate(r.expected_date)}</span>
                      <span className="flex items-center gap-1">Requested {formatDate(r.created_at)}</span>
                    </div>
                    {r.description && <p className="text-sm text-navy-600 mt-2">{r.description}</p>}
                    {r.project && (
                      <Link to={`/app/projects/${r.project.id}`} className="inline-flex items-center gap-1 text-xs text-royal-600 font-semibold mt-2 hover:underline">
                        View project <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                  <div className="text-right shrink-0 space-y-2">
                    <div>
                      <p className="text-xs muted">Client</p>
                      <p className="text-sm font-semibold text-navy-900">{r.requester?.name ?? 'Homeowner'}</p>
                    </div>
                    {r.budget != null && (
                      <div>
                        <p className="text-xs muted">Budget</p>
                        <p className="text-sm font-semibold text-navy-900">{formatINR(r.budget)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {(r.status === 'pending' || r.status === 'accepted') && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-navy-100">
                    {r.status === 'pending' && (
                      <>
                        <button onClick={() => handleAccept(r)} disabled={busy === r.id} className="btn-success text-sm"><CheckCircle2 className="w-4 h-4" /> Accept & Join Project</button>
                        <button onClick={() => handleDecline(r)} disabled={busy === r.id} className="btn-secondary text-sm"><XCircle className="w-4 h-4" /> Decline</button>
                      </>
                    )}
                    {r.status === 'accepted' && (
                      <button onClick={() => handleComplete(r)} disabled={busy === r.id} className="btn-primary text-sm"><TrendingUp className="w-4 h-4" /> Mark Work Completed</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
