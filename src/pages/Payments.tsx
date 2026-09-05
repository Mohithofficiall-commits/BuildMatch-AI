import { useState, useEffect } from 'react';
import { fetchProjects, fetchPayments } from '@/lib/data';
import type { Project, Payment } from '@/lib/types';
import { LoadingState, EmptyState, Badge, formatINR, formatDate, MilestoneIcon } from '@/components/ui';
import { Wallet } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function Payments() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
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
    (async () => { try { setPayments(await fetchPayments(selectedProject)); } catch { /* ignore */ } })();
  }, [selectedProject]);

  if (loading) return <LoadingState text="Loading payments..." />;

  const project = projects.find((p) => p.id === selectedProject);
  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const budget = project?.budget ?? 0;

  const pieData = [
    { name: 'Paid', value: totalPaid, color: '#059669' },
    { name: 'Pending', value: totalPending, color: '#f59e0b' },
    { name: 'Remaining', value: Math.max(0, budget - totalPaid - totalPending), color: '#dae4f4' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Payments</h1>
        <p className="muted mt-1">Milestone-based payment tracking — no real money transfer</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        {projects.map((p) => (
          <button key={p.id} onClick={() => setSelectedProject(p.id)} className={`btn text-sm ${selectedProject === p.id ? 'bg-navy-900 text-white' : 'btn-secondary'}`}>{p.title}</button>
        ))}
      </div>

      {project && (
        <>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="card p-6 lg:col-span-2">
              <h2 className="text-lg font-bold text-navy-900 mb-4">Payment Summary</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-navy-50 rounded-xl p-4 text-center"><p className="text-xs muted">Total Budget</p><p className="text-xl font-bold text-navy-900 mt-1">{formatINR(budget)}</p></div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center"><p className="text-xs muted">Paid</p><p className="text-xl font-bold text-emerald-700 mt-1">{formatINR(totalPaid)}</p></div>
                <div className="bg-amber-50 rounded-xl p-4 text-center"><p className="text-xs muted">Remaining</p><p className="text-xl font-bold text-amber-700 mt-1">{formatINR(budget - totalPaid)}</p></div>
              </div>
              <div className="w-full h-3 bg-navy-100 rounded-full overflow-hidden mt-4 flex">
                <div className="h-full bg-emerald-500" style={{ width: `${(totalPaid / budget) * 100}%` }} />
                <div className="h-full bg-amber-400" style={{ width: `${(totalPending / budget) * 100}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs muted mt-2">
                <span>{Math.round((totalPaid / budget) * 100)}% paid</span>
                <span>{Math.round(((budget - totalPaid) / budget) * 100)}% remaining</span>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-bold text-navy-900 mb-4">Distribution</h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatINR(Number(v ?? 0))} contentStyle={{ borderRadius: '12px', border: '1px solid #dae4f4', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                    <span className="text-navy-700 flex-1">{d.name}</span>
                    <span className="font-semibold text-navy-900">{formatINR(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold text-navy-900 mb-4">Milestone Payment Records</h2>
            {payments.length === 0 ? (
              <EmptyState icon={<Wallet className="w-7 h-7" />} title="No payments" description="Payment records will appear here once milestones are set." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-navy-100 text-left text-xs muted">
                      <th className="pb-3 font-medium">Milestone</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Due Date</th>
                      <th className="pb-3 font-medium">Paid Date</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-navy-50">
                        <td className="py-3"><div className="flex items-center gap-2"><MilestoneIcon status={p.status === 'paid' ? 'completed' : 'upcoming'} /><span className="text-sm font-medium text-navy-900">{p.milestone_name}</span></div></td>
                        <td className="py-3 text-sm font-semibold text-navy-900">{formatINR(p.amount)}</td>
                        <td className="py-3 text-sm muted">{formatDate(p.due_date)}</td>
                        <td className="py-3 text-sm muted">{formatDate(p.paid_date)}</td>
                        <td className="py-3"><Badge variant={p.status === 'paid' ? 'success' : p.status === 'overdue' ? 'danger' : 'warning'}>{p.status.toUpperCase()}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
