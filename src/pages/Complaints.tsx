import { useState, useEffect } from 'react';
import { fetchComplaints, createComplaint, updateComplaintStatus, fetchProjects } from '@/lib/data';
import type { Complaint, Project } from '@/lib/types';
import { LoadingState, EmptyState, Badge, Modal, Toast, formatDate } from '@/components/ui';
import { AlertTriangle, Plus, Clock, CheckCircle2, FileText } from 'lucide-react';

const categories = ['Delay', 'Quality', 'Payment', 'Communication', 'Professional conduct', 'Other'];
const statusConfig: Record<string, { variant: 'danger' | 'warning' | 'success'; label: string; icon: typeof Clock }> = {
  open: { variant: 'danger', label: 'OPEN', icon: AlertTriangle },
  under_review: { variant: 'warning', label: 'UNDER REVIEW', icon: Clock },
  resolved: { variant: 'success', label: 'RESOLVED', icon: CheckCircle2 },
};

export default function Complaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState({ category: 'Delay', subject: '', description: '', projectId: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [comps, projs] = await Promise.all([fetchComplaints(), fetchProjects()]);
      setComplaints(comps); setProjects(projs);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.subject || !form.description || !form.projectId) return;
    const project = projects.find((p) => p.id === form.projectId);
    if (!project?.engineer_id) return;
    try {
      await createComplaint({
        project_id: form.projectId, engineer_id: project.engineer_id, homeowner_name: 'Nishi Sharma',
        category: form.category, subject: form.subject, description: form.description,
      });
      setCreateOpen(false);
      setForm({ category: 'Delay', subject: '', description: '', projectId: '' });
      setToast('Complaint submitted successfully.');
      await loadData();
    } catch { setToast('Failed to submit complaint.'); }
  };

  const handleStatusChange = async (id: string, status: Complaint['status']) => {
    try { await updateComplaintStatus(id, status); setToast('Complaint status updated.'); await loadData(); } catch { setToast('Failed to update status.'); }
  };

  if (loading) return <LoadingState text="Loading complaints..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Complaints</h1>
          <p className="muted mt-1">Submit and track complaints about your project</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Submit Complaint</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(['open', 'under_review', 'resolved'] as const).map((s) => {
          const count = complaints.filter((c) => c.status === s).length;
          const cfg = statusConfig[s];
          return (
            <div key={s} className="card p-5">
              <div className="flex items-center justify-between">
                <div><p className="text-sm muted">{cfg.label}</p><p className="text-2xl font-bold text-navy-900 mt-1">{count}</p></div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s === 'open' ? 'bg-rose-50 text-rose-600' : s === 'under_review' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}><cfg.icon className="w-5 h-5" /></div>
              </div>
            </div>
          );
        })}
      </div>

      {complaints.length === 0 ? (
        <EmptyState icon={<AlertTriangle className="w-7 h-7" />} title="No complaints" description="You have no active complaints. Everything looks good!" />
      ) : (
        <div className="space-y-4">
          {complaints.map((c) => {
            const cfg = statusConfig[c.status];
            return (
              <div key={c.id} className="card p-5">
                <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="navy">{c.category}</Badge>
                      <Badge variant={cfg.variant}><cfg.icon className="w-3 h-3" /> {cfg.label}</Badge>
                    </div>
                    <h3 className="font-semibold text-navy-900">{c.subject}</h3>
                    <p className="text-xs muted mt-0.5">By {c.homeowner_name} · {formatDate(c.created_at)}</p>
                  </div>
                </div>
                <p className="text-sm text-navy-600 mb-3">{c.description}</p>
                <div className="flex items-center gap-2 text-xs muted pt-3 border-t border-navy-100">
                  <Clock className="w-3.5 h-3.5" /><span>Lifecycle: Open → Under Review → Resolved</span>
                  {c.resolved_at && <span>· Resolved {formatDate(c.resolved_at)}</span>}
                </div>
                {c.status !== 'resolved' && (
                  <div className="flex gap-2 mt-3">
                    {c.status === 'open' && <button onClick={() => handleStatusChange(c.id, 'under_review')} className="btn-secondary text-xs py-2">Move to Review</button>}
                    {c.status === 'under_review' && <button onClick={() => handleStatusChange(c.id, 'resolved')} className="btn-success text-xs py-2"><CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Submit a Complaint">
        <div className="space-y-4">
          <div><label className="label">Project</label><select className="input" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}><option value="">Select a project...</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
          <div><label className="label">Category</label><select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="label">Subject</label><input className="input" placeholder="Brief summary..." value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
          <div><label className="label">Description</label><textarea className="input min-h-[120px]" placeholder="Describe the issue in detail..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="border-2 border-dashed border-navy-200 rounded-xl p-4 text-center text-sm muted"><FileText className="w-5 h-5 mx-auto mb-1 text-navy-300" />Attach evidence (optional)</div>
          <button onClick={handleSubmit} className="btn-primary w-full">Submit Complaint</button>
        </div>
      </Modal>
    </div>
  );
}
