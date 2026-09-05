import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, MapPin, Star, GitCompareArrows, CheckCircle2, Award, TrendingUp, Clock, Wallet, AlertTriangle, Sparkles, ArrowLeft, Quote, Send } from 'lucide-react';
import { fetchEngineer, fetchReviews, fetchProjects, createProfessionalRequest } from '@/lib/data';
import { calculateMatch } from '@/lib/matching';
import { useCompare } from '@/lib/compare';
import { useAuth } from '@/lib/auth';
import type { Engineer, Review, ProjectRequirement, Project } from '@/lib/types';
import { Badge, VerifiedBadge, RatingStars, LoadingState, EmptyState, ProgressBar, Modal, Toast, formatINR } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Cell } from 'recharts';
import { personPhoto, onPersonImgError, onProjectImgError } from '@/lib/people';

export default function EngineerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { has, toggle } = useCompare();
  const { user } = useAuth();
  const [engineer, setEngineer] = useState<Engineer | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [hireOpen, setHireOpen] = useState(false);
  const [hireProject, setHireProject] = useState('');
  const [hireBudget, setHireBudget] = useState('');
  const [hireDesc, setHireDesc] = useState('');
  const [hireBusy, setHireBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (user?.role !== 'homeowner') return;
    (async () => {
      try {
        const projs = await fetchProjects();
        setMyProjects(projs.filter((p) => p.homeowner_id === user.id && p.status !== 'completed'));
      } catch { /* ignore */ }
    })();
  }, [user]);

  const req: ProjectRequirement = {
    location: 'Coimbatore', budget: 2800000, house_type: '2BHK', area_sqft: 1500, construction_style: 'Modern',
  };

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const [eng, rev] = await Promise.all([fetchEngineer(id), fetchReviews(id)]);
        setEngineer(eng);
        setReviews(rev);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <LoadingState text="Loading engineer profile..." />;
  if (!engineer) return <EmptyState icon={<AlertTriangle className="w-7 h-7" />} title="Engineer not found" description="This engineer profile does not exist." action={<button onClick={() => navigate('/app/find-engineers')} className="btn-primary">Back to Find Engineers</button>} />;

  const match = calculateMatch(engineer, req);
  const perfData = [
    { metric: 'On-Time', value: engineer.on_time_pct },
    { metric: 'Budget', value: engineer.budget_adherence_pct },
    { metric: 'Quality', value: engineer.quality_score },
    { metric: 'Trust', value: engineer.trust_score },
  ];
  const matchData = match.factors.map((f) => ({ metric: f.label.split(' ')[0], value: f.score }));

  return (
    <div className="space-y-6 animate-fade-in">
      <button onClick={() => navigate('/app/find-engineers')} className="btn-ghost text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Engineers
      </button>

      {/* Header */}
      <div className="card p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <img src={personPhoto(engineer.photo_url, 'engineer')} alt={engineer.name} onError={(e) => onPersonImgError(e, 'engineer')} className="w-24 h-24 rounded-2xl object-cover" />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-navy-900">{engineer.name}</h1>
              {engineer.verification_status === 'verified' && <VerifiedBadge />}
              {engineer.verification_status === 'pending' && <Badge variant="warning">Verification Pending</Badge>}
            </div>
            <p className="muted mt-1">{engineer.qualification}</p>
            <div className="flex items-center gap-4 mt-3 flex-wrap text-sm">
              <span className="flex items-center gap-1 text-navy-600"><MapPin className="w-4 h-4" />{engineer.location}</span>
              <span className="flex items-center gap-1 text-navy-600"><Clock className="w-4 h-4" />{engineer.experience_years} years</span>
              <span className="flex items-center gap-1 text-navy-600"><CheckCircle2 className="w-4 h-4" />{engineer.projects_completed} projects</span>
              <span className="flex items-center gap-1 text-navy-600"><Star className="w-4 h-4 text-amber-400 fill-amber-400" />{engineer.rating} ({engineer.reviews_count} reviews)</span>
              <span className="flex items-center gap-1 text-navy-600"><Wallet className="w-4 h-4" />₹{engineer.price_per_sqft}/sq.ft</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {engineer.specializations.map((s) => <Badge key={s} variant="navy">{s}</Badge>)}
            </div>
          </div>
          <div className="flex flex-col gap-2 lg:w-56">
            <button onClick={() => navigate('/app/projects')} className="btn-primary">Select Engineer</button>
            {user?.role === 'homeowner' && engineer.user_id ? (
              <button onClick={() => { setHireOpen(true); }} disabled={myProjects.length === 0} className="btn-royal" title={myProjects.length === 0 ? 'Create a project first' : 'Send this engineer a hire request'}>Hire for My Project</button>
            ) : user?.role === 'homeowner' && !engineer.user_id ? (
              <button disabled className="btn-secondary opacity-60" title="This engineer has no linked BuildMatch account yet — contact them directly.">Hire Unavailable</button>
            ) : null}
            <button onClick={() => setQuoteOpen(true)} className="btn-secondary">Request Quote</button>
            <button onClick={() => toggle(engineer.id)} className={`btn ${has(engineer.id) ? 'bg-royal-600 text-white' : 'btn-secondary'}`}>
              <GitCompareArrows className="w-4 h-4" /> {has(engineer.id) ? 'In Compare' : 'Add to Compare'}
            </button>
          </div>
        </div>
        <p className="mt-4 text-navy-600 text-sm leading-relaxed">{engineer.bio}</p>
      </div>

      {/* AI Match + Trust Score */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-royal-600" />
            <h2 className="text-lg font-bold text-navy-900">AI Match Explanation</h2>
          </div>
          <div className="text-center mb-4">
            <p className="text-4xl font-bold text-royal-600">{match.overallScore}%</p>
            <p className="text-sm muted">Overall Match Score</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={matchData}>
              <PolarGrid stroke="#dae4f4" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#5d80bf' }} />
              <Radar dataKey="value" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {match.factors.map((f) => (
              <div key={f.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-navy-700">{f.label}</span>
                  <span className="font-semibold text-navy-900">{f.score}%</span>
                </div>
                <ProgressBar value={f.score} color={f.score >= 85 ? 'emerald' : f.score >= 70 ? 'royal' : 'amber'} />
              </div>
            ))}
          </div>
          <div className="mt-4 bg-royal-50 rounded-xl p-4">
            <p className="text-sm text-navy-700"><span className="font-semibold">Why this engineer? </span>{match.explanation}</p>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-navy-900">Trust Score</h2>
          </div>
          <div className="text-center mb-4">
            <p className="text-4xl font-bold text-emerald-600">{engineer.trust_score}/100</p>
            <p className="text-sm muted">Trust Level: {engineer.trust_level}</p>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Identity Verification', value: engineer.identity_verified ? 100 : 0, icon: ShieldCheck },
              { label: 'Credential Verification', value: engineer.credential_verified ? 100 : 0, icon: Award },
              { label: 'Project History', value: Math.min(100, engineer.projects_completed * 2), icon: CheckCircle2 },
              { label: 'On-Time Performance', value: engineer.on_time_pct, icon: Clock },
              { label: 'Budget Adherence', value: engineer.budget_adherence_pct, icon: Wallet },
              { label: 'Quality Score', value: engineer.quality_score, icon: TrendingUp },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-1.5 text-navy-700"><s.icon className="w-3.5 h-3.5" />{s.label}</span>
                  <span className="font-semibold text-navy-900">{s.value}%</span>
                </div>
                <ProgressBar value={s.value} color="emerald" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="muted">Complaints: {engineer.complaints_count}</span>
          </div>
        </div>
      </div>

      {/* Performance metrics */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-navy-900 mb-4">Performance Metrics</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={perfData}>
            <XAxis dataKey="metric" tick={{ fontSize: 12, fill: '#5d80bf' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#8ba9d6' }} axisLine={false} tickLine={false} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {perfData.map((d, i) => <Cell key={i} fill={d.value >= 90 ? '#059669' : d.value >= 80 ? '#4f46e5' : '#f59e0b'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Portfolio */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-navy-900 mb-4">Portfolio — Completed Projects</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {engineer.portfolio.map((p, i) => (
            <div key={i} className="rounded-xl overflow-hidden border border-navy-100 group">
              <div className="relative h-40 overflow-hidden">
                <img src={p.image} alt={p.title} onError={onProjectImgError} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-2 right-2"><Badge variant="success">Completed</Badge></div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-navy-900 text-sm">{p.title}</p>
                <p className="text-xs muted">{p.location} · {p.year}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-navy-900 mb-4">Verified Project Reviews ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <EmptyState icon={<Star className="w-7 h-7" />} title="No reviews yet" description="This engineer has no verified project reviews." />
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="border border-navy-100 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-navy-900">{r.homeowner_name}</p>
                      {r.verified && <Badge variant="verified"><ShieldCheck className="w-3 h-3" /> Verified Project Review</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <RatingStars rating={r.rating} size="xs" />
                      <span className="text-xs muted">{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <Quote className="w-6 h-6 text-navy-200" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 my-3 text-xs">
                  <div className="bg-navy-50 rounded-lg p-2 text-center"><p className="muted">Quality</p><p className="font-bold text-navy-900">{r.quality_rating}/5</p></div>
                  <div className="bg-navy-50 rounded-lg p-2 text-center"><p className="muted">Timeline</p><p className="font-bold text-navy-900">{r.timeline_rating}/5</p></div>
                  <div className="bg-navy-50 rounded-lg p-2 text-center"><p className="muted">Communication</p><p className="font-bold text-navy-900">{r.communication_rating}/5</p></div>
                  <div className="bg-navy-50 rounded-lg p-2 text-center"><p className="muted">Budget</p><p className="font-bold text-navy-900">{r.budget_rating}/5</p></div>
                </div>
                <p className="text-sm text-navy-600">{r.feedback}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quote modal */}
      <Modal open={quoteOpen} onClose={() => setQuoteOpen(false)} title={`Request Quote from ${engineer.name}`}>
        <div className="space-y-4">
          <p className="text-sm muted">Fill in your project details and {engineer.name} will respond with a detailed quote.</p>
          <div><label className="label">Project Title</label><input className="input" placeholder="e.g. 2BHK Modern Home" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Area (sq.ft)</label><input type="number" className="input" placeholder="1500" /></div>
            <div><label className="label">Budget (₹)</label><input type="number" className="input" placeholder="2800000" /></div>
          </div>
          <div><label className="label">Message</label><textarea className="input min-h-[100px]" placeholder="Describe your project requirements..." /></div>
          <button onClick={() => setQuoteOpen(false)} className="btn-primary w-full">Send Quote Request</button>
        </div>
      </Modal>

      {/* Hire engineer for an existing project (homeowner) */}
      <Modal open={hireOpen} onClose={() => setHireOpen(false)} title={`Hire ${engineer.name} for a Project`}>
        <div className="space-y-4">
          <p className="text-sm muted">Send a hire request for one of your active projects. {engineer.name} accepts or declines it from their workspace.</p>
          <div>
            <label className="label">Project *</label>
            <select className="input" value={hireProject} onChange={(e) => setHireProject(e.target.value)}>
              <option value="">Choose a project...</option>
              {myProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.title} — {p.location} ({formatINR(p.budget)})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Engagement Budget (₹)</label>
            <input type="number" min="0" className="input" placeholder="Optional" value={hireBudget} onChange={(e) => setHireBudget(e.target.value)} />
          </div>
          <div>
            <label className="label">Message / Scope</label>
            <textarea className="input min-h-[90px]" placeholder="Tell the engineer what you need..." value={hireDesc} onChange={(e) => setHireDesc(e.target.value)} />
          </div>
          <button
            disabled={hireBusy || !hireProject}
            onClick={async () => {
              if (!hireProject || !user || !engineer.user_id) return;
              setHireBusy(true);
              try {
                await createProfessionalRequest({
                  project_id: hireProject,
                  homeowner_id: user.id,
                  professional_id: engineer.user_id,
                  professional_type: 'engineer',
                  title: `Engineer hire — ${engineer.name}`,
                  description: hireDesc.trim() || null,
                  budget: hireBudget ? Math.max(0, Number(hireBudget)) : null,
                  expected_date: null,
                });
                setHireOpen(false);
                setHireProject(''); setHireBudget(''); setHireDesc('');
                setToast({ msg: `Hire request sent to ${engineer.name}.`, type: 'success' });
              } catch {
                setToast({ msg: 'Could not send the hire request. Please try again.', type: 'error' });
              } finally {
                setHireBusy(false);
              }
            }}
            className="btn-primary w-full"
          >
            {hireBusy ? 'Sending...' : <>Send Hire Request <Send className="w-4 h-4" /></>}
          </button>
        </div>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
