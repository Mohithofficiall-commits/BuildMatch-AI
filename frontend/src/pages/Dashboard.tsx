import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Home, Ruler, Wallet, Palette, ArrowRight, ShieldCheck, Sparkles, GitCompareArrows, CheckCircle2, TrendingUp, Star, FileBadge, Camera, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { fetchEngineers, fetchProjects } from '@/lib/data';
import { rankEngineers } from '@/lib/matching';
import type { Engineer, Project, ProjectRequirement } from '@/lib/types';
import { Badge, RatingStars, TrustBadge, LoadingState, formatINR } from '@/components/ui';
import { personPhoto, onPersonImgError } from '@/lib/people';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [req, setReq] = useState<ProjectRequirement>({
    location: 'Coimbatore',
    budget: 2800000,
    house_type: '2BHK',
    area_sqft: 1500,
    construction_style: 'Modern',
  });

  useEffect(() => {
    (async () => {
      try {
        const [eng, proj] = await Promise.all([fetchEngineers(), fetchProjects()]);
        setEngineers(eng);
        setProjects(proj);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const matches = rankEngineers(engineers, req).slice(0, 4);
  const activeProject = projects.find((p) => p.status === 'active');

  const steps = [
    { icon: Search, label: 'Requirement' },
    { icon: Sparkles, label: 'AI Match' },
    { icon: GitCompareArrows, label: 'Compare' },
    { icon: CheckCircle2, label: 'Hire' },
    { icon: TrendingUp, label: 'Track' },
    { icon: ShieldCheck, label: 'Verify' },
    { icon: Star, label: 'Review' },
  ];

  const findEngineers = () => navigate('/app/find-engineers');

  if (loading) return <LoadingState text="Loading your dashboard..." />;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero */}
      <div className="card p-6 lg:p-8 bg-gradient-to-br from-navy-900 to-navy-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-navy [background-size:32px_32px] opacity-10" />
        <div className="relative">
          <p className="text-royal-300 text-sm font-medium mb-2">Welcome back, {user?.name?.split(' ')[0]}</p>
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">Find the Right Engineer for Your Dream Home</h1>
          <p className="text-navy-200 max-w-2xl">Enter your project requirements and get AI-powered, explainable engineer recommendations.</p>
        </div>
      </div>

      {/* Quick search */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-navy-900 mb-4">Project Quick-Search</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="label"><MapPin className="w-3.5 h-3.5 inline mr-1" />Location</label>
            <select className="input" value={req.location} onChange={(e) => setReq({ ...req, location: e.target.value })}>
              {['Coimbatore', 'Chennai', 'Bengaluru', 'Hyderabad', 'Kochi', 'Pune', 'Mumbai'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label"><Home className="w-3.5 h-3.5 inline mr-1" />House Type</label>
            <select className="input" value={req.house_type} onChange={(e) => setReq({ ...req, house_type: e.target.value })}>
              {['1BHK', '2BHK', '3BHK', '4BHK', 'Villa', 'Duplex'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label"><Ruler className="w-3.5 h-3.5 inline mr-1" />Area (sq.ft)</label>
            <input type="number" className="input" value={req.area_sqft} onChange={(e) => setReq({ ...req, area_sqft: +e.target.value })} />
          </div>
          <div>
            <label className="label"><Wallet className="w-3.5 h-3.5 inline mr-1" />Budget (₹)</label>
            <select className="input" value={req.budget} onChange={(e) => setReq({ ...req, budget: +e.target.value })}>
              <option value={1500000}>₹10–15 Lakhs</option>
              <option value={2000000}>₹15–20 Lakhs</option>
              <option value={2800000}>₹20–30 Lakhs</option>
              <option value={4000000}>₹30–45 Lakhs</option>
              <option value={6000000}>₹45–60 Lakhs</option>
              <option value={8000000}>₹60+ Lakhs</option>
            </select>
          </div>
          <div>
            <label className="label"><Palette className="w-3.5 h-3.5 inline mr-1" />Construction Style</label>
            <select className="input" value={req.construction_style} onChange={(e) => setReq({ ...req, construction_style: e.target.value })}>
              {['Modern', 'Contemporary', 'Traditional', 'Eco-friendly', 'Luxury'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={findEngineers} className="btn-primary w-full py-2.5">
              Find Engineers <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Active project summary */}
      {activeProject && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-navy-900">Active Project</h2>
            <button onClick={() => navigate(`/app/projects/${activeProject.id}`)} className="btn-ghost text-sm">
              View Details <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs muted">Project</p>
              <p className="font-semibold text-navy-900">{activeProject.title}</p>
            </div>
            <div>
              <p className="text-xs muted">Engineer</p>
              <p className="font-semibold text-navy-900">{activeProject.engineer?.name ?? 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-xs muted">Budget</p>
              <p className="font-semibold text-navy-900">{formatINR(activeProject.budget)}</p>
            </div>
            <div>
              <p className="text-xs muted">Progress</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-navy-100 rounded-full overflow-hidden">
                  <div className="h-full bg-royal-600 rounded-full transition-all duration-700" style={{ width: `${activeProject.progress}%` }} />
                </div>
                <span className="text-sm font-semibold text-navy-900">{activeProject.progress}%</span>
              </div>
              <p className="text-xs muted mt-1">Current: {activeProject.current_milestone}</p>
            </div>
          </div>
        </div>
      )}

      {/* Top matched engineers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-navy-900">Top Matched Engineers</h2>
            <p className="muted text-sm">Explainable AI recommendations based on your requirements</p>
          </div>
          <button onClick={() => navigate('/app/ai-match')} className="btn-ghost text-sm">
            Full AI Match <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {matches.map((m) => (
            <div key={m.engineer.id} className="card p-5 card-hover cursor-pointer" onClick={() => navigate(`/app/engineers/${m.engineer.id}`)}>
              <div className="flex items-start gap-3 mb-3">
                <img src={personPhoto(m.engineer.photo_url, 'engineer')} alt={m.engineer.name} onError={(e) => onPersonImgError(e, 'engineer')} className="w-14 h-14 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-navy-900 truncate">{m.engineer.name}</p>
                    {m.engineer.verification_status === 'verified' && <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </div>
                  <p className="text-xs muted">{m.engineer.location}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <RatingStars rating={m.engineer.rating} size="xs" />
                    <span className="text-xs muted ml-1">{m.engineer.rating}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-2xl font-bold text-royal-600">{m.overallScore}%</p>
                  <p className="text-[10px] muted">Match Score</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-navy-900">₹{m.engineer.price_per_sqft}/sq.ft</p>
                  <p className="text-xs muted">{m.engineer.experience_years} yrs exp</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {m.engineer.specializations.slice(0, 2).map((s) => <Badge key={s} variant="navy">{s}</Badge>)}
              </div>
              <TrustBadge score={m.engineer.trust_score} />
            </div>
          ))}
        </div>
      </div>

      {/* How BuildMatch Works */}
      <div className="card p-6 lg:p-8">
        <h2 className="text-xl font-bold text-navy-900 mb-2">How BuildMatch Works</h2>
        <p className="muted text-sm mb-6">From requirement to verified review — a transparent, end-to-end journey</p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {steps.map((s, i) => (
            <div key={s.label} className="text-center">
              <div className="w-12 h-12 rounded-xl bg-royal-50 text-royal-700 flex items-center justify-center mx-auto mb-2">
                <s.icon className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-navy-900">{s.label}</p>
              {i < steps.length - 1 && <div className="hidden lg:block h-px bg-navy-100 mt-2" />}
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: GitCompareArrows, title: 'Compare Engineers', desc: 'Side-by-side comparison of top matches', to: '/app/compare' },
          { icon: FileBadge, title: 'Digital Passport', desc: 'View your project verified digital record', to: '/app/digital-passport' },
          { icon: Camera, title: 'Milestone Verification', desc: 'AI-assisted construction stage detection', to: `/app/projects/${activeProject?.id ?? ''}` },
        ].map((a) => (
          <button key={a.title} onClick={() => navigate(a.to)} className="card p-5 text-left card-hover group">
            <div className="w-10 h-10 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center mb-3 group-hover:bg-royal-50 group-hover:text-royal-700 transition-colors">
              <a.icon className="w-5 h-5" />
            </div>
            <p className="font-semibold text-navy-900">{a.title}</p>
            <p className="text-sm muted mt-0.5">{a.desc}</p>
          </button>
        ))}
      </div>

      {/* Construction Team — now its own page, see sidebar → Construction Team */}
      <button
        onClick={() => navigate('/app/construction-team')}
        className="card p-5 text-left card-hover group w-full"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center group-hover:bg-royal-50 group-hover:text-royal-700 transition-colors">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-navy-900">Construction Team</p>
            <p className="text-sm muted mt-0.5">Find, compare and AI-match the right professionals for your project</p>
          </div>
          <ArrowRight className="w-4 h-4 text-navy-300 group-hover:text-royal-600 ml-auto transition-colors" />
        </div>
      </button>
    </div>
  );
}
