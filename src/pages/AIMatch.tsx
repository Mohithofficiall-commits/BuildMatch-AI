import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchEngineers } from '@/lib/data';
import { rankEngineers, MATCH_WEIGHTS } from '@/lib/matching';
import type { Engineer, ProjectRequirement } from '@/lib/types';
import { Badge, RatingStars, TrustBadge, LoadingState, ProgressBar } from '@/components/ui';
import { Sparkles, MapPin, Home, Ruler, Wallet, Palette, CalendarClock, ArrowRight, ShieldCheck, Info, TrendingUp } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { personPhoto, onPersonImgError } from '@/lib/people';

export default function AIMatch() {
  const navigate = useNavigate();
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [req, setReq] = useState<ProjectRequirement>({
    location: 'Coimbatore', budget: 2800000, house_type: '2BHK', area_sqft: 1500, construction_style: 'Modern', expected_completion: '2025-12-20',
  });

  useEffect(() => {
    (async () => {
      try { setEngineers(await fetchEngineers()); } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <LoadingState text="Running AI matching..." />;

  const matches = rankEngineers(engineers, req).slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-6 h-6 text-royal-600" />
          <h1 className="text-2xl font-bold text-navy-900">Explainable AI Match</h1>
        </div>
        <p className="muted">Transparent weighted scoring — see exactly why each engineer was recommended</p>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-bold text-navy-900 mb-4">Your Project Requirements</h2>
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
            <label className="label"><Wallet className="w-3.5 h-3.5 inline mr-1" />Budget</label>
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
          <div>
            <label className="label"><CalendarClock className="w-3.5 h-3.5 inline mr-1" />Expected Completion</label>
            <input type="date" className="input" value={req.expected_completion} onChange={(e) => setReq({ ...req, expected_completion: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card p-5 bg-royal-50 border-royal-100">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-royal-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-navy-900 text-sm">How the Match Score is calculated</p>
            <p className="text-sm muted mt-1">The overall score is a transparent weighted sum of six factors. No black box — every score is explainable.</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.entries(MATCH_WEIGHTS).map(([key, w]) => (
                <Badge key={key} variant="royal">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())} · {Math.round(w * 100)}%</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-navy-900 mb-4">Top 5 Engineer Recommendations</h2>
        <div className="space-y-4">
          {matches.map((m, idx) => {
            const radarData = m.factors.map((f) => ({ metric: f.label.split(' ')[0], value: f.score }));
            return (
              <div key={m.engineer.id} className={`card p-6 ${idx === 0 ? 'border-royal-200 shadow-glow' : ''}`}>
                <div className="grid lg:grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <img src={personPhoto(m.engineer.photo_url, 'engineer')} alt={m.engineer.name} onError={(e) => onPersonImgError(e, 'engineer')} className="w-14 h-14 rounded-xl object-cover" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-navy-900">{m.engineer.name}</p>
                          {m.engineer.verification_status === 'verified' && <ShieldCheck className="w-4 h-4 text-emerald-600" />}
                        </div>
                        <p className="text-xs muted">{m.engineer.location} · {m.engineer.experience_years} yrs</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <RatingStars rating={m.engineer.rating} size="xs" />
                          <span className="text-xs muted ml-1">{m.engineer.rating}</span>
                        </div>
                      </div>
                    </div>
                    {idx === 0 && <Badge variant="royal"><TrendingUp className="w-3 h-3" /> Best Match</Badge>}
                    <div className="mt-3"><TrustBadge score={m.engineer.trust_score} /></div>
                    <button onClick={() => navigate(`/app/engineers/${m.engineer.id}`)} className="btn-secondary mt-3 text-sm w-full">
                      View Full Profile <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-center">
                    <p className="text-5xl font-bold text-royal-600">{m.overallScore}%</p>
                    <p className="text-sm muted">Overall Match Score</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#dae4f4" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#5d80bf' }} />
                        <Radar dataKey="value" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-navy-900 mb-3">Score Breakdown</p>
                    <div className="space-y-2.5">
                      {m.factors.map((f) => (
                        <div key={f.label}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-navy-700">{f.label} <span className="muted">({Math.round(f.weight * 100)}%)</span></span>
                            <span className="font-semibold text-navy-900">{f.score}%</span>
                          </div>
                          <ProgressBar value={f.score} color={f.score >= 85 ? 'emerald' : f.score >= 70 ? 'royal' : 'amber'} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 bg-navy-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-navy-900 mb-1">Why this engineer?</p>
                  <p className="text-sm text-navy-600">{m.explanation}</p>
                </div>

                <div className="mt-3 grid md:grid-cols-2 gap-2">
                  {m.factors.map((f) => (
                    <div key={f.label} className="text-xs muted flex items-start gap-1.5">
                      <span className="font-semibold text-navy-700 shrink-0">{f.label}:</span> {f.reason}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
