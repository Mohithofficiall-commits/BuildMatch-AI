import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Sparkles, CheckCircle2, ArrowRight, Info, Wallet, Award, ArrowDown,
} from 'lucide-react';
import { rankEngineers, rankProfessionals } from '@/lib/matching';
import { fetchEngineers, fetchProfessionalProfiles, fetchProjects } from '@/lib/data';
import type {
  Project, ProjectRequirement, Engineer, ProfessionalProfile, ProfessionalMatchResult, ConstructionProfession,
} from '@/lib/types';
import { Badge, VerifiedBadge, RatingStars, LoadingState, ProgressBar, Modal, formatINR } from '@/components/ui';
import { personPhoto, onPersonImgError } from '@/lib/people';

// Categories shown in the homeowner "Construction Team" section.
// `profession` is null for engineers (engineers live in the `engineers` table).
interface TeamCategory {
  key: ConstructionProfession | 'engineer';
  label: string;
  short: string;
  emoji: string;
  blurb: string;
}

const CATEGORIES: TeamCategory[] = [
  { key: 'engineer', label: 'Engineer', short: 'Engineer', emoji: '👷', blurb: 'Structural design, planning & supervision' },
  { key: 'plumber', label: 'Plumber', short: 'Plumber', emoji: '🔧', blurb: 'Pipes, drainage, bathroom & kitchen fitting' },
  { key: 'electrician', label: 'Electrician', short: 'Electrician', emoji: '⚡', blurb: 'Wiring, panels, lighting & safety' },
  { key: 'carpenter', label: 'Carpenter / Woodworker', short: 'Carpenter', emoji: '🪚', blurb: 'Furniture, doors, frames & interiors' },
  { key: 'mason', label: 'Mason', short: 'Mason', emoji: '🧱', blurb: 'Brickwork, plastering & foundations' },
  { key: 'painter', label: 'Painter', short: 'Painter', emoji: '🎨', blurb: 'Interior & exterior painting, textures' },
  { key: 'fabricator', label: 'Fabricator / Aluminium & Glass', short: 'Fabricator', emoji: '🪟', blurb: 'Aluminium windows, glass & fabrication' },
  { key: 'hvac', label: 'HVAC / AC', short: 'HVAC', emoji: '❄️', blurb: 'AC installation, ducting & ventilation' },
  { key: 'material_shop', label: 'Material Supplier', short: 'Supplier', emoji: '🏬', blurb: 'Cement, steel, bricks, sand & hardware' },
];

const categoryLabel = (key: TeamCategory['key']) => CATEGORIES.find((c) => c.key === key)?.short ?? key.replace('_', ' ');

export default function ConstructionTeam({ req }: { req: ProjectRequirement }) {
  const navigate = useNavigate();
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [profiles, setProfiles] = useState<ProfessionalProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<TeamCategory['key']>('engineer');
  const [detail, setDetail] = useState<ProfessionalMatchResult | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [eng, prof, proj] = await Promise.all([
          fetchEngineers().catch(() => [] as Engineer[]),
          fetchProfessionalProfiles().catch(() => [] as ProfessionalProfile[]),
          fetchProjects().catch(() => [] as Project[]),
        ]);
        setEngineers(eng);
        setProfiles(prof);
        setProjects(proj);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeProject = projects.find((p) => p.status === 'active') ?? null;

  const engineerMatches = useMemo(() => rankEngineers(engineers, req), [engineers, req]);
  const byProfession = useMemo(() => {
    const map = new Map<ConstructionProfession, ProfessionalProfile[]>();
    for (const p of profiles) {
      const arr = map.get(p.profession) ?? [];
      arr.push(p);
      map.set(p.profession, arr);
    }
    return map;
  }, [profiles]);

  const categoryMatches: ProfessionalMatchResult[] = useMemo(() => {
    if (category === 'engineer') return [];
    return rankProfessionals(byProfession.get(category as ConstructionProfession) ?? [], req).slice(0, 4);
  }, [category, byProfession, req]);

  const categoryEngineers = category === 'engineer' ? engineerMatches.slice(0, 4) : [];

  // ---- AI Recommended Construction Team ---------------------------------
  // Real-data picks per role. A role with no directory data shows "Not enough data".
  const team = useMemo(() => {
    const roles: { key: ConstructionProfession; label: string; emoji: string }[] = [
      { key: 'plumber', label: 'Plumber', emoji: '🔧' },
      { key: 'electrician', label: 'Electrician', emoji: '⚡' },
      { key: 'carpenter', label: 'Carpenter', emoji: '🪚' },
      { key: 'material_shop', label: 'Material Supplier', emoji: '🏬' },
    ];
    return roles.map((role) => ({
      role,
      match: rankProfessionals(byProfession.get(role.key) ?? [], req)[0] ?? null,
    }));
  }, [engineerMatches, byProfession, req]);

  const coordinationProject = activeProject;

  if (loading) return <LoadingState text="Loading construction team directory..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Section header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-6 h-6 text-royal-600" />
          <h2 className="text-xl font-bold text-navy-900">Construction Team</h2>
        </div>
        <p className="muted text-sm">Find, compare and AI-match the right professionals for your project.</p>
      </div>

      {/* ============ AI RECOMMENDED CONSTRUCTION TEAM ============ */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-royal-600" />
          <h3 className="text-lg font-bold text-navy-900">AI Recommended Construction Team</h3>
          <Badge variant="royal">AI match</Badge>
        </div>
        <p className="text-xs muted mb-4">
          Built from real directory data ranked against your requirements ({req.location}, {req.house_type} · {req.area_sqft} sq.ft · {formatINR(req.budget)}). Every score is explained — no simulated compatibility scores.
        </p>

        <div className="max-w-2xl">
          {/* Engineer */}
          {(() => {
            const eng = engineerMatches[0] ?? null;
            return (
              <TeamSlot
                emoji="👷"
                label="Engineer"
                name={eng?.engineer.name ?? null}
                verified={eng?.engineer.verification_status === 'verified'}
                reason={eng?.explanation ?? 'Not enough data — no engineers available for these requirements.'}
                onView={eng ? () => navigate(`/app/engineers/${eng.engineer.id}`) : undefined}
              />
            );
          })()}
          <ArrowDown className="w-4 h-4 text-navy-300 mx-auto my-0.5" />
          {team.map(({ role, match }) => (
            <div key={role.key}>
              <TeamSlot
                emoji={role.emoji}
                label={role.label}
                name={match ? (match.profile.business_name ?? match.profile.name) : null}
                verified={match?.profile.verification_status === 'verified'}
                reason={match?.explanation ?? 'Not enough data — no profiles recorded for this role yet.'}
                onView={match ? () => setDetail(match) : undefined}
              />
              <ArrowDown className="w-4 h-4 text-navy-300 mx-auto my-0.5" />
            </div>
          ))}
        </div>

        {coordinationProject && (
          <div className="mt-4 bg-royal-50 border border-royal-100 rounded-xl p-4 flex items-start gap-3 flex-wrap">
            <Award className="w-5 h-5 text-royal-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-[220px]">
              <p className="text-sm font-semibold text-navy-900">Engineer coordination on "{coordinationProject.title}"</p>
              <p className="text-xs muted mt-0.5">
                Your selected engineer can recommend the working team for this project. Accepted professionals become connected through the existing project-team and request system.
              </p>
            </div>
            <button onClick={() => navigate(`/app/projects/${coordinationProject.id}`)} className="btn-primary text-sm">
              View Team Coordination <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ============ CATEGORY DIRECTORY ============ */}
      <div className="card p-6">
        <h3 className="text-lg font-bold text-navy-900 mb-1">Browse by Profession</h3>
        <p className="text-xs muted mb-4">Select a category to see real professionals with AI match scores for your project.</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {CATEGORIES.map((c) => {
            const count = c.key === 'engineer' ? engineers.length : (byProfession.get(c.key as ConstructionProfession) ?? []).length;
            const active = category === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`text-left rounded-xl border p-4 transition-all ${active ? 'border-royal-500 bg-royal-50 shadow-glow' : 'border-navy-100 hover:border-navy-300 hover:bg-navy-50'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{c.emoji}</span>
                  {count > 0 ? <Badge variant={active ? 'royal' : 'navy'}>{count} pro{count === 1 ? '' : 's'}</Badge> : <Badge variant="warning">No data</Badge>}
                </div>
                <p className="font-semibold text-navy-900 text-sm">{c.label}</p>
                <p className="text-[11px] muted mt-0.5">{c.blurb}</p>
              </button>
            );
          })}
        </div>

        {/* Category results */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-navy-900">{categoryLabel(category)} — AI Recommendations</h4>
            <Badge variant="navy">Explainable scoring</Badge>
          </div>
          <button onClick={() => navigate('/app/ai-match')} className="btn-ghost text-sm">Full AI Match <ArrowRight className="w-4 h-4" /></button>
        </div>

        {category === 'engineer' ? (
          categoryEngineers.length === 0 ? (
            <p className="text-sm muted bg-navy-50 rounded-xl p-3">Not enough data — no engineers are available for these requirements.</p>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-2 gap-4">
              {categoryEngineers.map((m) => (
                <ProfessionalCard
                  key={m.engineer.id}
                  emoji="👷"
                  name={m.engineer.name}
                  verified={m.engineer.verification_status === 'verified'}
                  location={m.engineer.location}
                  experience={`${m.engineer.experience_years} yrs · ${m.engineer.projects_completed} projects`}
                  rating={m.engineer.rating}
                  reviews={m.engineer.reviews_count}
                  availability={m.engineer.availability}
                  skills={m.engineer.specializations}
                  score={m.overallScore}
                  topFactor={m.factors[0]}
                  explanation={m.explanation}
                  price={m.engineer.price_per_sqft > 0 ? `₹${m.engineer.price_per_sqft}/sq.ft` : undefined}
                  onView={() => navigate(`/app/engineers/${m.engineer.id}`)}
                />
              ))}
            </div>
          )
        ) : categoryMatches.length === 0 ? (
          <p className="text-sm muted bg-navy-50 rounded-xl p-3">
            Not enough data — no {categoryLabel(category).toLowerCase()} profiles are recorded in the directory yet. New professionals appear here as they join and get verified.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-2 gap-4">
            {categoryMatches.map((m) => {
              const p = m.profile;
              return (
                <ProfessionalCard
                  key={p.id}
                  emoji={CATEGORIES.find((c) => c.key === p.profession)?.emoji ?? '👷'}
                  name={p.business_name ?? p.name}
                  verified={p.verification_status === 'verified'}
                  location={p.location}
                  experience={`${p.experience_years} yrs · ${p.projects_completed} projects`}
                  rating={p.rating}
                  reviews={p.reviews_count}
                  availability={p.availability}
                  skills={p.specializations.concat(p.skills).slice(0, 4)}
                  score={m.overallScore}
                  topFactor={m.factors[0]}
                  explanation={m.explanation}
                  price={p.price_per_visit > 0 ? formatINR(p.price_per_visit) + '/visit' : undefined}
                  onView={() => setDetail(m)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Detail modal — full score breakdown */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? (detail.profile.business_name ?? detail.profile.name) : ''} maxWidth="max-w-xl">
        {detail && <MatchDetail match={detail} />}
      </Modal>
    </div>
  );
}

function TeamSlot({ emoji, label, name, verified, reason, onView }: {
  emoji: string; label: string; name: string | null; verified?: boolean; reason: string; onView?: () => void;
}) {
  return (
    <div className="w-full border border-navy-100 rounded-xl p-3 flex items-center gap-3 bg-white">
      <div className="w-10 h-10 rounded-xl bg-royal-50 text-royal-700 flex items-center justify-center text-lg shrink-0">{emoji}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-navy-400 font-semibold">{label}</p>
        {name ? (
          <p className="text-sm font-semibold text-navy-900 truncate">{name} {verified && <VerifiedBadge size="xs" />}</p>
        ) : (
          <p className="text-sm text-navy-500">Not enough data</p>
        )}
        <p className="text-[11px] muted mt-0.5 line-clamp-2">{reason}</p>
      </div>
      {onView && <button onClick={onView} className="btn-ghost text-xs py-1 shrink-0">Details</button>}
    </div>
  );
}

function ProfessionalCard({ emoji, name, verified, location, experience, rating, reviews, availability, skills, score, topFactor, explanation, price, onView }: {
  emoji: string; name: string; verified?: boolean; location: string; experience: string; rating: number; reviews: number;
  availability: string; skills: string[]; score: number; topFactor: { label: string; score: number; reason: string } | undefined;
  explanation: string; price?: string; onView: () => void;
}) {
  return (
    <div className="border border-navy-100 rounded-xl p-5 card-hover hover:border-navy-200 transition-all">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-royal-50 text-royal-700 flex items-center justify-center text-xl shrink-0">{emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-navy-900 truncate">{name}</p>
            {verified && <VerifiedBadge size="xs" />}
          </div>
          <p className="text-xs muted truncate">{location} · {experience}</p>
          <div className="flex items-center gap-1 mt-1">
            <RatingStars rating={rating} size="xs" />
            <span className="text-[11px] muted">{rating} ({reviews})</span>
            <span className="text-[11px] muted ml-1">· {availability}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-bold text-royal-600">{score}%</p>
          <p className="text-[10px] muted">Match</p>
        </div>
      </div>
      <p className="text-xs text-navy-600 bg-navy-50 rounded-lg p-2 mb-2 line-clamp-3">{explanation}</p>
      <div className="flex flex-wrap gap-1 mb-3">
        {skills.slice(0, 3).map((s) => <Badge key={s} variant="navy">{s}</Badge>)}
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {topFactor ? (
          <p className="text-[11px] muted flex items-center gap-1 min-w-0"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /><span className="truncate"><strong>{topFactor.label}</strong> — {topFactor.reason}</span></p>
        ) : (
          <p className="text-[11px] muted">Not enough data</p>
        )}
        <button onClick={onView} className="btn-secondary text-xs py-1.5 shrink-0"><Info className="w-3.5 h-3.5" /> Details</button>
      </div>
      {price && <p className="text-[11px] text-navy-500 mt-2"><Wallet className="w-3 h-3 inline mr-1" />{price}</p>}
    </div>
  );
}

function MatchDetail({ match }: { match: ProfessionalMatchResult }) {
  const p = match.profile;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <img src={personPhoto(p.photo_url, p.profession)} alt="" onError={(e) => onPersonImgError(e, p.profession)} className="w-14 h-14 rounded-xl object-cover" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-lg font-bold text-navy-900">{p.business_name ?? p.name}</p>
            {p.verification_status === 'verified' && <VerifiedBadge />}
          </div>
          <p className="text-xs muted capitalize">{p.profession.replace('_', ' ')} · {p.location}{p.service_area ? ` · serves ${p.service_area}` : ''}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-3xl font-bold text-royal-600">{match.overallScore}%</p>
          <p className="text-[10px] muted">Match Score</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
        <Field label="Verification" value={p.verification_status === 'verified' ? 'Verified' : p.verification_status === 'rejected' ? 'Rejected' : 'Pending'} />
        <Field label="Availability" value={p.availability || '—'} />
        <Field label="Experience" value={`${p.experience_years} years`} />
        <Field label="Projects completed" value={String(p.projects_completed)} />
        <Field label="Rating" value={p.rating > 0 ? `${p.rating} ★ (${p.reviews_count} reviews)` : 'Not enough data'} />
        <Field label="Visit fee" value={p.price_per_visit > 0 ? formatINR(p.price_per_visit) : '—'} />
      </div>

      <p className="text-sm text-navy-700"><span className="font-semibold">Skills / specialisations: </span>{p.specializations.concat(p.skills).slice(0, 8).join(', ') || '—'}</p>
      {p.qualification && <p className="text-sm text-navy-700"><span className="font-semibold">Qualification: </span>{p.qualification}</p>}

      <div>
        <p className="text-sm font-semibold text-navy-900 mb-2">Score Breakdown</p>
        <div className="space-y-2.5">
          {match.factors.map((f) => (
            <div key={f.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-navy-700">{f.label} <span className="muted">({Math.round(f.weight * 100)}%)</span></span>
                <span className="font-semibold text-navy-900">{f.score}%</span>
              </div>
              <ProgressBar value={f.score} color={f.score >= 85 ? 'emerald' : f.score >= 70 ? 'royal' : 'amber'} />
              <p className="text-[11px] muted mt-0.5">{f.reason}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-navy-50 rounded-xl p-3 text-sm text-navy-700"><strong>Why recommended:</strong> {match.explanation}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="bg-navy-50 rounded-lg p-2"><p className="text-[10px] muted uppercase tracking-wide">{label}</p><p className="font-semibold text-navy-900 text-xs mt-0.5">{value}</p></div>;
}