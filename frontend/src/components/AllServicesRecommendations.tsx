import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Info, ChevronDown, ArrowRight, ShieldCheck, Wallet, AlertCircle, RefreshCw } from 'lucide-react';
import { useAllServiceRecommendations, type ServiceCategoryResult } from '@/lib/serviceRecommendations';
import type { MatchFactor } from '@/lib/types';
import { Badge, RatingStars, LoadingState, formatINR } from '@/components/ui';
import { personPhoto, onPersonImgError } from '@/lib/people';

function TopFactorLine({ factor }: { factor: MatchFactor | undefined }) {
  if (!factor) return <p className="text-[11px] muted">Not enough data</p>;
  return (
    <p className="text-[11px] muted flex items-start gap-1 min-w-0">
      <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
      <span className="truncate"><strong>{factor.label}</strong> — {factor.reason}</span>
    </p>
  );
}

function CategoryResult({ result }: { result: ServiceCategoryResult }) {
  const navigate = useNavigate();
  const { category, insufficientData, dataNote, engineers, professionals } = result;

  if (insufficientData) {
    return (
      <div className="border border-navy-100 rounded-xl p-4 bg-navy-50/50">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-lg">{category.emoji}</span>
          <p className="font-semibold text-navy-900 text-sm">{category.label}</p>
          <Badge variant="warning">Insufficient data</Badge>
        </div>
        <p className="text-xs muted flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
          {dataNote}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-navy-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-lg">{category.emoji}</span>
          <p className="font-semibold text-navy-900 text-sm">{category.label}</p>
          <Badge variant="royal">{result.dataCount} in directory</Badge>
        </div>
        {category.key === 'engineer' ? (
          <button onClick={() => navigate('/app/ai-match')} className="btn-ghost text-xs">Full AI Match <ArrowRight className="w-3.5 h-3.5" /></button>
        ) : (
          <button onClick={() => navigate('/app/construction-team')} className="btn-ghost text-xs">Directory <ArrowRight className="w-3.5 h-3.5" /></button>
        )}
      </div>
      <p className="text-[11px] muted mb-3">{dataNote}</p>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {engineers.map((m) => (
          <div key={m.engineer.id} className="border border-navy-100 rounded-xl p-3 card-hover cursor-pointer" onClick={() => navigate(`/app/engineers/${m.engineer.id}`)}>
            <div className="flex items-start gap-2.5 mb-2">
              <img src={personPhoto(m.engineer.photo_url, 'engineer')} alt={m.engineer.name} onError={(e) => onPersonImgError(e, 'engineer')} className="w-10 h-10 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold text-navy-900 truncate">{m.engineer.name}</p>
                  {m.engineer.verification_status === 'verified' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                </div>
                <p className="text-[11px] muted truncate">{m.engineer.location} · {m.engineer.experience_years} yrs</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <RatingStars rating={m.engineer.rating} size="xs" />
                  <span className="text-[10px] muted">{m.engineer.rating} ({m.engineer.reviews_count})</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-royal-600">{m.overallScore}%</p>
                <p className="text-[9px] muted">Match</p>
              </div>
            </div>
            <TopFactorLine factor={m.factors[0]} />
            {m.engineer.price_per_sqft > 0 && (
              <p className="text-[11px] text-navy-500 mt-1.5"><Wallet className="w-3 h-3 inline mr-1" />₹{m.engineer.price_per_sqft}/sq.ft</p>
            )}
          </div>
        ))}
        {professionals.map((m) => (
          <div key={m.profile.id} className="border border-navy-100 rounded-xl p-3 card-hover">
            <div className="flex items-start gap-2.5 mb-2">
              <img src={personPhoto(m.profile.photo_url, m.profile.profession)} alt={m.profile.name} onError={(e) => onPersonImgError(e, m.profile.profession)} className="w-10 h-10 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold text-navy-900 truncate">{m.profile.business_name ?? m.profile.name}</p>
                  {m.profile.verification_status === 'verified' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                </div>
                <p className="text-[11px] muted truncate">{m.profile.location} · {m.profile.experience_years} yrs</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <RatingStars rating={m.profile.rating} size="xs" />
                  <span className="text-[10px] muted">{m.profile.rating} ({m.profile.reviews_count})</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-royal-600">{m.overallScore}%</p>
                <p className="text-[9px] muted">Match</p>
              </div>
            </div>
            <TopFactorLine factor={m.factors[0]} />
            {m.profile.price_per_visit > 0 && (
              <p className="text-[11px] text-navy-500 mt-1.5"><Wallet className="w-3 h-3 inline mr-1" />{formatINR(m.profile.price_per_visit)}/visit</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AllServicesRecommendations({ collapsedByDefault = true }: { collapsedByDefault?: boolean }) {
  const { loading, error, requirement, requirementSource, categories, reload } = useAllServiceRecommendations();
  const [expanded, setExpanded] = useState(!collapsedByDefault);

  return (
    <div className="card p-6">
      <button onClick={() => setExpanded((e) => !e)} className="w-full flex items-center gap-2 text-left">
        <Layers className="w-5 h-5 text-royal-600" />
        <div className="flex-1">
          <h2 className="text-lg font-bold text-navy-900">AI Recommendations — All Services</h2>
          <p className="text-xs muted">
            Explainable matches across 7 service categories
            {requirementSource === 'project' ? `, ranked for your project in ${requirement.location}` : ''}.
          </p>
        </div>
        <ChevronDown className={`w-5 h-5 text-navy-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {loading && <LoadingState text="Loading directory data and ranking services..." />}

          {!loading && error && (
            <div className="border border-rose-200 bg-rose-50 rounded-xl p-4 text-sm">
              <p className="font-semibold text-rose-900">Could not load recommendations</p>
              <p className="text-rose-800 mt-1">{error}</p>
              <button onClick={reload} className="btn-secondary mt-3 text-xs py-1.5"><RefreshCw className="w-3.5 h-3.5" /> Retry</button>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="bg-royal-50 border border-royal-100 rounded-xl p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-royal-600 shrink-0 mt-0.5" />
                <p className="text-xs text-navy-700">
                  Ranked for: {requirement.house_type} · {requirement.construction_style} · {requirement.location} · {requirement.area_sqft} sq.ft · {formatINR(requirement.budget)}. Categories without recorded professionals show <strong>Insufficient data</strong>.
                </p>
              </div>
              <div className="space-y-4">
                {categories.map((c) => <CategoryResult key={c.category.key} result={c} />)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
