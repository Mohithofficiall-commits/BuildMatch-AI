import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Sparkles, MapPin, Star, ShieldCheck, CheckCircle2, XCircle, MinusCircle,
  ArrowDown, GitCompareArrows, Info, CalendarClock, Wallet, Award, BadgeCheck,
  ClipboardList, Search,
} from 'lucide-react';
import { rankEngineers } from '@/lib/matching';
import { useCompare } from '@/lib/compare';
import { fetchProjects, fetchProjectMembers } from '@/lib/data';
import type {
  Project, ProjectMemberJoined, ProfessionalRequestJoined, Engineer, ProfessionalProfile,
  ProfessionalType, ProjectRequirement,
} from '@/lib/types';
import { Badge, VerifiedBadge, RatingStars, LoadingState, formatINR, formatDate, Modal } from '@/components/ui';
import { memberStatus, requestStatus } from '@/components/professional/statuses';
import { personPhoto, onPersonImgError } from '@/lib/people';

interface TeamCenterProps {
  project: Project;
  engineers: Engineer[];
  profiles: ProfessionalProfile[];
  members: ProjectMemberJoined[];
  proRequests: ProfessionalRequestJoined[];
  onInvite: (type: ProfessionalType, preselectUserId?: string) => void;
}

const ROLE_ORDER: ProfessionalType[] = ['engineer', 'plumber', 'electrician', 'material_shop'];
const ROLE_EMOJI: Record<ProfessionalType, string> = { engineer: '👷', plumber: '🔧', electrician: '⚡', material_shop: '🏬' };

type DetailRow = { kind: 'engineer'; engineer: Engineer } | { kind: 'profile'; profile: ProfessionalProfile };

/** True when the union member is a ProfessionalProfile (only they carry `profession`). */
function isProfile(row: Engineer | ProfessionalProfile): row is ProfessionalProfile {
  return 'profession' in row;
}

function lower(s?: string | null): string {
  return (s ?? '').toLowerCase();
}

/** True/False/undefined when the strings give no information. */
function areaCovers(profileLocation: string | null | undefined, serviceArea: string | null | undefined, projectLocation: string): boolean | undefined {
  const loc = lower(projectLocation);
  const direct = lower(profileLocation);
  const area = lower(serviceArea);
  if (!direct && !area) return undefined;
  if (direct && (direct === loc || direct.includes(loc) || loc.includes(direct))) return true;
  if (area && (area.includes(loc) || loc.split(',').some((t) => area.includes(lower(t.trim()))))) return true;
  return direct || area ? false : undefined;
}

export default function TeamCenter({ project, engineers, profiles, members, proRequests, onInvite }: TeamCenterProps) {
  const navigate = useNavigate();
  const { engineerIds, toggle, has } = useCompare();
  const [focusedEngineerId, setFocusedEngineerId] = useState<string | null>(project.engineer?.id ?? null);
  const [detail, setDetail] = useState<DetailRow | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allMembers, setAllMembers] = useState<ProjectMemberJoined[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [compareType, setCompareType] = useState<ProfessionalType>('engineer');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [projs, mems] = await Promise.all([fetchProjects().catch(() => []), fetchProjectMembers().catch(() => [])]);
        setAllProjects(projs);
        setAllMembers(mems);
      } catch { /* ignore */ } finally { setHistoryLoading(false); }
    })();
  }, []);

  const req: ProjectRequirement = useMemo(() => ({
    location: project.location,
    budget: project.budget,
    house_type: project.house_type,
    area_sqft: project.area_sqft,
    construction_style: project.construction_style,
    expected_completion: project.expected_completion ?? undefined,
  }), [project]);

  const matches = useMemo(() => rankEngineers(engineers, req).slice(0, 6), [engineers, req]);

  const compareCandidates = useMemo(() => {
    const arr = compareType === 'engineer'
      ? matches.map((m) => m.engineer)
      : profiles.filter((p) => p.profession === compareType);
    return arr;
  }, [compareType, matches, profiles]);

  const isOnTeam = (userId?: string | null) => Boolean(userId && (
    members.some((m) => m.user_id === userId) ||
    proRequests.some((r) => r.professional_id === userId && (r.status === 'accepted' || r.status === 'completed'))
  ));

  const userKey = (row: Engineer | ProfessionalProfile) => row.id;

  const toggleSelect = (key: string) => {
    setSelectedIds((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : prev.length >= 4 ? prev : [...prev, key]);
  };

  const compareSelected = compareCandidates.filter((c) => selectedIds.includes(userKey(c)));

  const metricRows: { label: string; value: (row: Engineer | ProfessionalProfile) => string }[] = [
    { label: 'Verification', value: (r) => r.verification_status === 'verified' ? 'Verified' : r.verification_status === 'rejected' ? 'Rejected' : 'Pending' },
    { label: 'Experience', value: (r) => `${r.experience_years} years` },
    { label: 'Projects completed', value: (r) => String(r.projects_completed) },
    { label: 'Rating', value: (r) => `${r.rating} (${r.reviews_count} reviews)` },
    { label: 'Availability', value: (r) => r.availability },
    { label: 'Location', value: (r) => r.location },
    { label: 'Service area', value: (r) => isProfile(r) ? (r.service_area ?? '—') : r.location },
    { label: 'Skills / specialisation', value: (r) => (r.specializations ?? []).slice(0, 3).join(', ') || '—' },
    { label: 'Price', value: (r) => isProfile(r) ? (r.price_per_visit > 0 ? `${formatINR(r.price_per_visit)}/visit` : '—') : `₹${r.price_per_sqft}/sq.ft` },
    { label: 'Engaged on this project', value: (r) => isOnTeam(r.user_id) ? 'Yes' : 'No' },
  ];

  const focusedEngineer = focusedEngineerId
    ? (project.engineer?.id === focusedEngineerId ? project.engineer : engineers.find((e) => e.id === focusedEngineerId)) ?? null
    : null;

  const userToProfile = useMemo(() => {
    const map = new Map<string, Engineer | ProfessionalProfile>();
    for (const e of engineers) if (e.user_id) map.set(e.user_id, e);
    for (const p of profiles) map.set(p.user_id, p);
    return map;
  }, [engineers, profiles]);

  const collabByUser = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!focusedEngineer) return map;
    const prior = allProjects.filter((p) => p.engineer_id === focusedEngineer.id && p.id !== project.id);
    for (const p of prior) {
      for (const m of allMembers) {
        if (m.project_id === p.id && m.user_id) {
          const arr = map.get(m.user_id) ?? [];
          arr.push(`${p.title} (${formatDate(p.start_date)})`);
          map.set(m.user_id, arr);
        }
      }
    }
    return map;
  }, [focusedEngineer, allProjects, allMembers, project.id]);

  if (historyLoading) return <LoadingState text="Analysing project team data..." />;

  const engMembers = members.filter((m) => m.role === 'engineer');
  const reqByType = (type: ProfessionalType) => proRequests.filter((r) => r.professional_type === type);

  // --- Slots for the pipeline / team view -------------------------------
  const slots = ROLE_ORDER.map((role) => {
    const engaged: { name: string; photo?: string | null; verified: boolean; statusText: string; source: 'member' | 'assigned' | 'request'; userId?: string; engineerId?: string }[] = [];

    if (role === 'engineer') {
      if (focusedEngineer && focusedEngineer.user_id && members.some((m) => m.role === 'engineer' && m.user_id === focusedEngineer.user_id)) {
        // covered by member rows below
      } else if (focusedEngineer) {
        engaged.push({
          name: focusedEngineer.name, photo: focusedEngineer.photo_url,
          verified: focusedEngineer.verification_status === 'verified',
          statusText: 'Assigned engineer', source: 'assigned', userId: focusedEngineer.user_id ?? undefined, engineerId: focusedEngineer.id,
        });
      }
    }

    for (const m of engMembers.length > 0 && role === 'engineer' ? engMembers : []) {
      const prof = m.user_id ? userToProfile.get(m.user_id) : undefined;
      const st = memberStatus(m.status);
      engaged.push({
        name: m.member_user?.name ?? 'Professional',
        photo: m.member_user?.avatar_url,
        verified: prof?.verification_status === 'verified',
        statusText: `Project member · ${st.label}`,
        source: 'member', userId: m.user_id,
      });
    }

    for (const r of reqByType(role)) {
      const user = userToProfile.get(r.professional_id);
      const st = requestStatus(r.status);
      if (r.status === 'declined' || r.status === 'cancelled') continue;
      engaged.push({
        name: user ? (isProfile(user) ? (user.business_name ?? user.name) : user.name) : 'Professional',
        photo: user?.photo_url ?? undefined,
        verified: user?.verification_status === 'verified',
        statusText: `Request ${st.label.toLowerCase()}`,
        source: 'request', userId: r.professional_id,
      });
    }

    return { role, engaged };
  });

  const roleSlots = ROLE_ORDER.map((role) => {
    const candidateProfiles = role === 'engineer' ? [] : profiles.filter((p) => p.profession === role);
    const candidates = role === 'engineer'
      ? matches.map((m) => m.engineer)
      : candidateProfiles;
    return { role, candidates };
  });

  // --- Team fit check (real data only) ------------------------------------
  const fitRows = ROLE_ORDER.map((role) => {
    const engaged = slots.find((s) => s.role === role)?.engaged ?? [];
    const engagedRow = engaged[0];
    const row = engagedRow?.userId ? userToProfile.get(engagedRow.userId) : role === 'engineer' && focusedEngineer ? focusedEngineer : undefined;
    return { role, engaged, row };
  });

  const noData = fitRows.every((f) => !f.engaged.length);
  const incompleteRoles = fitRows.filter((f) => !f.engaged.length).map((f) => f.role);
  const engagedCount = fitRows.filter((f) => f.engaged.length).length;
  const verifiedCount = fitRows.filter((f) => f.row?.verification_status === 'verified').length;

  const verdict =
    noData
      ? 'Not enough data to evaluate this team — no professionals are engaged on the project yet. Request professionals to start building your team.'
      : incompleteRoles.length > 0
        ? `Not enough data for a full team fit — ${incompleteRoles.map((r) => r.replace('_', ' ')).join(', ')} ${incompleteRoles.length === 1 ? 'is' : 'are'} not engaged yet. Engaged professionals are checked below against real profile data.`
        : verifiedCount === 4
          ? 'All four roles are engaged and verified. The recorded profiles, locations and credentials fit this project — this is your working team.'
          : `${engagedCount} of 4 roles are engaged (${verifiedCount} verified). Fit is evaluated below from real profile data; no simulated compatibility score is used.`;

  return (
    <div className="space-y-6">
      {/* ================= RECOMMENDED ENGINEERS ================= */}
      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-royal-600" />
              <h2 className="text-lg font-bold text-navy-900">Recommended Engineers</h2>
              <Badge variant="royal">AI match</Badge>
            </div>
            <p className="text-xs muted">Ranked with the existing BuildMatch matching engine against this project's real requirements ({project.location}, {project.house_type}, {formatINR(project.budget)}).</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/app/ai-match')} className="btn-ghost text-sm">Full AI Match</button>
            {engineerIds.length > 0 && (
              <button onClick={() => navigate('/app/compare')} className="btn-primary text-sm"><GitCompareArrows className="w-4 h-4" /> Compare ({engineerIds.length})</button>
            )}
          </div>
        </div>

        {matches.length === 0 ? (
          <p className="text-sm muted">Not enough data — no engineers are available for this project's requirements.</p>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {matches.map((m) => {
              const e = m.engineer;
              const focused = focusedEngineerId === e.id;
              return (
                <div key={e.id} className={`border rounded-xl p-4 transition-all ${focused ? 'border-royal-300 bg-royal-50/40 shadow-glow' : 'border-navy-100 hover:border-navy-200'}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <img src={personPhoto(e.photo_url, 'engineer')} alt="" onError={(e) => onPersonImgError(e, 'engineer')} className="w-12 h-12 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-navy-900 truncate">{e.name}</p>
                        {e.verification_status === 'verified' && <VerifiedBadge size="xs" />}
                      </div>
                      <p className="text-xs muted truncate">{e.location} · {e.experience_years} yrs · {e.qualification}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <RatingStars rating={e.rating} size="xs" />
                        <span className="text-[11px] muted">{e.rating} ({e.reviews_count})</span>
                        <span className="text-[11px] muted ml-1">· {e.availability}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-royal-600">{m.overallScore}%</p>
                      <p className="text-[10px] muted">Match</p>
                    </div>
                  </div>
                  <p className="text-xs text-navy-600 bg-navy-50 rounded-lg p-2 mb-2 line-clamp-3">{m.explanation}</p>
                  <div className="space-y-1 mb-3">
                    {m.factors.slice(0, 3).map((f) => (
                      <p key={f.label} className="text-[11px] muted flex items-start gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" /><span><strong>{f.label}</strong> — {f.reason}</span></p>
                    ))}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setFocusedEngineerId(e.id)} className={`btn text-xs py-1.5 flex-1 ${focused ? 'bg-navy-900 text-white' : 'btn-secondary'}`}>View with Team</button>
                    <button onClick={() => toggle(e.id)} className={`btn text-xs py-1.5 px-2.5 ${has(e.id) ? 'bg-royal-600 text-white' : 'btn-secondary'}`} title="Add to compare">
                      <GitCompareArrows className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => navigate(`/app/engineers/${e.id}`)} className="btn-secondary text-xs py-1.5 px-2.5" title="View full profile"><Search className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {e.user_id ? (
                      <button onClick={() => onInvite('engineer', e.user_id ?? undefined)} className="btn-primary text-xs py-1.5 flex-1"><ShieldCheck className="w-3.5 h-3.5" /> Request for this Project</button>
                    ) : (
                      <span className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-2 py-1 flex items-center gap-1"><Info className="w-3 h-3" /> No linked account to request yet — view profile</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= ENGINEER'S TEAM (real engagements only) ================= */}
      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-royal-600" />
            <h2 className="text-lg font-bold text-navy-900">Team Around the Engineer</h2>
          </div>
          <Badge variant="navy">{focusedEngineer ? focusedEngineer.name : 'No engineer selected'}</Badge>
        </div>
        <p className="text-xs muted mb-4">
          Shows only real data recorded for this project — project members, requests and accepted professionals. BuildMatch has no recorded engineer-to-professional endorsements yet, so nothing is guessed. Candidates listed below are directory professionals operating in this area, ready for you to request.
        </p>

        {!focusedEngineer && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">Select an engineer above to see which professionals are engaged around them.</p>
        )}

        <div className="grid lg:grid-cols-2 gap-5">
          {ROLE_ORDER.filter((r) => r !== 'engineer').map((role) => {
            const slot = slots.find((s) => s.role === role);
            const engaged = slot?.engaged ?? [];
            const roleCandidates = roleSlots.find((s) => s.role === role)?.candidates ?? [];
            const inArea = roleCandidates.filter((c) => areaCovers(c.location, isProfile(c) ? c.service_area : null, project.location) !== false);
            const candidates = inArea.length > 0 ? inArea : roleCandidates;

            return (
              <div key={role} className="border border-navy-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-navy-900">{ROLE_EMOJI[role]} {role.replace('_', ' ')}</p>
                  {engaged.length > 0 ? <Badge variant="success">{engaged[0].statusText}</Badge> : <Badge variant="warning">Not engaged</Badge>}
                </div>

                {engaged.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {engaged.map((eg, i) => {
                      const prof = eg.userId ? userToProfile.get(eg.userId) : undefined;
                      const collab = eg.userId ? collabByUser.get(eg.userId) : undefined;
                      return (
                        <div key={i} className="flex items-start gap-2.5 bg-emerald-50/60 border border-emerald-100 rounded-lg p-2.5">
                          <img src={personPhoto(eg.photo, role)} alt="" onError={(e) => onPersonImgError(e, role)} className="w-8 h-8 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-navy-900">{eg.name} {eg.verified && <VerifiedBadge size="xs" />}</p>
                            {prof && (
                              <p className="text-[11px] muted">
                                {prof.verification_status === 'verified' ? 'Verified' : prof.verification_status === 'rejected' ? 'Rejected' : 'Pending verification'} · {prof.experience_years} yrs · {prof.availability}
                                · {prof.rating}★ ({prof.reviews_count})
                              </p>
                            )}
                            {collab && collab.length > 0 && (
                              <p className="text-[11px] text-royal-700"><Award className="w-3 h-3 inline mr-0.5" /> Previously on {collab.join(', ')}</p>
                            )}
                          </div>
                          <button onClick={() => prof && setDetail(isProfile(prof) ? { kind: 'profile', profile: prof } : { kind: 'engineer', engineer: prof })} className="btn-ghost text-xs py-1"><Info className="w-3.5 h-3.5" /> Details</button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs muted mb-2">Not enough data — no {role.replace('_', ' ')} is engaged on this project with {focusedEngineer?.name ?? 'the engineer'} yet.</p>
                )}

                {candidates.length > 0 && (
                  <>
                    <p className="text-[11px] uppercase tracking-wide text-navy-400 font-semibold mb-2">Candidates in the area</p>
                    <div className="space-y-2">
                      {candidates.slice(0, 3).map((c) => {
                        const userId = c.user_id ?? undefined;
                        const name = isProfile(c) ? (c.business_name ?? c.name) : c.name;
                        const verified = c.verification_status === 'verified';
                        const already = isOnTeam(userId);
                        const collab = userId ? collabByUser.get(userId) : undefined;
                        return (
                          <div key={c.id} className="flex items-start gap-2 border border-navy-100 rounded-lg p-2.5">
                            <img src={personPhoto(c.photo_url, role)} alt="" onError={(e) => onPersonImgError(e, role)} className="w-8 h-8 rounded-lg object-cover" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-navy-900 truncate">{name} {verified && <VerifiedBadge size="xs" />} {already && <Badge variant="success">On team</Badge>}</p>
                              <p className="text-[11px] muted truncate">
                                {(c.specializations ?? []).slice(0, 3).join(', ') || '—'} · {c.experience_years} yrs · {c.availability}
                              </p>
                              {collab && collab.length > 0 && (
                                <p className="text-[11px] text-royal-700"><Award className="w-3 h-3 inline mr-0.5" /> Worked with {focusedEngineer?.name ?? 'the engineer'} before: {collab.join(', ')}</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <button onClick={() => setDetail(isProfile(c) ? { kind: 'profile', profile: c } : { kind: 'engineer', engineer: c })} className="btn-ghost text-xs py-1">Details</button>
                              {!already && (userId ? (
                                <button onClick={() => onInvite(role, userId ?? undefined)} className="btn-primary text-[11px] py-1 px-2.5">Request</button>
                              ) : (
                                <span className="text-[10px] muted" title="No linked BuildMatch account">Request unavailable</span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                {candidates.length === 0 && <p className="text-xs muted">Not enough data — no {role.replace('_', ' ')} profiles exist in the directory for this area.</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= TEAM MATCH / FIT ================= */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-navy-900">Team Match — fit against this project</h2>
        </div>
        <p className="text-xs muted mb-4">Every check is computed from real database fields. Where data is missing the row shows “—”; no simulated scores are produced.</p>

        {noData ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">{verdict}</p>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-3 mb-4">
              {fitRows.map(({ role, engaged, row }) => (
                <div key={role} className="border border-navy-100 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-navy-900">{ROLE_EMOJI[role]} {role.replace('_', ' ')}</p>
                    {engaged.length === 0 ? <Badge variant="warning">Not engaged</Badge> : row?.verification_status === 'verified' ? <Badge variant="success">Verified</Badge> : <Badge variant="navy">{row ? row.verification_status : 'Engaged'}</Badge>}
                  </div>
                  {engaged.length === 0 ? (
                    <p className="text-xs muted">Not enough data — no professional engaged for this role.</p>
                  ) : !row ? (
                    <p className="text-xs muted">Engaged on the project (real record), but no detailed profile data is available yet.</p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-navy-700">
                      <li className="flex items-center gap-1.5">
                        {row.verification_status === 'verified' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <MinusCircle className="w-3.5 h-3.5 text-navy-300 shrink-0" />}
                        Verification: <strong>{row.verification_status}</strong>
                      </li>
                      <li className="flex items-center gap-1.5">
                        {areaCovers(row.location, isProfile(row) ? row.service_area : null, project.location) === true
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          : <MinusCircle className="w-3.5 h-3.5 text-navy-300 shrink-0" />}
                        Location: {row.location} {row.location === project.location ? '(matches project city)' : `(project: ${project.location})`}
                      </li>
                      <li className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-navy-400 shrink-0" /> Availability: <strong>{row.availability}</strong></li>
                      <li className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-400 shrink-0" /> {row.experience_years} yrs experience · {row.projects_completed} projects completed</li>
                      <li className="flex items-start gap-1.5"><ClipboardList className="w-3.5 h-3.5 text-navy-400 shrink-0 mt-0.5" /> Skills: {(row.specializations ?? []).slice(0, 3).join(', ') || '—'}</li>
                      {engaged[0].statusText && <li className="text-[11px] muted">Relationship: {engaged[0].statusText}</li>}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <div className="bg-navy-50 rounded-xl p-3 text-sm text-navy-700"><strong>Fit summary:</strong> {verdict}</div>
          </>
        )}
      </div>

      {/* ================= COMPLETE TEAM VIEW (pipeline) ================= */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-1">
          <ArrowDown className="w-5 h-5 text-royal-600" />
          <h2 className="text-lg font-bold text-navy-900">Recommended Project Team</h2>
        </div>
        <p className="text-xs muted mb-4">The working team recorded for this project. Unfilled roles are waiting for a request or acceptance — nothing is assumed.</p>

        <div className="max-w-xl mx-auto">
          {ROLE_ORDER.map((role, i) => {
            const slot = slots.find((s) => s.role === role);
            const first = slot?.engaged[0];
            return (
              <div key={role} className="flex flex-col items-center">
                <div className="w-full border border-navy-100 rounded-xl p-3 flex items-center gap-3 bg-white">
                  <div className="w-10 h-10 rounded-xl bg-royal-50 text-royal-700 flex items-center justify-center text-lg shrink-0">{ROLE_EMOJI[role]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-navy-400 font-semibold">{role.replace('_', ' ')}</p>
                    {first ? (
                      <p className="text-sm font-semibold text-navy-900 truncate">
                        {first.name} {first.verified && <VerifiedBadge size="xs" />}
                        <span className="font-normal text-xs muted"> · {first.statusText}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-navy-500">Not yet — request from the candidates above</p>
                    )}
                  </div>
                  {first?.userId && (
                    <button onClick={() => { const u = userToProfile.get(first.userId ?? ''); setDetail(u ? (isProfile(u) ? { kind: 'profile', profile: u } : { kind: 'engineer', engineer: u }) : null); }} className="btn-ghost text-xs py-1 shrink-0">Details</button>
                  )}
                </div>
                {i < ROLE_ORDER.length - 1 && <ArrowDown className="w-4 h-4 text-navy-300 my-0.5" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= COMPARISON ================= */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-1">
          <GitCompareArrows className="w-5 h-5 text-royal-600" />
          <h2 className="text-lg font-bold text-navy-900">Compare Professionals</h2>
        </div>
        <p className="text-xs muted mb-3">Pick up to 4 candidates in one category. “Recommended” marks professionals already engaged on this project — only real team members are flagged.</p>

        <div className="flex gap-2 flex-wrap mb-4">
          {ROLE_ORDER.map((r) => (
            <button key={r} onClick={() => { setCompareType(r); setSelectedIds([]); }} className={`btn text-sm capitalize ${compareType === r ? 'bg-navy-900 text-white' : 'btn-secondary'}`}>
              {ROLE_EMOJI[r]} {r.replace('_', ' ')}
            </button>
          ))}
        </div>

        {compareCandidates.length === 0 ? (
          <p className="text-sm muted bg-navy-50 rounded-xl p-3">Not enough data — no {compareType.replace('_', ' ')} profiles are available in the directory for comparison.</p>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
              {compareCandidates.slice(0, 8).map((c) => {
                const key = userKey(c);
                const userId = c.user_id ?? undefined;
                const name = isProfile(c) ? (c.business_name ?? c.name) : c.name;
                const photo = c.photo_url;
                const selected = selectedIds.includes(key);
                const onTeam = isOnTeam(userId);
                return (
                  <button
                    key={key}
                    onClick={() => toggleSelect(key)}
                    className={`border rounded-xl p-3 text-left transition-all ${selected ? 'border-royal-500 bg-royal-50' : 'border-navy-100 hover:border-navy-300'}`}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <img src={personPhoto(photo, compareType)} alt="" onError={(e) => onPersonImgError(e, compareType)} className="w-9 h-9 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-navy-900 truncate">{name}</p>
                        <p className="text-[11px] muted truncate">{c.location}</p>
                      </div>
                      {onTeam && <Badge variant="success">Recommended</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <RatingStars rating={c.rating} size="xs" />
                      <span className="text-[11px] muted">{c.rating} ({c.reviews_count})</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {compareSelected.length < 2 ? (
              <p className="text-sm muted text-center">Select at least two professionals to compare side-by-side.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-navy-100">
                      <th className="text-left p-2 text-sm font-semibold text-navy-700">Metric</th>
                      {compareSelected.map((c) => {
                        const key = userKey(c);
                        const userId = c.user_id ?? undefined;
                        const name = isProfile(c) ? (c.business_name ?? c.name) : c.name;
                        return (
                          <th key={key} className="p-2 text-left min-w-[160px]">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-navy-900 text-sm truncate">{name}</span>
                              {isOnTeam(userId) && <Badge variant="success">Recommended</Badge>}
                              <button onClick={() => toggleSelect(key)} className="text-navy-300 hover:text-rose-500 ml-auto"><XCircle className="w-4 h-4" /></button>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {metricRows.map((row) => (
                      <tr key={row.label} className="border-b border-navy-50 align-top">
                        <td className="p-2 text-sm font-medium text-navy-700">{row.label}</td>
                        {compareSelected.map((c) => (
                          <td key={userKey(c)} className="p-2 text-sm text-navy-900">{row.value(c)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? (detail.kind === 'engineer' ? detail.engineer.name : detail.profile.business_name ?? detail.profile.name) : ''} maxWidth="max-w-xl">
        {detail && (
          <DetailBody
            row={detail}
            project={project}
            onRequest={(type) => {
              onInvite(type, detail.kind === 'engineer' ? detail.engineer.user_id ?? undefined : detail.profile.user_id);
              setDetail(null);
            }}
            collab={detail.kind === 'engineer' ? undefined : collabByUser.get(detail.profile.user_id)}
          />
        )}
      </Modal>
    </div>
  );
}

function DetailBody({ row, project, onRequest, collab }: {
  row: DetailRow;
  project: Project;
  onRequest: (type: ProfessionalType) => void;
  collab?: string[];
}) {
  const p = row.kind === 'engineer' ? row.engineer : row.profile;
  // Profile rows reach this modal only through the four portal roles, so narrowing is safe.
  const type: ProfessionalType = row.kind === 'engineer' ? 'engineer' : (row.profile.profession as ProfessionalType);
  const name = row.kind === 'profile' ? (row.profile.business_name ?? row.profile.name) : p.name;
  const photo = row.kind === 'profile' ? row.profile.photo_url : p.photo_url;
  const verified = p.verification_status === 'verified';
  const portfolio = (p as { portfolio?: { title: string; location: string; year: number }[] }).portfolio ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <img src={personPhoto(photo, type)} alt="" onError={(e) => onPersonImgError(e, type)} className="w-14 h-14 rounded-xl object-cover" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-lg font-bold text-navy-900">{name}</p>
            {verified && <VerifiedBadge />}
          </div>
          <p className="text-xs muted capitalize">{type.replace('_', ' ')} · {p.location}{row.kind === 'profile' && row.profile.service_area ? ` · serves ${row.profile.service_area}` : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
        <Field label="Verification" value={p.verification_status === 'verified' ? 'Verified' : p.verification_status === 'rejected' ? 'Rejected' : 'Pending'} />
        <Field label="Availability" value={p.availability || '—'} />
        <Field label="Experience" value={`${p.experience_years} years`} />
        <Field label="Projects completed" value={String(p.projects_completed)} />
        <Field label="Rating" value={`${p.rating} ★ (${p.reviews_count} reviews)`} />
        {row.kind === 'engineer' ? (
          <Field label="Rate" value={`₹${row.engineer.price_per_sqft}/sq.ft`} />
        ) : (
          <Field label="Visit fee" value={row.profile.price_per_visit > 0 ? formatINR(row.profile.price_per_visit) : '—'} />
        )}
      </div>

      {'qualification' in p && p.qualification && <DetailLine label="Qualification" value={p.qualification} />}
      <DetailLine label={row.kind === 'engineer' ? 'Specialisations' : 'Specialisations / skills'} value={p.specializations.concat(row.kind === 'profile' ? row.profile.skills : []).slice(0, 8).join(', ') || '—'} />

      {row.kind === 'engineer' ? (
        <DetailLine label="Why recommended" value="Ranked by the BuildMatch matching engine using this project's location, budget, house type, area and style." />
      ) : (
        <DetailLine label="Why listed" value="Directory professional operating in this area for the project — no fabricated recommendation or score is used." />
      )}

      {collab && collab.length > 0 ? (
        <div className="bg-royal-50 border border-royal-200 rounded-xl p-3 text-sm text-royal-900"><Award className="w-4 h-4 inline mr-1" /> <strong>Previous collaboration recorded:</strong> {collab.join('; ')}</div>
      ) : row.kind === 'profile' ? (
        <p className="text-xs muted">Not enough data — no recorded collaboration history with the selected engineer on other projects.</p>
      ) : null}

      {portfolio.length > 0 ? (
        <div>
          <p className="text-sm font-semibold text-navy-900 mb-2">Portfolio / past work</p>
          <ul className="space-y-1 text-sm text-navy-700">
            {portfolio.map((pf, i) => <li key={i} className="flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-emerald-500 shrink-0" /> {pf.title} · {pf.location} · {pf.year}</li>)}
          </ul>
        </div>
      ) : (
        <p className="text-xs muted">Not enough data — no portfolio entries recorded.</p>
      )}

      <div className="flex items-center justify-between text-xs muted border-t border-navy-100 pt-3">
        <span className="flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> Project: {project.title}</span>
        <span className="flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> {formatINR(project.budget)}</span>
      </div>

      <button onClick={() => onRequest(type)} className="btn-primary w-full"><ShieldCheck className="w-4 h-4" /> Request for this Project</button>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="bg-navy-50 rounded-lg p-2"><p className="text-[10px] muted uppercase tracking-wide">{label}</p><p className="font-semibold text-navy-900 text-xs mt-0.5">{value}</p></div>;
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return <p className="text-sm text-navy-700"><span className="font-semibold">{label}: </span>{value}</p>;
}