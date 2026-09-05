import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchEngineers } from '@/lib/data';
import { useCompare } from '@/lib/compare';
import type { Engineer, ProjectRequirement } from '@/lib/types';
import { Badge, LoadingState, EmptyState, formatINR } from '@/components/ui';
import { GitCompareArrows, X, Trophy } from 'lucide-react';

export default function CompareEngineers() {
  const navigate = useNavigate();
  const { engineerIds, remove, clear } = useCompare();
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);

  const req: ProjectRequirement = {
    location: 'Coimbatore', budget: 2800000, house_type: '2BHK', area_sqft: 1500, construction_style: 'Modern',
  };

  useEffect(() => {
    (async () => {
      try {
        const all = await fetchEngineers();
        setEngineers(all.filter((e) => engineerIds.includes(e.id)));
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, [engineerIds]);

  if (loading) return <LoadingState text="Loading comparison..." />;

  if (engineers.length < 2) {
    return (
      <div className="animate-fade-in">
        <EmptyState
          icon={<GitCompareArrows className="w-7 h-7" />}
          title="Select engineers to compare"
          description="Add 2–4 engineers from the Find Engineers page to see a side-by-side comparison."
          action={<button onClick={() => navigate('/app/find-engineers')} className="btn-primary">Find Engineers</button>}
        />
      </div>
    );
  }

  const matchScores = engineers.map((e) => {
    const budget = e.price_per_sqft * req.area_sqft;
    const budgetFit = budget <= req.budget * 1.1 && budget >= req.budget * 0.85 ? 95 : Math.max(50, 100 - Math.round(Math.abs(budget - req.budget) / req.budget * 100));
    const location = e.location === req.location ? 100 : 70;
    const exp = Math.min(100, 60 + e.experience_years * 2.5);
    const perf = Math.round((e.on_time_pct + e.budget_adherence_pct + e.quality_score) / 3);
    const overall = Math.round(budgetFit * 0.25 + location * 0.20 + exp * 0.15 + 80 * 0.15 + perf * 0.15 + 80 * 0.10);
    return { id: e.id, overall };
  });
  const bestId = [...matchScores].sort((a, b) => b.overall - a.overall)[0].id;

  const rows: { label: string; key: (e: Engineer) => string; highlight?: boolean }[] = [
    { label: 'Match Score', key: (e) => `${matchScores.find((m) => m.id === e.id)?.overall ?? 0}%`, highlight: true },
    { label: 'Trust Score', key: (e) => `${e.trust_score}/100` },
    { label: 'Trust Level', key: (e) => e.trust_level },
    { label: 'Experience', key: (e) => `${e.experience_years} years` },
    { label: 'Projects Completed', key: (e) => String(e.projects_completed) },
    { label: 'Rating', key: (e) => `${e.rating} (${e.reviews_count})` },
    { label: 'Price/sq.ft', key: (e) => formatINR(e.price_per_sqft) },
    { label: 'Specialization', key: (e) => e.specializations.join(', ') },
    { label: 'Location', key: (e) => e.location },
    { label: 'On-Time %', key: (e) => `${e.on_time_pct}%` },
    { label: 'Budget Adherence', key: (e) => `${e.budget_adherence_pct}%` },
    { label: 'Quality Score', key: (e) => `${e.quality_score}/100` },
    { label: 'Complaints', key: (e) => String(e.complaints_count) },
    { label: 'Risk Level', key: (e) => e.complaints_count === 0 ? 'Low' : e.complaints_count <= 2 ? 'Medium' : 'High' },
    { label: 'Availability', key: (e) => e.availability },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Compare Engineers</h1>
          <p className="muted mt-1">Side-by-side comparison of {engineers.length} engineers</p>
        </div>
        <button onClick={clear} className="btn-ghost text-sm"><X className="w-4 h-4" /> Clear All</button>
      </div>

      <div className="card p-5 bg-gradient-to-r from-royal-50 to-navy-50 border-royal-200">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-royal-600" />
          <div>
            <p className="font-semibold text-navy-900">Best Match: {engineers.find((e) => e.id === bestId)?.name}</p>
            <p className="text-sm muted">BuildMatch recommends this engineer based on your project requirements (Coimbatore, 2BHK, ₹28 Lakhs, Modern style).</p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-navy-100">
                <th className="text-left p-4 text-sm font-semibold text-navy-700 sticky left-0 bg-white">Metric</th>
                {engineers.map((e) => (
                  <th key={e.id} className="p-4 text-left min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <img src={e.photo_url} alt={e.name} className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="font-semibold text-navy-900 text-sm">{e.name}</p>
                          {e.id === bestId && <Badge variant="royal">Best</Badge>}
                        </div>
                        <p className="text-xs muted">{e.location}</p>
                      </div>
                      <button onClick={() => remove(e.id)} className="ml-auto p-1 text-navy-300 hover:text-rose-500"><X className="w-4 h-4" /></button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? 'bg-navy-50/30' : ''}>
                  <td className={`p-4 text-sm font-medium text-navy-700 sticky left-0 ${i % 2 === 0 ? 'bg-navy-50/30' : 'bg-white'}`}>{row.label}</td>
                  {engineers.map((e) => (
                    <td key={e.id} className={`p-4 text-sm ${row.highlight ? 'font-bold text-royal-600 text-base' : 'text-navy-900'}`}>
                      {row.key(e)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="p-4 sticky left-0 bg-white"></td>
                {engineers.map((e) => (
                  <td key={e.id} className="p-4">
                    <button onClick={() => navigate(`/app/engineers/${e.id}`)} className="btn-secondary text-sm w-full">View Profile</button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
