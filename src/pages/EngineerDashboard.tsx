import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchEngineer, fetchProjects, fetchMilestones, fetchPayments, fetchReviews, DEMO_ENGINEER_ID } from '@/lib/data';
import type { Engineer, Project, Milestone, Payment, Review } from '@/lib/types';
import { LoadingState, Badge, VerifiedBadge, RatingStars, formatINR, formatDate, MilestoneIcon } from '@/components/ui';
import { ShieldCheck, FolderKanban, Wallet, Star, MessageSquare, Camera, CheckCircle2, TrendingUp } from 'lucide-react';
import { personPhoto, onPersonImgError } from '@/lib/people';

export default function EngineerDashboard() {
  const [engineer, setEngineer] = useState<Engineer | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const eng = await fetchEngineer(DEMO_ENGINEER_ID);
        setEngineer(eng);
        const projs = await fetchProjects();
        const myProjects = projs.filter((p) => p.engineer_id === DEMO_ENGINEER_ID);
        setProjects(myProjects);
        if (myProjects.length > 0) {
          const [ms, pays] = await Promise.all([fetchMilestones(myProjects[0].id), fetchPayments(myProjects[0].id)]);
          setMilestones(ms); setPayments(pays);
        }
        setReviews(await fetchReviews(DEMO_ENGINEER_ID));
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <LoadingState text="Loading engineer dashboard..." />;
  if (!engineer) return <LoadingState text="Loading..." />;

  const totalEarned = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const activeProjects = projects.filter((p) => p.status === 'active');

  return (
    <div className="min-h-screen bg-[#F6F8FC] p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="card p-6 bg-gradient-to-br from-navy-900 to-navy-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-navy [background-size:32px_32px] opacity-10" />
        <div className="relative flex items-start gap-4 flex-wrap">
          <img src={personPhoto(engineer.photo_url, 'engineer')} alt={engineer.name} onError={(e) => onPersonImgError(e, 'engineer')} className="w-16 h-16 rounded-2xl object-cover" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{engineer.name}</h1>
              {engineer.verification_status === 'verified' && <VerifiedBadge />}
            </div>
            <p className="text-navy-200 text-sm">{engineer.qualification}</p>
            <p className="text-navy-200 text-sm">{engineer.location} · {engineer.experience_years} years experience</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-emerald-400">{engineer.trust_score}/100</p>
            <p className="text-xs text-navy-200">Trust Score · {engineer.trust_level}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-sm muted">Active Projects</p><p className="text-2xl font-bold text-navy-900 mt-1">{activeProjects.length}</p></div><div className="w-10 h-10 rounded-xl bg-royal-50 text-royal-700 flex items-center justify-center"><FolderKanban className="w-5 h-5" /></div></div></div>
        <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-sm muted">Projects Completed</p><p className="text-2xl font-bold text-navy-900 mt-1">{engineer.projects_completed}</p></div><div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div></div></div>
        <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-sm muted">Total Earned</p><p className="text-2xl font-bold text-navy-900 mt-1">{formatINR(totalEarned)}</p></div><div className="w-10 h-10 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center"><Wallet className="w-5 h-5" /></div></div></div>
        <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-sm muted">Rating</p><p className="text-2xl font-bold text-navy-900 mt-1">{engineer.rating}★</p><p className="text-xs muted">{engineer.reviews_count} reviews</p></div><div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Star className="w-5 h-5" /></div></div></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Verification status */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4"><ShieldCheck className="w-5 h-5 text-emerald-600" /><h2 className="text-lg font-bold text-navy-900">Verification Status</h2></div>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><span className="text-sm text-navy-700">Identity Verification</span><Badge variant={engineer.identity_verified ? 'verified' : 'warning'}>{engineer.identity_verified ? 'Verified' : 'Pending'}</Badge></div>
            <div className="flex items-center justify-between"><span className="text-sm text-navy-700">Credential Verification</span><Badge variant={engineer.credential_verified ? 'verified' : 'warning'}>{engineer.credential_verified ? 'Verified' : 'Pending'}</Badge></div>
            <div className="flex items-center justify-between"><span className="text-sm text-navy-700">Overall Status</span><Badge variant={engineer.verification_status === 'verified' ? 'verified' : 'warning'}>{engineer.verification_status}</Badge></div>
          </div>
          <div className="mt-4 pt-4 border-t border-navy-100">
            <p className="text-xs muted mb-2">Trust Score Breakdown</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-navy-50 rounded-lg p-2"><p className="text-xs muted">On-Time</p><p className="font-bold text-navy-900">{engineer.on_time_pct}%</p></div>
              <div className="bg-navy-50 rounded-lg p-2"><p className="text-xs muted">Budget</p><p className="font-bold text-navy-900">{engineer.budget_adherence_pct}%</p></div>
              <div className="bg-navy-50 rounded-lg p-2"><p className="text-xs muted">Quality</p><p className="font-bold text-navy-900">{engineer.quality_score}</p></div>
            </div>
          </div>
        </div>

        {/* Active project milestones */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4"><TrendingUp className="w-5 h-5 text-royal-600" /><h2 className="text-lg font-bold text-navy-900">Active Project Milestones</h2></div>
          {milestones.length === 0 ? <p className="text-sm muted">No active projects.</p> : (
            <div className="space-y-2">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-3 border border-navy-100 rounded-xl p-3">
                  <MilestoneIcon status={m.status} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-navy-900">{m.name}</p>
                    <p className="text-xs muted">Planned: {formatDate(m.planned_date)}</p>
                  </div>
                  <Badge variant={m.status === 'completed' ? 'success' : m.status === 'in_progress' ? 'royal' : 'navy'}>{m.status.replace('_', ' ')}</Badge>
                </div>
              ))}
            </div>
          )}
          {milestones.some((m) => m.status === 'in_progress') && (
            <button className="btn-secondary text-sm w-full mt-3"><Camera className="w-4 h-4" /> Upload Progress Evidence</button>
          )}
        </div>

        {/* Payment status */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4"><Wallet className="w-5 h-5 text-emerald-600" /><h2 className="text-lg font-bold text-navy-900">Payment Status</h2></div>
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm border-b border-navy-50 py-2">
                <span className="text-navy-700">{p.milestone_name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-navy-900">{formatINR(p.amount)}</span>
                  <Badge variant={p.status === 'paid' ? 'success' : 'warning'}>{p.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent reviews */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4"><Star className="w-5 h-5 text-amber-400" /><h2 className="text-lg font-bold text-navy-900">Recent Reviews</h2></div>
          {reviews.length === 0 ? <p className="text-sm muted">No reviews yet.</p> : (
            <div className="space-y-3">
              {reviews.slice(0, 3).map((r) => (
                <div key={r.id} className="border border-navy-100 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-navy-900">{r.homeowner_name}</p>
                    <RatingStars rating={r.rating} size="xs" />
                  </div>
                  {r.verified && <Badge variant="verified"><ShieldCheck className="w-3 h-3" /> Verified</Badge>}
                  <p className="text-xs text-navy-600 mt-1 line-clamp-2">{r.feedback}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link to="/app/messages" className="card p-5 card-hover group">
          <div className="w-10 h-10 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center mb-3 group-hover:bg-royal-50 group-hover:text-royal-700 transition-colors"><MessageSquare className="w-5 h-5" /></div>
          <p className="font-semibold text-navy-900">Customer Messages</p><p className="text-sm muted">View and respond to homeowner messages</p>
        </Link>
        <Link to="/app/projects" className="card p-5 card-hover group">
          <div className="w-10 h-10 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center mb-3 group-hover:bg-royal-50 group-hover:text-royal-700 transition-colors"><FolderKanban className="w-5 h-5" /></div>
          <p className="font-semibold text-navy-900">My Projects</p><p className="text-sm muted">Manage all assigned projects</p>
        </Link>
        <Link to="/app/reviews" className="card p-5 card-hover group">
          <div className="w-10 h-10 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center mb-3 group-hover:bg-royal-50 group-hover:text-royal-700 transition-colors"><Star className="w-5 h-5" /></div>
          <p className="font-semibold text-navy-900">All Reviews</p><p className="text-sm muted">View all verified project reviews</p>
        </Link>
      </div>
    </div>
  );
}
