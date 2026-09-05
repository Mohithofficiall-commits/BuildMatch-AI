import { useState, useEffect } from 'react';
import { fetchProjects, fetchMilestones, fetchPayments, fetchDocuments, fetchReviews, fetchComplaints, fetchRiskAssessment, fetchMilestoneEvidence } from '@/lib/data';
import type { Project, Milestone, Payment, DocumentItem, Review, Complaint, RiskAssessment, MilestoneEvidence } from '@/lib/types';
import { LoadingState, Badge, formatINR, formatDate, MilestoneIcon } from '@/components/ui';
import { FileBadge, ShieldCheck, Download, Printer, CheckCircle2, Clock, Wallet, AlertTriangle, Camera, FileText, Star } from 'lucide-react';

export default function DigitalPassport() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [evidence, setEvidence] = useState<MilestoneEvidence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const projs = await fetchProjects();
        setProjects(projs);
        if (projs.length > 0) setSelectedProject(projs[0].id);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    (async () => {
      try {
        const [ms, pays, dcs, revs, comps, rsk, evi] = await Promise.all([
          fetchMilestones(selectedProject), fetchPayments(selectedProject), fetchDocuments(selectedProject),
          fetchReviews(), fetchComplaints(), fetchRiskAssessment(selectedProject), fetchMilestoneEvidence(selectedProject),
        ]);
        setMilestones(ms); setPayments(pays); setDocs(dcs); setReviews(revs); setComplaints(comps); setRisk(rsk); setEvidence(evi);
      } catch { /* ignore */ }
    })();
  }, [selectedProject]);

  if (loading) return <LoadingState text="Loading digital passport..." />;

  const project = projects.find((p) => p.id === selectedProject);
  const projectComplaints = complaints.filter((c) => c.project_id === selectedProject);
  const projectReviews = reviews.filter((r) => r.project_id === selectedProject);
  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const verifiedMilestones = milestones.filter((m) => m.verified).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileBadge className="w-6 h-6 text-royal-600" />
            <h1 className="text-2xl font-bold text-navy-900">Construction Digital Passport</h1>
          </div>
          <p className="muted">A trusted digital record of the complete construction journey</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="btn-secondary"><Printer className="w-4 h-4" /> Print</button>
          <button className="btn-primary"><Download className="w-4 h-4" /> Download</button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        {projects.map((p) => (
          <button key={p.id} onClick={() => setSelectedProject(p.id)} className={`btn text-sm ${selectedProject === p.id ? 'bg-navy-900 text-white' : 'btn-secondary'}`}>{p.title}</button>
        ))}
      </div>

      {project && (
        <div className="card p-8 border-2 border-navy-200">
          <div className="border-b-2 border-navy-100 pb-6 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-navy-900 flex items-center justify-center"><FileBadge className="w-6 h-6 text-white" /></div>
                <div><p className="text-xs uppercase tracking-wide text-royal-600 font-semibold">BuildMatch AI · Digital Passport</p><h2 className="text-xl font-bold text-navy-900">{project.title}</h2></div>
              </div>
              <div className="text-right"><p className="text-xs muted">Project ID</p><p className="font-mono text-sm text-navy-700">{project.id.slice(0, 8).toUpperCase()}</p></div>
            </div>
          </div>

          <PassportSection title="Project Specifications" icon={<FileText className="w-4 h-4" />}>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <PassportField label="Homeowner" value="Nishi Sharma" />
              <PassportField label="Engineer" value={project.engineer?.name ?? 'Unassigned'} />
              <PassportField label="Engineer Verification" value={project.engineer?.verification_status === 'verified' ? 'Verified' : 'Pending'} />
              <PassportField label="House Type" value={project.house_type} />
              <PassportField label="Location" value={project.location} />
              <PassportField label="Area" value={`${project.area_sqft} sq.ft`} />
              <PassportField label="Budget" value={formatINR(project.budget)} />
              <PassportField label="Style" value={project.construction_style} />
              <PassportField label="Start Date" value={formatDate(project.start_date)} />
              <PassportField label="Expected Completion" value={formatDate(project.expected_completion)} />
              <PassportField label="Actual Completion" value={formatDate(project.actual_completion)} />
              <PassportField label="Status" value={project.status.toUpperCase()} />
            </div>
          </PassportSection>

          <PassportSection title="Milestones & Verification" icon={<CheckCircle2 className="w-4 h-4" />}>
            <div className="space-y-2">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center justify-between border border-navy-100 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <MilestoneIcon status={m.status} />
                    <div><p className="text-sm font-semibold text-navy-900">{m.name}</p><p className="text-xs muted">Planned: {formatDate(m.planned_date)} · Actual: {formatDate(m.actual_date)}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.verified && <Badge variant="verified"><ShieldCheck className="w-3 h-3" /> Verified</Badge>}
                    <Badge variant={m.status === 'completed' ? 'success' : m.status === 'in_progress' ? 'royal' : 'navy'}>{m.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs muted mt-3">{verifiedMilestones} of {milestones.length} milestones verified</p>
          </PassportSection>

          {evidence.length > 0 && (
            <PassportSection title="Progress Evidence" icon={<Camera className="w-4 h-4" />}>
              <div className="grid md:grid-cols-3 gap-3">
                {evidence.map((ev) => (
                  <div key={ev.id} className="border border-navy-100 rounded-xl overflow-hidden">
                    {ev.image_url && <img src={ev.image_url} alt="" className="w-full h-24 object-cover" />}
                    <div className="p-2"><p className="text-xs font-semibold text-navy-900">{ev.detected_stage} ({ev.confidence}%)</p><p className="text-[10px] muted">Human: {ev.human_status}</p></div>
                  </div>
                ))}
              </div>
            </PassportSection>
          )}

          <PassportSection title="Payment Records" icon={<Wallet className="w-4 h-4" />}>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <PassportField label="Total Budget" value={formatINR(project.budget)} />
              <PassportField label="Total Paid" value={formatINR(totalPaid)} />
              <PassportField label="Remaining" value={formatINR(project.budget - totalPaid)} />
            </div>
            <div className="space-y-1">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b border-navy-50">
                  <span className="text-navy-700">{p.milestone_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-navy-900">{formatINR(p.amount)}</span>
                    <Badge variant={p.status === 'paid' ? 'success' : 'warning'}>{p.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </PassportSection>

          <PassportSection title="Documents" icon={<FileText className="w-4 h-4" />}>
            <div className="space-y-1">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm py-1.5 border-b border-navy-50">
                  <span className="text-navy-700">{d.name}</span>
                  <span className="muted text-xs">{d.category} · {formatDate(d.uploaded_date)}</span>
                </div>
              ))}
            </div>
          </PassportSection>

          {risk && (
            <PassportSection title="Risk Events" icon={<AlertTriangle className="w-4 h-4" />}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <PassportField label="Overall Risk" value={risk.overall_risk.toUpperCase()} />
                <PassportField label="Delay Risk" value={risk.delay_risk.toUpperCase()} />
                <PassportField label="Budget Risk" value={risk.budget_risk.toUpperCase()} />
                <PassportField label="Quality Risk" value={risk.quality_risk.toUpperCase()} />
              </div>
              {risk.recommended_action && <p className="text-sm muted mt-2">Action: {risk.recommended_action}</p>}
            </PassportSection>
          )}

          <PassportSection title="Resolved Complaints" icon={<AlertTriangle className="w-4 h-4" />}>
            {projectComplaints.length === 0 ? <p className="text-sm muted">No complaints filed for this project.</p> : (
              <div className="space-y-1">
                {projectComplaints.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b border-navy-50">
                    <span className="text-navy-700">{c.subject}</span>
                    <Badge variant={c.status === 'resolved' ? 'success' : 'warning'}>{c.status.replace('_', ' ')}</Badge>
                  </div>
                ))}
              </div>
            )}
          </PassportSection>

          <PassportSection title="Final Verified Review" icon={<Star className="w-4 h-4" />}>
            {projectReviews.length === 0 ? <p className="text-sm muted">No verified review yet — project not completed.</p> : (
              projectReviews.map((r) => (
                <div key={r.id} className="border border-navy-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="verified"><ShieldCheck className="w-3 h-3" /> Verified Project Review</Badge>
                    <span className="text-sm muted">by {r.homeowner_name}</span>
                  </div>
                  <p className="text-sm text-navy-600">{r.feedback}</p>
                </div>
              ))
            )}
          </PassportSection>

          <PassportSection title="Handover Status" icon={<CheckCircle2 className="w-4 h-4" />}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${project.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                {project.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-semibold text-navy-900">{project.status === 'completed' ? 'Handover Complete' : 'In Progress'}</p>
                <p className="text-xs muted">{project.progress}% complete · {project.status === 'completed' ? `Completed ${formatDate(project.actual_completion)}` : `Expected ${formatDate(project.expected_completion)}`}</p>
              </div>
            </div>
          </PassportSection>

          <div className="border-t-2 border-navy-100 pt-4 mt-6 text-center">
            <p className="text-xs muted">This Digital Passport is a verified digital record generated by BuildMatch AI. It represents the complete construction journey from selection to handover.</p>
            <p className="text-[10px] muted mt-2">Generated on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · BuildMatch AI · AI-assisted decision-support platform</p>
          </div>
        </div>
      )}
    </div>
  );
}

function PassportSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center">{icon}</div>
        <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function PassportField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-navy-100 rounded-xl p-3">
      <p className="text-xs muted">{label}</p>
      <p className="text-sm font-semibold text-navy-900 mt-0.5">{value}</p>
    </div>
  );
}
