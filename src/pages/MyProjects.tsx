import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProjects } from '@/lib/data';
import type { Project } from '@/lib/types';
import { LoadingState, EmptyState, Badge, formatINR, formatDate } from '@/components/ui';
import { FolderKanban, MapPin, ArrowRight, Plus, CalendarClock } from 'lucide-react';

const statusColors: Record<string, 'navy' | 'royal' | 'success' | 'warning'> = {
  active: 'royal', completed: 'success', planning: 'navy', on_hold: 'warning',
};

export default function MyProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setProjects(await fetchProjects()); } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <LoadingState text="Loading projects..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">My Projects</h1>
          <p className="muted mt-1">Manage and track all your construction projects</p>
        </div>
        <button onClick={() => navigate('/app/ai-match')} className="btn-primary"><Plus className="w-4 h-4" /> New Project</button>
      </div>

      {projects.length === 0 ? (
        <EmptyState icon={<FolderKanban className="w-7 h-7" />} title="No projects yet" description="Start by finding an engineer and creating your first project." action={<button onClick={() => navigate('/app/find-engineers')} className="btn-primary">Find Engineers</button>} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((p) => (
            <div key={p.id} className="card p-5 card-hover cursor-pointer" onClick={() => navigate(`/app/projects/${p.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-navy-900">{p.title}</h3>
                  <p className="text-xs muted flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{p.location}</p>
                </div>
                <Badge variant={statusColors[p.status]}>{p.status.replace('_', ' ').toUpperCase()}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div><p className="text-xs muted">Type</p><p className="font-semibold text-navy-900">{p.house_type}</p></div>
                <div><p className="text-xs muted">Area</p><p className="font-semibold text-navy-900">{p.area_sqft} sq.ft</p></div>
                <div><p className="text-xs muted">Budget</p><p className="font-semibold text-navy-900">{formatINR(p.budget)}</p></div>
                <div><p className="text-xs muted">Style</p><p className="font-semibold text-navy-900">{p.construction_style}</p></div>
              </div>
              {p.engineer && (
                <div className="flex items-center gap-2 mb-3 text-sm">
                  <img src={p.engineer.photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                  <span className="text-navy-700">{p.engineer.name}</span>
                </div>
              )}
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
              <div className="flex items-center justify-between text-xs muted pt-3 border-t border-navy-100">
                <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" />{formatDate(p.start_date)}</span>
                <span className="flex items-center gap-1 text-royal-600 font-medium">View Details <ArrowRight className="w-3 h-3" /></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
