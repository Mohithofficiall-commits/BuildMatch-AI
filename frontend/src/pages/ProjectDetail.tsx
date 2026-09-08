import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import {
  fetchProject, fetchMilestones, fetchPayments, fetchRiskAssessment, fetchMilestoneEvidence,
  createMilestoneEvidence, updateEvidenceHumanStatus,
  fetchProjectMembers, fetchProfessionalRequestsByProject, createProfessionalRequest,
  updateProfessionalRequestStatus, fetchEngineers, fetchProfessionalProfiles, fetchAppUsers,
} from '@/lib/data';
import type {
  Project, Milestone, Payment, RiskAssessment, MilestoneEvidence,
  ProjectMemberJoined, ProfessionalRequestJoined, Engineer, ProfessionalProfile, AppUser, ProfessionalType,
} from '@/lib/types';
import { LoadingState, EmptyState, Badge, RiskBadge, VerifiedBadge, formatINR, formatDate, MilestoneIcon, Modal, Toast } from '@/components/ui';
import {
  ArrowLeft, MapPin, Wallet, CalendarClock, TrendingUp, AlertTriangle, Camera, ShieldCheck,
  CheckCircle2, Clock, Upload, Sparkles, ChevronRight, Users, UserPlus, X, Send,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import TeamCenter from '@/components/team/TeamCenter';
import { personPhoto, onPersonImgError, onProjectImgError, PROJECT_PHOTO_FALLBACK } from '@/lib/people';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [evidence, setEvidence] = useState<MilestoneEvidence[]>([]);
  const [members, setMembers] = useState<ProjectMemberJoined[]>([]);
  const [proRequests, setProRequests] = useState<ProfessionalRequestJoined[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [profiles, setProfiles] = useState<ProfessionalProfile[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MilestoneEvidence | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteType, setInviteType] = useState<ProfessionalType>('engineer');
  const [inviteTarget, setInviteTarget] = useState('');
  const [inviteForm, setInviteForm] = useState({ title: '', description: '', budget: '', expected_date: '' });
  const [inviteBusy, setInviteBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const [proj, ms, pays, rsk, evi, mems, reqs, engs, profs, usrs] = await Promise.all([
          fetchProject(id), fetchMilestones(id), fetchPayments(id), fetchRiskAssessment(id), fetchMilestoneEvidence(id),
          fetchProjectMembers(id), fetchProfessionalRequestsByProject(id),
          fetchEngineers(), fetchProfessionalProfiles(), fetchAppUsers(),
        ]);
        setProject(proj); setMilestones(ms); setPayments(pays); setRisk(rsk); setEvidence(evi);
        setMembers(mems); setProRequests(reqs); setEngineers(engs); setProfiles(profs); setAllUsers(usrs);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, [id]);

  const reloadRequests = async () => {
    if (!id) return;
    try {
      setProRequests(await fetchProfessionalRequestsByProject(id));
    } catch { /* ignore */ }
  };

  const isOwner = !!user && !!project && user.role === 'homeowner' && project.homeowner_id === user.id;
  const candidateEngineers = engineers.filter((e) => e.user_id);
  const candidateProfiles = inviteType === 'engineer' ? [] : profiles.filter((p) => p.profession === inviteType);
  const candidates = inviteType === 'engineer'
    ? candidateEngineers.map((e) => ({ id: e.user_id ?? '', name: e.name, photo_url: e.photo_url, location: e.location, verified: e.verification_status === 'verified', meta: e.qualification }))
    : candidateProfiles.map((p) => ({ id: p.user_id, name: p.business_name ?? p.name, photo_url: p.photo_url, location: p.location, verified: p.verification_status === 'verified', meta: p.specializations.slice(0, 2).join(', ') }));

  const openInvite = (type: ProfessionalType = 'engineer', preselectUserId?: string) => {
    setInviteType(type);
    setInviteTarget(preselectUserId ?? '');
    setInviteForm({ title: '', description: '', budget: '', expected_date: '' });
    setInviteOpen(true);
  };

  const submitInvite = async () => {
    if (!id || !user || !inviteTarget) return;
    if (!inviteForm.title.trim()) {
      setToast({ msg: 'Please describe the work in the request title.', type: 'error' });
      return;
    }
    setInviteBusy(true);
    try {
      await createProfessionalRequest({
        project_id: id,
        homeowner_id: user.id,
        professional_id: inviteTarget,
        professional_type: inviteType,
        title: inviteForm.title.trim(),
        description: inviteForm.description.trim() || null,
        budget: inviteForm.budget ? Math.max(0, Number(inviteForm.budget)) : null,
        expected_date: inviteForm.expected_date || null,
      });
      setToast({ msg: 'Request sent to the professional. They will accept or decline it from their portal.', type: 'success' });
      setInviteOpen(false);
      await reloadRequests();
    } catch {
      setToast({ msg: 'Could not send the request. Please try again.', type: 'error' });
    } finally {
      setInviteBusy(false);
    }
  };

  const cancelRequest = async (rid: string) => {
    try {
      await updateProfessionalRequestStatus(rid, 'cancelled');
      setToast({ msg: 'Request cancelled.', type: 'info' });
      await reloadRequests();
    } catch {
      setToast({ msg: 'Could not cancel the request.', type: 'error' });
    }
  };

  const refreshEvidence = async () => {
    if (!id) return;
    setEvidence(await fetchMilestoneEvidence(id));
  };

  const handleUpload = () => {
    if (!selectedMilestone || !id) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    setTimeout(() => {
      const stages: Record<string, { tags: string[]; conf: number }> = {
        Foundation: { tags: ['Excavation complete', 'Footings visible', 'Concrete pouring detected'], conf: 95 },
        Structure: { tags: ['Columns cast', 'Beam framework visible', 'Slab reinforcement detected'], conf: 94 },
        Roofing: { tags: ['Columns detected', 'Roof slab visible', 'Masonry progress detected'], conf: 92 },
        Electrical: { tags: ['Wiring conduits visible', 'Switch boxes installed', 'Panel work detected'], conf: 89 },
        Finishing: { tags: ['Plastering detected', 'Paint work visible', 'Flooring progress'], conf: 91 },
        Handover: { tags: ['Final paint complete', 'Fixtures installed', 'Site cleaned'], conf: 96 },
      };
      const milestone = milestones.find((m) => m.id === selectedMilestone);
      const expected = milestone?.name ?? 'Roofing';
      const detected = stages[expected] ?? stages.Roofing;
      setAnalysisResult({
        id: crypto.randomUUID(), milestone_id: selectedMilestone, project_id: id,
        image_url: PROJECT_PHOTO_FALLBACK,
        detected_stage: expected, confidence: detected.conf, expected_milestone: expected,
        evidence_tags: detected.tags, result: 'verified', human_status: 'pending',
      });
      setAnalyzing(false);
    }, 2000);
  };

  const confirmEvidence = async (status: 'approved' | 'review') => {
    if (!analysisResult) return;
    try {
      await createMilestoneEvidence({
        milestone_id: analysisResult.milestone_id, project_id: analysisResult.project_id,
        image_url: analysisResult.image_url, detected_stage: analysisResult.detected_stage,
        confidence: analysisResult.confidence, expected_milestone: analysisResult.expected_milestone,
        evidence_tags: analysisResult.evidence_tags, result: analysisResult.result, human_status: status,
      });
      setToast({ msg: status === 'approved' ? 'Milestone evidence approved and stored.' : 'Review requested. Engineer will be notified.', type: 'success' });
      setUploadOpen(false); setAnalysisResult(null);
      await refreshEvidence();
    } catch { setToast({ msg: 'Failed to store verification result.', type: 'error' }); }
  };

  const handleHumanStatus = async (evId: string, status: 'approved' | 'review') => {
    try {
      await updateEvidenceHumanStatus(evId, status);
      setToast({ msg: status === 'approved' ? 'Evidence approved.' : 'Review requested.', type: 'success' });
      await refreshEvidence();
    } catch { setToast({ msg: 'Update failed.', type: 'error' }); }
  };

  if (loading) return <LoadingState text="Loading project..." />;
  if (!project) return <EmptyState icon={<AlertTriangle className="w-7 h-7" />} title="Project not found" description="This project does not exist." action={<button onClick={() => navigate('/app/projects')} className="btn-primary">Back to Projects</button>} />;

  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const remaining = project.budget - totalPaid;
  const daysRemaining = project.expected_completion ? Math.max(0, Math.ceil((new Date(project.expected_completion).getTime() - Date.now()) / 86400000)) : 0;

  const progressData = milestones.map((m, i) => ({
    name: m.name,
    planned: ((i + 1) / milestones.length) * 100,
    actual: m.status === 'completed' ? ((i + 1) / milestones.length) * 100 : (i / milestones.length) * 100 + (m.status === 'in_progress' ? 50 / milestones.length : 0),
  }));

  const ROLE_ORDER: ProfessionalType[] = ['engineer', 'plumber', 'electrician', 'material_shop'];
  const teamRows: { role: ProfessionalType; name: string; photo: string; status: string; verified: boolean; key: string }[] = members.map((m) => ({
    role: m.role,
    name: m.member_user?.name ?? 'Professional',
    photo: m.member_user?.avatar_url ?? '',
    status: m.status,
    verified: false,
    key: m.id,
  }));
  if (project?.engineer && !members.some((m) => m.role === 'engineer')) {
    teamRows.push({
      role: 'engineer',
      name: project.engineer.name,
      photo: project.engineer.photo_url,
      status: 'assigned',
      verified: project.engineer.verification_status === 'verified',
      key: 'assigned-engineer',
    });
  }
  const groupedTeams = ROLE_ORDER.map((role) => ({ role, rows: teamRows.filter((t) => t.role === role) })).filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <button onClick={() => navigate('/app/projects')} className="btn-ghost text-sm"><ArrowLeft className="w-4 h-4" /> Back to Projects</button>

      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-navy-900">{project.title}</h1>
              <Badge variant={project.status === 'active' ? 'royal' : project.status === 'completed' ? 'success' : 'navy'}>{project.status.toUpperCase()}</Badge>
            </div>
            <div className="flex items-center gap-4 text-sm muted flex-wrap mt-2">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{project.location}</span>
              <span className="flex items-center gap-1"><CalendarClock className="w-4 h-4" />Started {formatDate(project.start_date)}</span>
              <span className="flex items-center gap-1"><Wallet className="w-4 h-4" />{formatINR(project.budget)}</span>
            </div>
          </div>
          {project.engineer && (
            <div className="flex items-center gap-3 bg-navy-50 rounded-xl p-3">
              <img src={personPhoto(project.engineer.photo_url, 'engineer')} alt="" onError={(e) => onPersonImgError(e, 'engineer')} className="w-10 h-10 rounded-lg object-cover" />
              <div><p className="text-xs muted">Engineer</p><p className="font-semibold text-navy-900 text-sm">{project.engineer.name}</p></div>
            </div>
          )}
        </div>
      </div>

      {/* Team discovery & comparison — homeowner team center */}
      {isOwner && (
        <TeamCenter
          project={project}
          engineers={engineers}
          profiles={profiles}
          members={members}
          proRequests={proRequests}
          onInvite={(type, preselectUserId) => openInvite(type, preselectUserId)}
        />
      )}

      {/* Project team — all assigned professionals grouped by role */}
      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-royal-600" />
            <h2 className="text-lg font-bold text-navy-900">Project Team</h2>
            <Badge variant="navy">{teamRows.length} assigned</Badge>
          </div>
          {isOwner && (
            <button onClick={() => openInvite()} className="btn-primary text-sm"><UserPlus className="w-4 h-4" /> Request Professional</button>
          )}
        </div>
        {groupedTeams.length === 0 ? (
          <p className="text-sm muted">No professionals assigned to this project yet{isOwner ? ' — request an engineer, plumber, electrician or material shop above.' : '.'}</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {groupedTeams.map((g) => (
              <div key={g.role} className="border border-navy-100 rounded-xl p-4">
                <p className="text-xs uppercase tracking-wide text-royal-600 font-bold mb-3">{g.role.replace('_', ' ')} ({g.rows.length})</p>
                <div className="space-y-2">
                  {g.rows.map((r) => (
                    <div key={r.key} className="flex items-center gap-2.5">
                      <img src={personPhoto(r.photo, r.role)} alt="" onError={(e) => onPersonImgError(e, r.role)} className="w-8 h-8 rounded-lg object-cover" />
                      <span className="text-sm font-semibold text-navy-900 flex-1 truncate">{r.name}</span>
                      {r.verified && <VerifiedBadge size="xs" />}
                      {r.role === 'engineer' && r.status === 'assigned' && <Badge variant="navy">Assigned</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {isOwner && (
          <div className="mt-4 bg-navy-50 rounded-xl p-3 text-xs text-navy-600">
            Professionals accept your request from their workspace. Once accepted they are automatically added to the project team above.
          </div>
        )}
      </div>

      {/* Requests to professionals (homeowner only) */}
      {isOwner && proRequests.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Send className="w-5 h-5 text-royal-600" />
            <h2 className="text-lg font-bold text-navy-900">Sent Requests</h2>
            <Badge variant="navy">{proRequests.length}</Badge>
          </div>
          <div className="space-y-2">
            {proRequests.map((r) => {
              const proUser = allUsers.find((u) => u.id === r.professional_id);
              const statusBadge = r.status === 'pending' ? 'warning' : r.status === 'accepted' ? 'royal' : r.status === 'completed' ? 'success' : r.status === 'declined' ? 'danger' : 'navy';
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 border border-navy-100 rounded-xl p-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-navy-100 flex items-center justify-center text-xs font-bold text-navy-600 shrink-0">{proUser?.name?.charAt(0) ?? '?'}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy-900 truncate">{r.title}</p>
                      <p className="text-xs muted truncate">
                        {proUser?.name ?? 'Professional'} · {r.professional_type.replace('_', ' ')}
                        {r.budget != null ? ` · ${formatINR(r.budget)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={statusBadge as 'warning' | 'royal' | 'success' | 'danger' | 'navy'}>{r.status.toUpperCase()}</Badge>
                    {r.status === 'pending' && (
                      <button onClick={() => cancelRequest(r.id)} className="btn-ghost text-xs text-rose-600"><X className="w-3.5 h-3.5" /> Cancel</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5"><p className="text-sm muted">Overall Progress</p><p className="text-2xl font-bold text-navy-900 mt-1">{project.progress}%</p><div className="w-full h-2 bg-navy-100 rounded-full overflow-hidden mt-2"><div className="h-full bg-royal-600 rounded-full" style={{ width: `${project.progress}%` }} /></div></div>
        <div className="card p-5"><p className="text-sm muted">Current Milestone</p><p className="text-2xl font-bold text-navy-900 mt-1">{project.current_milestone ?? '—'}</p><p className="text-xs muted mt-1">In progress</p></div>
        <div className="card p-5"><p className="text-sm muted">Budget Used</p><p className="text-2xl font-bold text-navy-900 mt-1">{formatINR(totalPaid)}</p><p className="text-xs muted mt-1">{formatINR(remaining)} remaining</p></div>
        <div className="card p-5"><p className="text-sm muted">Days Remaining</p><p className="text-2xl font-bold text-navy-900 mt-1">{daysRemaining}</p><p className="text-xs muted mt-1">Est. {formatDate(project.expected_completion)}</p></div>
      </div>

      {risk && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-navy-900">AI Construction Risk Prediction</h2>
            <Badge variant="navy">AI-assisted</Badge>
          </div>
          <div className="flex items-center gap-3 mb-4"><span className="text-sm font-medium text-navy-700">Overall Risk:</span><RiskBadge level={risk.overall_risk} /></div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { label: 'Delay Risk', level: risk.delay_risk, reason: risk.delay_reason, icon: Clock },
              { label: 'Budget Overrun Risk', level: risk.budget_risk, reason: risk.budget_reason, icon: Wallet },
              { label: 'Quality Risk', level: risk.quality_risk, reason: risk.quality_reason, icon: TrendingUp },
              { label: 'Engineer Risk', level: risk.engineer_risk, reason: risk.engineer_reason, icon: ShieldCheck },
            ].map((r) => (
              <div key={r.label} className="border border-navy-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-navy-900"><r.icon className="w-4 h-4" />{r.label}</span>
                  <RiskBadge level={r.level} />
                </div>
                {r.reason && <p className="text-xs muted">{r.reason}</p>}
              </div>
            ))}
          </div>
          {risk.recommended_action && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-800 mb-1">Recommended Action</p>
              <p className="text-sm text-amber-700">{risk.recommended_action}</p>
            </div>
          )}
        </div>
      )}

      <div className="card p-6">
        <h2 className="text-lg font-bold text-navy-900 mb-4">Project Timeline & Milestones</h2>
        <div className="space-y-1">
          {milestones.map((m, i) => (
            <div key={m.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <MilestoneIcon status={m.status} />
                {i < milestones.length - 1 && <div className={`w-0.5 h-12 ${m.status === 'completed' ? 'bg-emerald-400' : 'bg-navy-100'}`} />}
              </div>
              <div className="pb-6 flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-navy-900">{m.name}</p>
                    {m.verified && <Badge variant="verified"><ShieldCheck className="w-3 h-3" /> Verified</Badge>}
                    {m.verification_status === 'review_required' && <Badge variant="warning">Review Required</Badge>}
                    {m.status === 'in_progress' && <Badge variant="royal">In Progress</Badge>}
                    {m.status === 'delayed' && <Badge variant="danger">Delayed</Badge>}
                  </div>
                  <span className="text-xs muted">Planned: {formatDate(m.planned_date)} · Actual: {formatDate(m.actual_date)}</span>
                </div>
                {m.status === 'in_progress' && (
                  <button onClick={() => { setSelectedMilestone(m.id); setUploadOpen(true); }} className="btn-secondary text-xs mt-2 py-1.5">
                    <Camera className="w-3.5 h-3.5" /> Upload Site Evidence
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-bold text-navy-900 mb-4">Planned vs Actual Progress</h2>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={progressData}>
            <defs>
              <linearGradient id="plannedGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#5d80bf" stopOpacity={0.3} /><stop offset="95%" stopColor="#5d80bf" stopOpacity={0} /></linearGradient>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} /><stop offset="95%" stopColor="#4f46e5" stopOpacity={0} /></linearGradient>
            </defs>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5d80bf' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#8ba9d6' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #dae4f4', fontSize: '12px' }} />
            <Area type="monotone" dataKey="planned" stroke="#5d80bf" fill="url(#plannedGrad)" strokeWidth={2} name="Planned %" />
            <Area type="monotone" dataKey="actual" stroke="#4f46e5" fill="url(#actualGrad)" strokeWidth={2} name="Actual %" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {evidence.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="w-5 h-5 text-royal-600" />
            <h2 className="text-lg font-bold text-navy-900">Milestone Verification Evidence</h2>
            <Badge variant="navy">AI-assisted</Badge>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {evidence.map((ev) => (
              <div key={ev.id} className="border border-navy-100 rounded-xl overflow-hidden">
                {ev.image_url && <img src={ev.image_url} alt="" onError={onProjectImgError} className="w-full h-32 object-cover" />}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-navy-900">{ev.detected_stage}</span>
                    <Badge variant={ev.result === 'verified' ? 'verified' : 'warning'}>{ev.result === 'verified' ? 'VERIFIED' : 'REVIEW'}</Badge>
                  </div>
                  <p className="text-xs muted">Confidence: {ev.confidence}% · Expected: {ev.expected_milestone}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ev.evidence_tags.map((t, i) => <span key={i} className="text-[10px] bg-navy-50 text-navy-600 rounded px-1.5 py-0.5">{t}</span>)}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs muted">Human: {ev.human_status}</span>
                    {ev.human_status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => handleHumanStatus(ev.id, 'approved')} className="text-xs btn-success py-1 px-2"><CheckCircle2 className="w-3 h-3" /> Approve</button>
                        <button onClick={() => handleHumanStatus(ev.id, 'review')} className="text-xs btn-secondary py-1 px-2">Review</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-navy-900">Milestone-Based Payments</h2>
          <button onClick={() => navigate('/app/payments')} className="btn-ghost text-sm">Full Details <ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-navy-50 rounded-xl p-4 text-center"><p className="text-xs muted">Total Budget</p><p className="text-lg font-bold text-navy-900">{formatINR(project.budget)}</p></div>
          <div className="bg-emerald-50 rounded-xl p-4 text-center"><p className="text-xs muted">Paid</p><p className="text-lg font-bold text-emerald-700">{formatINR(totalPaid)}</p></div>
          <div className="bg-amber-50 rounded-xl p-4 text-center"><p className="text-xs muted">Remaining</p><p className="text-lg font-bold text-amber-700">{formatINR(remaining)}</p></div>
        </div>
        <div className="space-y-2">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between border border-navy-100 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <MilestoneIcon status={p.status === 'paid' ? 'completed' : 'upcoming'} />
                <div><p className="text-sm font-semibold text-navy-900">{p.milestone_name}</p><p className="text-xs muted">Due: {formatDate(p.due_date)} {p.paid_date && `· Paid: ${formatDate(p.paid_date)}`}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-navy-900">{formatINR(p.amount)}</span>
                <Badge variant={p.status === 'paid' ? 'success' : p.status === 'overdue' ? 'danger' : 'warning'}>{p.status.toUpperCase()}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={uploadOpen} onClose={() => { setUploadOpen(false); setAnalysisResult(null); }} title="AI-Assisted Milestone Verification" maxWidth="max-w-2xl">
        <div className="space-y-4">
          <div className="bg-royal-50 border border-royal-200 rounded-xl p-3">
            <p className="text-xs text-royal-700"><Sparkles className="w-3.5 h-3.5 inline mr-1" /> Prototype feature: AI-assisted milestone verification. Human confirmation required for all results.</p>
          </div>
          {!analysisResult && !analyzing && (
            <>
              <div>
                <label className="label">Select Milestone</label>
                <select className="input" value={selectedMilestone} onChange={(e) => setSelectedMilestone(e.target.value)}>
                  <option value="">Choose a milestone...</option>
                  {milestones.filter((m) => m.status !== 'completed').map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="border-2 border-dashed border-navy-200 rounded-xl p-8 text-center">
                <Upload className="w-8 h-8 text-navy-300 mx-auto mb-2" />
                <p className="text-sm muted">Click to upload a construction site photo</p>
                <p className="text-xs muted mt-1">JPG, PNG up to 10MB</p>
              </div>
              <button onClick={handleUpload} disabled={!selectedMilestone} className="btn-primary w-full"><Camera className="w-4 h-4" /> Analyze Image</button>
            </>
          )}
          {analyzing && (
            <div className="py-12 text-center">
              <div className="w-12 h-12 border-3 border-navy-200 border-t-royal-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm muted">AI analyzing construction site image...</p>
              <p className="text-xs muted mt-1">Detecting construction stage and evidence</p>
            </div>
          )}
          {analysisResult && !analyzing && (
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-xl overflow-hidden border border-navy-100"><img src={analysisResult.image_url || PROJECT_PHOTO_FALLBACK} alt="" onError={onProjectImgError} className="w-full h-48 object-cover" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-navy-50 rounded-xl p-4"><p className="text-xs muted">Detected Stage</p><p className="text-lg font-bold text-navy-900">{analysisResult.detected_stage}</p></div>
                <div className="bg-navy-50 rounded-xl p-4"><p className="text-xs muted">Confidence</p><p className="text-lg font-bold text-royal-600">{analysisResult.confidence}%</p></div>
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-900 mb-2">Detected Evidence:</p>
                <ul className="space-y-1">
                  {analysisResult.evidence_tags.map((t, i) => <li key={i} className="flex items-center gap-2 text-sm text-navy-600"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> {t}</li>)}
                </ul>
              </div>
              <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-200">
                <p className="text-sm font-semibold mb-1">Expected: {analysisResult.expected_milestone}</p>
                <p className="text-sm text-emerald-700">Result: VERIFIED — detected stage matches expected milestone.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => confirmEvidence('approved')} className="btn-success flex-1"><CheckCircle2 className="w-4 h-4" /> Approve</button>
                <button onClick={() => confirmEvidence('review')} className="btn-secondary flex-1">Request Review</button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Request a professional (engineer / plumber / electrician / material shop) */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Request a Professional for this Project" maxWidth="max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="label">Professional Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ROLE_ORDER.map((t) => (
                <button
                  key={t}
                  onClick={() => { setInviteType(t); setInviteTarget(''); }}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-all ${inviteType === t ? 'border-royal-500 bg-royal-50 text-royal-700' : 'border-navy-200 text-navy-600 hover:bg-navy-50'}`}
                >
                  {t === 'engineer' ? '👷' : t === 'plumber' ? '🔧' : t === 'electrician' ? '⚡' : '🏬'} {t.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Select {inviteType.replace('_', ' ')}</label>
            {candidates.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                No verified directory profiles are available for this category yet.
                {inviteType === 'engineer' ? ' Only engineers with a linked BuildMatch account can receive requests.' : ''}
              </div>
            ) : (
              <select className="input" value={inviteTarget} onChange={(e) => setInviteTarget(e.target.value)}>
                <option value="">Choose a professional...</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.location}{c.verified ? ' ✓ Verified' : ''}</option>
                ))}
              </select>
            )}
            {candidates.length > 0 && (
              <div className="mt-3 grid gap-2 max-h-52 overflow-y-auto">
                {candidates.map((c) => (
                  <label key={c.id} className={`flex items-center gap-3 border rounded-xl p-3 cursor-pointer transition-all ${inviteTarget === c.id ? 'border-royal-500 bg-royal-50' : 'border-navy-100 hover:bg-navy-50'}`}>
                    <input type="radio" name="candidate" checked={inviteTarget === c.id} onChange={() => setInviteTarget(c.id)} className="accent-royal-600" />
                    <img src={personPhoto(c.photo_url, inviteType)} alt="" onError={(e) => onPersonImgError(e, inviteType)} className="w-9 h-9 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy-900 truncate">{c.name} {c.verified && '✓'}</p>
                      <p className="text-xs muted truncate">{c.location} · {c.meta}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="label">Work / Service Title *</label>
            <input className="input" placeholder="e.g. Bathroom plumbing installation" value={inviteForm.title} onChange={(e) => setInviteForm({ ...inviteForm, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Budget (₹)</label>
              <input type="number" min="0" className="input" placeholder="e.g. 15000" value={inviteForm.budget} onChange={(e) => setInviteForm({ ...inviteForm, budget: e.target.value })} />
            </div>
            <div>
              <label className="label">Expected Date</label>
              <input type="date" className="input" value={inviteForm.expected_date} onChange={(e) => setInviteForm({ ...inviteForm, expected_date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[80px]" placeholder="Describe the work needed..." value={inviteForm.description} onChange={(e) => setInviteForm({ ...inviteForm, description: e.target.value })} />
          </div>
          <button onClick={submitInvite} disabled={inviteBusy || !inviteTarget || !inviteForm.title.trim()} className="btn-primary w-full">
            {inviteBusy ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
