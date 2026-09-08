import { useState, useEffect } from 'react';
import {
  fetchEngineers, updateEngineerVerification, fetchComplaints, fetchProjects, fetchMilestoneEvidence,
  fetchVerificationRequestsDetailed, fetchCertificatesByRequest, updateVerificationRequestStatus,
  updateEngineerVerificationByUserId, updateProfessionalVerification,
} from '@/lib/data';
import type { Engineer, Complaint, Project, MilestoneEvidence, VerificationRequestJoined, Certificate } from '@/lib/types';
import { LoadingState, Badge, Toast, formatDate } from '@/components/ui';
import { verificationStatus } from '@/components/professional/statuses';
import { ShieldCheck, AlertTriangle, Camera, Star, CheckCircle2, XCircle, FileText, FolderKanban, Award, Send } from 'lucide-react';
import { personPhoto, onPersonImgError, onProjectImgError } from '@/lib/people';

export default function AdminDashboard() {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [evidence, setEvidence] = useState<MilestoneEvidence[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequestJoined[]>([]);
  const [certsByRequest, setCertsByRequest] = useState<Record<string, Certificate[]>>({});
  const [rejecting, setRejecting] = useState<{ id: string; reason: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [tab, setTab] = useState<'verification' | 'certRequests' | 'complaints' | 'flagged' | 'risk'>('verification');

  useEffect(() => {
    (async () => {
      try {
        const [engs, comps, projs] = await Promise.all([fetchEngineers(), fetchComplaints(), fetchProjects()]);
        setEngineers(engs); setComplaints(comps); setProjects(projs);
        const allEvidence: MilestoneEvidence[] = [];
        for (const p of projs) { try { const evi = await fetchMilestoneEvidence(p.id); allEvidence.push(...evi); } catch { /* ignore */ } }
        setEvidence(allEvidence);
        const vrs = await fetchVerificationRequestsDetailed().catch(() => []);
        setVerificationRequests(vrs);
        const certMap: Record<string, Certificate[]> = {};
        for (const vr of vrs) certMap[vr.id] = await fetchCertificatesByRequest(vr.id).catch(() => []);
        setCertsByRequest(certMap);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  const handleVerify = async (id: string, status: Engineer['verification_status']) => {
    try {
      await updateEngineerVerification(id, status);
      setToast(`Engineer ${status === 'verified' ? 'verified' : status === 'rejected' ? 'rejected' : 'info requested'}.`);
      setEngineers(await fetchEngineers());
    } catch { setToast('Action failed.'); }
  };

  if (loading) return <LoadingState text="Loading admin dashboard..." />;

  const handleVerificationRequest = async (vr: VerificationRequestJoined, status: 'verified' | 'rejected', reason?: string) => {
    try {
      await updateVerificationRequestStatus(vr.id, status, 'a1000000-0000-0000-0000-000000000002', reason);
      // Keep the professional's profile badge in sync so the UI only shows
      // Verified when the database status is verified.
      if (vr.professional_type === 'engineer') {
        await updateEngineerVerificationByUserId(vr.user_id, status).catch(() => { /* engineer row may not exist yet */ });
      } else {
        await updateProfessionalVerification(vr.user_id, status).catch(() => { /* profile row may not exist yet */ });
      }
      setToast(status === 'verified' ? 'Verification approved — professional now shows the Verified badge.' : 'Verification request rejected.');
      setRejecting(null);
      const vrs = await fetchVerificationRequestsDetailed();
      setVerificationRequests(vrs);
      const certMap: Record<string, Certificate[]> = {};
      for (const v of vrs) certMap[v.id] = await fetchCertificatesByRequest(v.id).catch(() => []);
      setCertsByRequest(certMap);
    } catch {
      setToast('Action failed. Please try again.');
    }
  };

  const pendingEngineers = engineers.filter((e) => e.verification_status === 'pending');
  const pendingCertRequests = verificationRequests.filter((v) => v.status === 'pending');
  const flaggedEvidence = evidence.filter((e) => e.human_status === 'pending' || e.result === 'review_required');
  const highRiskProjects = projects.filter((p) => p.status === 'active' && p.progress < 50);
  const suspiciousReviews = engineers.filter((e) => e.rating >= 4.8 && e.reviews_count < 20);

  const tabs = [
    { key: 'verification' as const, label: 'Engineer Profiles', count: pendingEngineers.length, icon: ShieldCheck },
    { key: 'certRequests' as const, label: 'Verification Requests', count: pendingCertRequests.length, icon: Award },
    { key: 'complaints' as const, label: 'Complaints', count: complaints.length, icon: AlertTriangle },
    { key: 'flagged' as const, label: 'Flagged Milestones', count: flaggedEvidence.length, icon: Camera },
    { key: 'risk' as const, label: 'High-Risk Projects', count: highRiskProjects.length, icon: FolderKanban },
  ];

  return (
    <div className="space-y-6 animate-fade-in p-4 lg:p-8">
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}

      <div>
        <h1 className="text-2xl font-bold text-navy-900">Admin Verification Dashboard</h1>
        <p className="muted mt-1">Verify engineers, review complaints, and monitor flagged content</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-sm muted">Pending Verifications</p><p className="text-2xl font-bold text-navy-900 mt-1">{pendingEngineers.length}</p></div><div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div></div></div>
        <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-sm muted">Open Complaints</p><p className="text-2xl font-bold text-navy-900 mt-1">{complaints.filter((c) => c.status !== 'resolved').length}</p></div><div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></div></div></div>
        <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-sm muted">Flagged Milestones</p><p className="text-2xl font-bold text-navy-900 mt-1">{flaggedEvidence.length}</p></div><div className="w-10 h-10 rounded-xl bg-royal-50 text-royal-600 flex items-center justify-center"><Camera className="w-5 h-5" /></div></div></div>
        <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-sm muted">High-Risk Projects</p><p className="text-2xl font-bold text-navy-900 mt-1">{highRiskProjects.length}</p></div><div className="w-10 h-10 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center"><FolderKanban className="w-5 h-5" /></div></div></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn text-sm ${tab === t.key ? 'bg-navy-900 text-white' : 'btn-secondary'}`}>
            <t.icon className="w-4 h-4" /> {t.label} <span className="ml-1 text-xs opacity-70">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'verification' && (
        <div className="space-y-4">
          {pendingEngineers.length === 0 ? (
            <div className="card p-8 text-center"><CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" /><p className="font-semibold text-navy-900">All engineers verified</p><p className="text-sm muted">No pending verifications.</p></div>
          ) : (
            pendingEngineers.map((e) => (
              <div key={e.id} className="card p-5">
                <div className="flex items-start gap-4 flex-wrap">
                  <img src={personPhoto(e.photo_url, 'engineer')} alt={e.name} onError={(e) => onPersonImgError(e, 'engineer')} className="w-14 h-14 rounded-xl object-cover" />
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-semibold text-navy-900">{e.name}</p>
                    <p className="text-xs muted">{e.qualification}</p>
                    <p className="text-xs muted">{e.location} · {e.experience_years} yrs · {e.projects_completed} projects</p>
                    <div className="flex flex-wrap gap-1 mt-2">{e.specializations.map((s) => <Badge key={s} variant="navy">{s}</Badge>)}</div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs muted">Identity</p>
                    <Badge variant={e.identity_verified ? 'verified' : 'warning'}>{e.identity_verified ? 'Verified' : 'Pending'}</Badge>
                    <p className="text-xs muted mt-2">Credentials</p>
                    <Badge variant={e.credential_verified ? 'verified' : 'warning'}>{e.credential_verified ? 'Verified' : 'Pending'}</Badge>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-navy-100">
                  <button onClick={() => handleVerify(e.id, 'verified')} className="btn-success text-sm"><CheckCircle2 className="w-4 h-4" /> Verify</button>
                  <button onClick={() => handleVerify(e.id, 'rejected')} className="btn-secondary text-sm"><XCircle className="w-4 h-4" /> Reject</button>
                  <button onClick={() => handleVerify(e.id, 'pending')} className="btn-secondary text-sm"><FileText className="w-4 h-4" /> Request Info</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'complaints' && (
        <div className="space-y-4">
          {complaints.length === 0 ? <div className="card p-8 text-center"><p className="text-sm muted">No complaints filed.</p></div> : (
            complaints.map((c) => (
              <div key={c.id} className="card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="navy">{c.category}</Badge>
                  <Badge variant={c.status === 'open' ? 'danger' : c.status === 'under_review' ? 'warning' : 'success'}>{c.status.replace('_', ' ').toUpperCase()}</Badge>
                </div>
                <h3 className="font-semibold text-navy-900">{c.subject}</h3>
                <p className="text-xs muted mt-0.5">By {c.homeowner_name} · {formatDate(c.created_at)}</p>
                <p className="text-sm text-navy-600 mt-2">{c.description}</p>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'flagged' && (
        <div className="space-y-4">
          {flaggedEvidence.length === 0 ? <div className="card p-8 text-center"><p className="text-sm muted">No flagged milestones.</p></div> : (
            flaggedEvidence.map((ev) => (
              <div key={ev.id} className="card p-5 flex items-start gap-4">
                {ev.image_url && <img src={ev.image_url} alt="" onError={onProjectImgError} className="w-20 h-20 rounded-lg object-cover" />}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={ev.result === 'verified' ? 'verified' : 'warning'}>{ev.result === 'verified' ? 'VERIFIED' : 'REVIEW REQUIRED'}</Badge>
                    <Badge variant="navy">Human: {ev.human_status}</Badge>
                  </div>
                  <p className="text-sm font-semibold text-navy-900">{ev.detected_stage} · {ev.confidence}% confidence</p>
                  <p className="text-xs muted">Expected: {ev.expected_milestone}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'risk' && (
        <div className="space-y-4">
          {highRiskProjects.length === 0 ? <div className="card p-8 text-center"><p className="text-sm muted">No high-risk projects.</p></div> : (
            highRiskProjects.map((p) => (
              <div key={p.id} className="card p-5">
                <div className="flex items-center justify-between">
                  <div><p className="font-semibold text-navy-900">{p.title}</p><p className="text-xs muted">{p.location} · {p.engineer?.name ?? 'Unassigned'}</p></div>
                  <Badge variant="warning">{p.progress}% complete</Badge>
                </div>
              </div>
            ))
          )}
          {suspiciousReviews.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3"><Star className="w-5 h-5 text-amber-400" /><h3 className="font-semibold text-navy-900">Suspicious Reviews</h3></div>
              <p className="text-sm muted mb-3">Engineers with high ratings but few reviews — potential review manipulation.</p>
              <div className="space-y-2">
                {suspiciousReviews.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm">
                    <span className="text-navy-700">{e.name}</span>
                    <span className="muted">{e.rating}★ ({e.reviews_count} reviews)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'certRequests' && (
        <div className="space-y-4">
          <div className="card p-4 bg-royal-50 border-royal-100">
            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 text-royal-600 shrink-0 mt-0.5" />
              <p className="text-sm text-royal-900">
                <strong>Certificate verification requests</strong> for engineers, plumbers, electricians and material shops.
                Approving updates the request AND the professional's profile status to <strong>Verified</strong>; the Verified badge is only shown when the database status is verified.
              </p>
            </div>
          </div>
          {verificationRequests.length === 0 ? (
            <div className="card p-8 text-center"><CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" /><p className="font-semibold text-navy-900">No verification requests</p><p className="text-sm muted">Professionals' certificate submissions will appear here.</p></div>
          ) : (
            verificationRequests.map((vr) => {
              const st = verificationStatus(vr.status);
              const certs = certsByRequest[vr.id] ?? [];
              const isRejecting = rejecting?.id === vr.id;
              return (
                <div key={vr.id} className="card p-5">
                  <div className="flex items-start gap-4 flex-wrap">
                    <img src={personPhoto(vr.app_user?.avatar_url, vr.app_user?.role)} alt="" onError={(e) => onPersonImgError(e, vr.app_user?.role)} className="w-12 h-12 rounded-xl object-cover" />
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-navy-900">{vr.app_user?.name ?? 'Unknown user'}</p>
                        <Badge variant="navy">{vr.professional_type.replace('_', ' ')}</Badge>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </div>
                      <p className="text-xs muted mt-0.5">{vr.app_user?.email} · Submitted {formatDate(vr.submitted_at)}{vr.reviewed_at ? ` · Reviewed ${formatDate(vr.reviewed_at)}` : ''}</p>
                      {vr.status === 'rejected' && vr.rejection_reason && (
                        <p className="text-xs text-rose-600 mt-1">Rejection reason: {vr.rejection_reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-navy-900 mb-2">Certificates ({certs.length})</p>
                    {certs.length === 0 ? (
                      <p className="text-xs muted">No certificates attached.</p>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-2">
                        {certs.map((c) => (
                          <div key={c.id} className="border border-navy-100 rounded-xl p-3 flex items-start gap-2">
                            <FileText className="w-4 h-4 text-royal-600 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-navy-900">{c.title}</p>
                              <p className="text-xs muted">{c.issuing_authority}{c.certificate_number ? ` · No: ${c.certificate_number}` : ''}</p>
                              {c.issue_date && <p className="text-xs muted">Issued {formatDate(c.issue_date)}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {vr.status === 'pending' && (
                    <div className="mt-4 pt-4 border-t border-navy-100 space-y-3">
                      {isRejecting && (
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                          <label className="label">Rejection reason</label>
                          <textarea className="input min-h-[60px]" placeholder="Why is this request being rejected?" value={rejecting?.reason ?? ''} onChange={(e) => setRejecting({ id: vr.id, reason: e.target.value })} />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => handleVerificationRequest(vr, 'verified')} className="btn-success text-sm"><CheckCircle2 className="w-4 h-4" /> Approve & Verify</button>
                        {isRejecting ? (
                          <button onClick={() => rejecting?.reason.trim() && handleVerificationRequest(vr, 'rejected', rejecting.reason.trim())} className="btn-primary text-sm"><Send className="w-4 h-4" /> Confirm Rejection</button>
                        ) : (
                          <button onClick={() => setRejecting({ id: vr.id, reason: '' })} className="btn-secondary text-sm"><XCircle className="w-4 h-4" /> Reject</button>
                        )}
                        {isRejecting && <button onClick={() => setRejecting(null)} className="btn-ghost text-sm">Cancel</button>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
