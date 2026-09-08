import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import {
  fetchLatestVerificationRequest, fetchCertificatesByRequest, createVerificationRequest, createCertificate,
} from '@/lib/data';
import {
  useProfessionalProfile, profileName, isVerified, roleLabel, isProfessionalRole,
} from '@/lib/portal';
import type { VerificationRequest, Certificate } from '@/lib/types';
import { LoadingState, EmptyState, Badge, Toast, VerifiedBadge, formatDate, Modal } from '@/components/ui';
import { verificationStatus } from '@/components/professional/statuses';
import {
  ShieldCheck, Award, CheckCircle2, Clock, Plus, X, FileBadge, AlertTriangle,
} from 'lucide-react';

interface CertDraft {
  title: string;
  issuing_authority: string;
  certificate_number: string;
  issue_date: string;
}

const emptyCert = (): CertDraft => ({ title: '', issuing_authority: '', certificate_number: '', issue_date: '' });

export default function PortalVerificationPage() {
  const { user } = useAuth();
  const role = user && isProfessionalRole(user.role) ? user.role : null;
  const { profile, loading: profileLoading, refresh } = useProfessionalProfile(role ?? 'engineer');

  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [drafts, setDrafts] = useState<CertDraft[]>([emptyCert()]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const load = useCallback(async () => {
    if (!user || !role) return;
    try {
      const vr = await fetchLatestVerificationRequest(user.id).catch(() => null);
      setRequest(vr);
      if (vr) setCerts(await fetchCertificatesByRequest(vr.id).catch(() => []));
      else setCerts([]);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [user, role]);

  useEffect(() => { void load(); }, [load]);

  const openSubmit = () => {
    setDrafts([emptyCert()]);
    setSubmitOpen(true);
  };

  if (!user || !role) return <LoadingState text="Loading..." />;

  const handleSubmit = async () => {
    const valid = drafts.filter((d) => d.title.trim() && d.issuing_authority.trim());
    if (valid.length === 0) {
      setToast({ msg: 'Add at least one certificate with a title and issuing authority.', type: 'error' });
      return;
    }
    setBusy(true);
    try {
      const vr = await createVerificationRequest({ user_id: user.id, professional_type: role });
      for (const d of valid) {
        await createCertificate({
          verification_request_id: vr.id,
          user_id: user.id,
          title: d.title.trim(),
          issuing_authority: d.issuing_authority.trim(),
          certificate_number: d.certificate_number.trim() || null,
          issue_date: d.issue_date || null,
          expiry_date: null,
          file_url: null,
        });
      }
      setToast({ msg: 'Verification request submitted. An admin will review your certificates.', type: 'success' });
      setSubmitOpen(false);
      await load();
      await refresh();
    } catch {
      setToast({ msg: 'Could not submit verification request. Please try again.', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (profileLoading || loading) return <LoadingState text="Loading verification status..." />;

  const st = request ? verificationStatus(request.status) : null;
  const profileVerified = isVerified(profile);

  return (
    <div className="min-h-screen bg-[#F6F8FC] p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Professional Verification</h1>
          <p className="muted mt-1">Submit certificates — a Verified badge is shown only after an admin confirms the database status</p>
        </div>
        {request?.status !== 'pending' && (
          <button onClick={openSubmit} className="btn-primary"><Plus className="w-4 h-4" /> {request ? 'Submit New Request' : 'Get Verified'}</button>
        )}
      </div>

      {/* Profile verification status */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-royal-600" />
          <h2 className="text-lg font-bold text-navy-900">Current Verification Status</h2>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${profileVerified ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
              {profileVerified ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-navy-900 capitalize">{roleLabel(role)} Profile</p>
                {profileVerified && <VerifiedBadge />}
              </div>
              <p className="text-xs muted mt-0.5">
                {profileVerified
                  ? 'Your profile badge is active — the database status is VERIFIED.'
                  : profile?.verification_status === 'rejected'
                    ? 'Your profile was marked REJECTED by an admin.'
                    : 'Your profile is PENDING verification.'}
              </p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="muted">Profile database status</p>
            <Badge variant={profileVerified ? 'success' : profile?.verification_status === 'rejected' ? 'danger' : 'warning'}>
              {profile?.verification_status?.toUpperCase() ?? 'PENDING'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Latest verification request */}
      {!request ? (
        <EmptyState
          icon={<Award className="w-7 h-7" />}
          title="No verification request yet"
          description="Submit your qualification certificates, licenses and credentials for admin review. You will not receive a Verified badge until the request is approved."
          action={<button onClick={openSubmit} className="btn-primary">Submit Verification Request</button>}
        />
      ) : (
        <div className="card p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
            <h2 className="text-lg font-bold text-navy-900">Latest Verification Request</h2>
            {st && <Badge variant={st.variant}><ShieldCheck className="w-3 h-3" /> {st.label}</Badge>}
          </div>
          <p className="text-xs muted">Submitted {formatDate(request.submitted_at)} · Professional type: <span className="capitalize">{request.professional_type.replace('_', ' ')}</span></p>
          {request.reviewed_at && <p className="text-xs muted mt-0.5">Reviewed {formatDate(request.reviewed_at)}</p>}
          {request.status === 'rejected' && request.rejection_reason && (
            <div className="mt-4 bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-rose-800">Rejection reason</p>
                <p className="text-sm text-rose-700">{request.rejection_reason}</p>
              </div>
            </div>
          )}
          {request.status === 'pending' && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-2">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">Your request is pending admin review. New submissions are disabled until this request is reviewed.</p>
            </div>
          )}

          <h3 className="font-semibold text-navy-900 mt-5 mb-2 text-sm">Submitted Certificates</h3>
          {certs.length === 0 ? (
            <p className="text-sm muted">No certificates attached to this request.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {certs.map((c) => (
                <div key={c.id} className="border border-navy-100 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-royal-50 text-royal-700 flex items-center justify-center shrink-0"><FileBadge className="w-5 h-5" /></div>
                  <div className="min-w-0">
                    <p className="font-semibold text-navy-900 text-sm">{c.title}</p>
                    <p className="text-xs muted">{c.issuing_authority}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs muted">
                      {c.certificate_number && <span>No: {c.certificate_number}</span>}
                      {c.issue_date && <span>Issued: {formatDate(c.issue_date)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={submitOpen} onClose={() => setSubmitOpen(false)} title="Submit Verification Request" maxWidth="max-w-2xl">
        <div className="space-y-4">
          <div className="bg-royal-50 border border-royal-200 rounded-xl p-3 text-sm text-royal-800">
            <ShieldCheck className="w-4 h-4 inline mr-1" />
            {profile ? profileName(profile) : user.name}, attach your {role === 'material_shop' ? 'business registration and supplier certificates' : 'qualification certificates and licenses'}. An admin will review and update your verification status.
          </div>
          {drafts.map((d, i) => (
            <div key={i} className="border border-navy-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-navy-900">Certificate {i + 1}</p>
                {drafts.length > 1 && (
                  <button onClick={() => setDrafts(drafts.filter((_, x) => x !== i))} className="text-navy-300 hover:text-rose-500"><X className="w-4 h-4" /></button>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div><label className="label">Title *</label><input className="input" placeholder="e.g. Electrical License Grade A" value={d.title} onChange={(e) => setDrafts(drafts.map((x, xi) => xi === i ? { ...x, title: e.target.value } : x))} /></div>
                <div><label className="label">Issuing Authority *</label><input className="input" placeholder="e.g. Tamil Nadu Electrical Board" value={d.issuing_authority} onChange={(e) => setDrafts(drafts.map((x, xi) => xi === i ? { ...x, issuing_authority: e.target.value } : x))} /></div>
                <div><label className="label">Certificate Number</label><input className="input" placeholder="Optional" value={d.certificate_number} onChange={(e) => setDrafts(drafts.map((x, xi) => xi === i ? { ...x, certificate_number: e.target.value } : x))} /></div>
                <div><label className="label">Issue Date</label><input type="date" className="input" value={d.issue_date} onChange={(e) => setDrafts(drafts.map((x, xi) => xi === i ? { ...x, issue_date: e.target.value } : x))} /></div>
              </div>
            </div>
          ))}
          <button onClick={() => setDrafts([...drafts, emptyCert()])} className="btn-secondary text-sm w-full"><Plus className="w-4 h-4" /> Add Another Certificate</button>
          <button onClick={handleSubmit} disabled={busy} className="btn-primary w-full">
            <ShieldCheck className="w-4 h-4" /> {busy ? 'Submitting...' : 'Submit for Verification'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
