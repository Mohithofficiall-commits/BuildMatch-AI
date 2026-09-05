import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import {
  fetchProjectMembersByUser, fetchEngineerByUserId, fetchProjects, fetchAppUsers,
} from '@/lib/data';
import type { ProjectMemberJoined, Project, AppUser } from '@/lib/types';
import { LoadingState, EmptyState, Badge, formatINR, formatDate } from '@/components/ui';
import { memberStatus, projectStatus } from '@/components/professional/statuses';
import { FolderKanban, MapPin, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

export default function PortalProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<ProjectMemberJoined[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [mems, allUsers] = await Promise.all([
        fetchProjectMembersByUser(user.id).catch(() => []),
        fetchAppUsers().catch(() => []),
      ]);
      setMembers(mems);
      setUsers(allUsers);
      if (user.role === 'engineer') {
        const eng = await fetchEngineerByUserId(user.id).catch(() => null);
        if (eng) {
          const projs = await fetchProjects().catch(() => []);
          setAssignedProjects(projs.filter((p) => p.engineer_id === eng.id));
        }
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  if (!user) return <LoadingState text="Loading..." />;
  if (loading) return <LoadingState text="Loading your projects..." />;

  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? 'Homeowner';

  interface ProjectLite {
    id: string;
    title: string;
    location: string;
    status: Project['status'];
    progress: number;
    homeowner_id: string;
    current_milestone?: string | null;
    engineer_id?: string | null;
    house_type?: string | null;
    area_sqft?: number | null;
    budget?: number | null;
    start_date?: string | null;
  }

  // Deduplicate by project id: memberships first, then engineer-assigned projects.
  const seen = new Set<string>();
  const entries: { project: ProjectLite; memberStatus: string; role: string; joinedAt?: string }[] = [];
  const pushProject = (project: ProjectLite | null | undefined, mStatus: string, role: string, joinedAt?: string) => {
    if (!project || seen.has(project.id)) return;
    seen.add(project.id);
    entries.push({ project, memberStatus: mStatus, role, joinedAt });
  };

  for (const m of members) {
    if (m.status === 'declined' || m.status === 'invited') continue;
    if (!m.project) continue;
    pushProject(m.project, m.status, m.role, m.joined_at ?? undefined);
  }
  if (user.role === 'engineer') {
    for (const p of assignedProjects) pushProject(p, p.status === 'completed' ? 'completed' : 'active', 'engineer');
  }

  const active = entries.filter((e) => e.project.status === 'active' || e.project.status === 'planning' || e.project.status === 'on_hold');
  const completed = entries.filter((e) => e.project.status === 'completed');
  const list = tab === 'active' ? active : completed;

  return (
    <div className="min-h-screen bg-[#F6F8FC] p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">My Projects</h1>
          <p className="muted mt-1">Projects you are part of, connected through the BuildMatch project system</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('active')} className={`btn text-sm ${tab === 'active' ? 'bg-navy-900 text-white' : 'btn-secondary'}`}><Clock className="w-4 h-4" /> Active ({active.length})</button>
          <button onClick={() => setTab('completed')} className={`btn text-sm ${tab === 'completed' ? 'bg-navy-900 text-white' : 'btn-secondary'}`}><CheckCircle2 className="w-4 h-4" /> Completed ({completed.length})</button>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="w-7 h-7" />}
          title={tab === 'active' ? 'No active projects' : 'No completed projects'}
          description={tab === 'active' ? 'Accept a project request from the Requests tab to start working on a project.' : 'Completed projects will be listed here.'}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map(({ project: p, memberStatus: ms, role, joinedAt }) => {
            const ps = projectStatus(p.status);
            const msBadge = ms ? memberStatus(ms) : null;
            return (
              <div key={p.id} className="card p-5 card-hover cursor-pointer" onClick={() => navigate(`/app/projects/${p.id}`)}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-navy-900">{p.title}</h3>
                    <p className="text-xs muted flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{p.location}</p>
                  </div>
                  <Badge variant={ps.variant}>{ps.label}</Badge>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  {msBadge && <Badge variant={msBadge.variant}>{msBadge.label}</Badge>}
                  <Badge variant="navy" >{role}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div><p className="text-xs muted">Client</p><p className="font-semibold text-navy-900 truncate">{userName(p.homeowner_id)}</p></div>
                  <div><p className="text-xs muted">Budget</p><p className="font-semibold text-navy-900">{formatINR(p.budget ?? 0)}</p></div>
                  <div><p className="text-xs muted">Type</p><p className="font-semibold text-navy-900">{p.house_type ?? '—'}</p></div>
                  <div><p className="text-xs muted">Started</p><p className="font-semibold text-navy-900">{formatDate(p.start_date ?? null)}</p></div>
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="muted">Progress</span>
                    <span className="font-semibold text-navy-900">{p.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-navy-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${p.progress === 100 ? 'bg-emerald-500' : 'bg-royal-600'}`} style={{ width: `${p.progress}%` }} />
                  </div>
                  {p.current_milestone && <p className="text-xs muted mt-1">Current: {p.current_milestone}</p>}
                </div>
                {joinedAt && <p className="text-xs muted">Joined {formatDate(joinedAt)}</p>}
                <div className="flex items-center gap-1 text-royal-600 text-xs font-semibold mt-3 pt-3 border-t border-navy-100">
                  View project details <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
