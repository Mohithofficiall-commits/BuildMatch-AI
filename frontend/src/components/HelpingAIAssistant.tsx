import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, SendHorizonal, Bot, User as UserIcon, Settings2, ChevronDown, RefreshCw, AlertTriangle, ShieldAlert, ListChecks, Lightbulb, Info } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  fetchEngineers, fetchProjects, fetchProfessionalProfiles,
  fetchProfessionalRequests, fetchLatestVerificationRequest, fetchComplaints,
  fetchVerificationRequestsDetailed,
} from '@/lib/data';
import { rankProfessionals } from '@/lib/matching';
import { aiChat, aiAnalyze, type ChatMessage, type AIAnalysis } from '@/lib/ai';
import { SERVICE_CATEGORIES } from '@/lib/serviceRecommendations';
import { roleHomePath, roleLabel, type ProfessionalRole } from '@/lib/portal';
import type {
  Engineer, Project, ProjectRequirement, ProfessionalProfile, ConstructionProfession,
  UserRole, ProfessionalRequest, VerificationRequest, Complaint, VerificationRequestJoined,
} from '@/lib/types';


// Route for each service category (engineer → AI Match, professions → Construction Team).
const CATEGORY_ROUTES: Record<string, string> = {
  engineer: '/app/ai-match',
  plumber: '/app/construction-team',
  electrician: '/app/construction-team',
  carpenter: '/app/construction-team',
  interior_designer: '/app/construction-team',
  furniture_provider: '/app/construction-team',
  material_shop: '/app/construction-team',
};

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  /** Real Gemini structured analysis attached to this assistant turn. */
  analysis?: AIAnalysis;
  /** The original question — enables the retry button. */
  question?: string;
}

const SUGGESTED_QUESTIONS = [
  'Recommend an engineer',
  'Analyze my project',
  'What should I do next?',
  'Identify project risks',
  'Check missing information',
  'Analyze project progress',
];

const DEFAULT_REQ: ProjectRequirement = {
  location: 'Coimbatore',
  budget: 2800000,
  house_type: '2BHK',
  area_sqft: 1500,
  construction_style: 'Modern',
};

/** Portal sub-page shortcuts per professional role. */
function portalPath(role: ProfessionalRole, sub: string): string {
  return `${roleHomePath(role)}/${sub}`;
}

export default function HelpingAIAssistant() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role: UserRole | undefined = user?.role;
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Role-scoped real data, loaded lazily on first open.
  const [homeData, setHomeData] = useState<{
    loaded: boolean;
    projects: Project[];
    engineers: Engineer[];
    profiles: ProfessionalProfile[];
  }>({ loaded: false, projects: [], engineers: [], profiles: [] });
  const [proData, setProData] = useState<{
    loaded: boolean;
    requests: ProfessionalRequest[];
    verification: VerificationRequest | null;
  }>({ loaded: false, requests: [], verification: null });
  const [adminData, setAdminData] = useState<{
    loaded: boolean;
    pendingVerifications: number;
    openComplaints: number;
    pendingDocRequests: VerificationRequestJoined[];
  }>({ loaded: false, pendingVerifications: 0, openComplaints: 0, pendingDocRequests: [] });

  // Load real data once per role — grounding for offline guidance.
  useEffect(() => {
    if (!open || !user) return;
    if (role === 'homeowner' && !homeData.loaded) {
      (async () => {
        const [eng, proj, prof] = await Promise.all([
          fetchEngineers().catch(() => [] as Engineer[]),
          fetchProjects().catch(() => [] as Project[]),
          fetchProfessionalProfiles().catch(() => [] as ProfessionalProfile[]),
        ]);
        setHomeData({ loaded: true, engineers: eng, projects: proj, profiles: prof });
      })();
    } else if (role && role !== 'homeowner' && role !== 'admin' && !proData.loaded) {
      (async () => {
        const [reqs, ver] = await Promise.all([
          fetchProfessionalRequests(user.id).catch(() => [] as ProfessionalRequest[]),
          fetchLatestVerificationRequest(user.id).catch(() => null),
        ]);
        setProData({ loaded: true, requests: reqs, verification: ver });
      })();
    } else if (role === 'admin' && !adminData.loaded) {
      (async () => {
        const [engs, comps, vrs] = await Promise.all([
          fetchEngineers().catch(() => [] as Engineer[]),
          fetchComplaints().catch(() => [] as Complaint[]),
          fetchVerificationRequestsDetailed().catch(() => [] as VerificationRequestJoined[]),
        ]);
        setAdminData({
          loaded: true,
          pendingVerifications: engs.filter((e) => e.verification_status === 'pending').length,
          openComplaints: comps.filter((c) => c.status !== 'resolved').length,
          pendingDocRequests: vrs.filter((v) => v.status === 'pending'),
        });
      })();
    }
  }, [open, user, role, homeData.loaded, proData.loaded, adminData.loaded]);

  const req: ProjectRequirement = useMemo(() => {
    const p = homeData.projects.find((x) => x.status === 'active') ?? homeData.projects[0];
    if (!p) return DEFAULT_REQ;
    return {
      location: p.location,
      budget: p.budget,
      house_type: p.house_type,
      area_sqft: p.area_sqft,
      construction_style: p.construction_style,
    };
  }, [homeData.projects]);

  /** The user's real active project — attached to Gemini analysis requests. */
  const activeProject: Project | null = useMemo(
    () => homeData.projects.find((x) => x.status === 'active') ?? homeData.projects[0] ?? null,
    [homeData.projects]
  );


  // Per-category best profile from real directory data (or null → insufficient data).
  const categoryPicks = useMemo(() => {
    const map = new Map<ConstructionProfession, ProfessionalProfile[]>();
    for (const p of homeData.profiles) {
      const arr = map.get(p.profession) ?? [];
      arr.push(p);
      map.set(p.profession, arr);
    }
    return SERVICE_CATEGORIES.filter((c) => c.key !== 'engineer').map((c) => ({
      category: c.singular,
      route: CATEGORY_ROUTES[c.key],
      match: rankProfessionals(map.get(c.key as ConstructionProfession) ?? [], req)[0] ?? null,
    }));
  }, [homeData.profiles, req]);

  // Scroll to the newest turn.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns, busy]);

  const quickPrompts: string[] = useMemo(() => {
    if (role === 'admin') return ['What needs my attention?', 'Show verification queue', 'Show open complaints'];
    if (role && role !== 'homeowner') {
      return ['What requests do I have?', 'Am I verified?', 'How does AI ranking work?', 'Where are my messages?'];
    }
    return ['What services do I need?', 'Why this recommendation?', 'What details am I missing?', 'Compare professionals'];
  }, [role]);

  async function send(rawText?: string, isRetry = false) {
    const text = (rawText ?? input).trim();
    if (!text || busy) return;
    if (!isRetry) {
      setInput('');
      setTurns((t) => [...t, { role: 'user', content: text }]);
    }
    setBusy(true);

    // REAL Gemini via the ai-assistant Edge Function (structured analysis
    // for questions, grounded chat for everything else).
    const isAnalysisQuestion = /recommend|analy[sz]e|risk|missing|next|compare|progress|suitable|which (engineer|professional)/i.test(text);
    setAiUnavailable(null);
    if (isAnalysisQuestion) {
      const projectId = activeProject?.id;
      const res = await aiAnalyze({ message: text, ...(projectId ? { projectId } : {}) });
      if (res.status !== 'ok') setAiUnavailable(res.reason ?? 'The AI Assistant is temporarily unavailable. Please try again.');
      setTurns((t) => [
        ...t,
        res.status === 'ok' && res.data
          ? { role: 'assistant' as const, content: res.data.answer, analysis: res.data, question: text }
          : { role: 'assistant' as const, content: res.reason ?? 'The AI Assistant is temporarily unavailable. Please try again.', question: text },
      ]);
    } else {
      const roleLine =
        role === 'admin'
          ? 'The user is a BuildMatch platform admin. Guide them through verification queues, complaints and flagged evidence.'
          : role && role !== 'homeowner'
          ? `The user is a ${roleLabel(role as ProfessionalRole)} professional. Guide them through requests, verification, profile completeness and client coordination.`
          : `You are guiding homeowner ${user?.name ?? 'the user'}.`;
      const context: ChatMessage[] = [
        { role: 'assistant', content: `You are the BuildMatch Helping AI. ${roleLine} Guide them to the right next action. Never invent professionals, ratings or prices.` },
        ...turns.slice(-8).map((t) => ({ role: t.role, content: t.content })),
        { role: 'user', content: text },
      ];
      const res = await aiChat(context);
      if (res.status !== 'ok') setAiUnavailable(res.reason ?? 'The AI Assistant is temporarily unavailable. Please try again.');
      setTurns((t) => [
        ...t,
        res.status === 'ok'
          ? { role: 'assistant' as const, content: res.reply ?? '', question: text }
          : { role: 'assistant' as const, content: res.reason ?? 'The AI Assistant is temporarily unavailable. Please try again.', question: text },
      ]);
    }
    setBusy(false);
  }

  /** Role-aware navigation shortcuts shown under the conversation. */
  const shortcuts: { label: string; to: string; primary?: boolean }[] = useMemo(() => {
    if (role === 'admin') {
      return [
        { label: 'Verification queue →', to: '/app/admin', primary: true },
        { label: 'Projects', to: '/app/admin' },
      ];
    }
    if (role && role !== 'homeowner') {
      const r = role as ProfessionalRole;
      return [
        { label: 'Requests →', to: portalPath(r, 'requests'), primary: true },
        { label: 'Verification', to: portalPath(r, 'verification') },
        { label: 'Messages', to: portalPath(r, 'messages') },
      ];
    }
    const shortcuts: { label: string; to: string; primary?: boolean }[] = [];
    if (categoryPicks.some((c) => c.match)) {
      shortcuts.push({ label: 'Continue to team selection →', to: '/app/construction-team', primary: true });
    }
    shortcuts.push({ label: 'AI Match', to: '/app/ai-match' });
    return shortcuts;
  }, [role, categoryPicks]);

  const subtitle =
    role === 'admin'
      ? 'Platform pulse & action queue'
      : role && role !== 'homeowner'
      ? `Your ${roleLabel(role as ProfessionalRole)} copilot`
      : 'Powered by Google Gemini';

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-navy-900 text-white pl-4 pr-5 py-3 shadow-card-hover hover:bg-navy-800 transition-all active:scale-95"
          aria-label="Open BuildMatch Helping AI"
        >
          <Sparkles className="w-5 h-5 text-royal-300" />
          <span className="text-sm font-semibold">Helping AI</span>
        </button>
      )}

      {/* Assistant panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[92vw] max-w-sm animate-slide-up">
          <div className="card shadow-card-hover overflow-hidden flex flex-col max-h-[70vh]">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-navy-100 bg-gradient-to-r from-navy-900 to-navy-800 text-white">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-royal-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight">BuildMatch Helping AI</p>
                <p className="text-[10px] text-navy-200 leading-tight">{subtitle}</p>
              </div>
              <button onClick={() => setMinimized((m) => !m)} className="p-1.5 rounded-lg hover:bg-white/10 text-navy-200" title={minimized ? 'Expand' : 'Minimize'}>
                <ChevronDown className={`w-4 h-4 transition-transform ${minimized ? '' : 'rotate-180'}`} />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-navy-200" title="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!minimized && (
              <>
                {/* Config banner (only when no managed/custom provider answers) */}
                {aiUnavailable && (
                  <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100">
                    <div className="flex items-start gap-2">
                      <Settings2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />                        <p className="text-[11px] text-amber-800 leading-snug">
                          To enable live Gemini AI answers, deploy the <code className="bg-amber-100 rounded px-1">ai-assistant</code> Edge Function and set{' '}
                          <code className="bg-amber-100 rounded px-1">GEMINI_API_KEY</code> in Supabase secrets. Until then, answers are built from your real BuildMatch data.
                        </p>
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {turns.length === 0 && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-lg bg-royal-50 text-royal-700 flex items-center justify-center shrink-0"><Bot className="w-4 h-4" /></div>
                        <div className="bg-navy-50 rounded-xl rounded-tl-sm px-3 py-2 text-sm text-navy-800">
                          {role === 'admin'
                            ? 'I track the platform pulse and point you to the next action. Ask me about the queues, or try:'
                            : role && role !== 'homeowner'
                            ? `I help you win and manage work as a ${roleLabel(role as ProfessionalRole).toLowerCase()}. Ask about requests, verification or ranking, or try:`
                            : 'I help you plan your project, pick the right services and understand your AI recommendations. Ask me anything, or try:'}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pl-9">
                        {(role === 'homeowner' || !role ? SUGGESTED_QUESTIONS : quickPrompts).map((qp) => (
                          <button key={qp} onClick={() => send(qp)} className="badge-royal hover:bg-royal-100 transition-colors text-left">
                            {qp}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {turns.map((t, i) => (
                    <div key={i} className={`flex items-start gap-2 ${t.role === 'user' ? 'justify-end' : ''}`}>
                      {t.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-lg bg-royal-50 text-royal-700 flex items-center justify-center shrink-0"><Bot className="w-4 h-4" /></div>
                      )}
                      <div className={`min-w-0 ${t.role === 'user' ? 'max-w-[80%]' : 'max-w-[88%]'}`}>
                        <div
                          className={`rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                            t.role === 'user' ? 'bg-navy-900 text-white rounded-tr-sm' : 'bg-navy-50 text-navy-800 rounded-tl-sm'
                          }`}
                        >
                          {t.content}
                        </div>

                        {/* Structured Gemini analysis — rendered dynamically */}
                        {t.analysis && (
                          <div className="mt-2 space-y-2">
                            {t.analysis.recommendations.length > 0 && (
                              <div className="rounded-xl border border-royal-100 bg-white p-2.5 space-y-1.5">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-royal-700 flex items-center gap-1"><Lightbulb className="w-3 h-3" /> Recommendations</p>
                                {t.analysis.recommendations.slice(0, 4).map((r, ri) => (
                                  <div key={ri} className="flex items-start gap-2">
                                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-royal-500 shrink-0" />
                                    <p className="text-xs text-navy-700 leading-snug">
                                      <span className="font-semibold text-navy-900">{r.name}</span>
                                      {Number.isFinite(r.confidence) && r.confidence > 0 && (
                                        <span className="ml-1 text-[10px] text-navy-400">({Math.round(r.confidence * 100)}% conf.)</span>
                                      )}
                                      {r.reason && <span className="block text-navy-500">{r.reason}</span>}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                            {t.analysis.risks.length > 0 && (
                              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-2.5 space-y-1.5">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Risks</p>
                                {t.analysis.risks.slice(0, 4).map((r, ri) => (
                                  <div key={ri} className="flex items-start gap-2">
                                    <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${r.severity === 'high' ? 'bg-rose-500' : r.severity === 'medium' ? 'bg-amber-500' : 'bg-navy-300'}`} />
                                    <p className="text-xs text-navy-700 leading-snug">
                                      <span className="font-semibold text-navy-900">{r.title}</span>
                                      {r.reason && <span className="block text-navy-500">{r.reason}</span>}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                            {t.analysis.nextActions.length > 0 && (
                              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-2.5">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 flex items-center gap-1 mb-1"><ListChecks className="w-3 h-3" /> Next actions</p>
                                <ul className="space-y-1">
                                  {t.analysis.nextActions.slice(0, 4).map((a, ai2) => (
                                    <li key={ai2} className="text-xs text-navy-700 leading-snug flex items-start gap-1.5"><Info className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />{a}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {t.analysis.missingInformation.length > 0 && (
                              <div className="rounded-xl border border-navy-100 bg-navy-50/60 p-2.5">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-navy-500 flex items-center gap-1 mb-1"><AlertTriangle className="w-3 h-3" /> Missing information</p>
                                <ul className="space-y-1">
                                  {t.analysis.missingInformation.slice(0, 4).map((m, mi) => (
                                    <li key={mi} className="text-xs text-navy-600 leading-snug">• {m}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {t.analysis.model && (
                              <p className="text-[10px] text-navy-300 pl-1">Gemini · {t.analysis.model}{t.analysis.confidence != null ? ` · overall confidence ${Math.round(t.analysis.confidence * 100)}%` : ''}</p>
                            )}
                          </div>
                        )}

                        {/* Error / retry */}
                        {t.role === 'assistant' && t.question && !t.analysis && (t.content.includes('unavailable') || t.content.includes('failed') || t.content.includes('Could not')) && (
                          <button
                            onClick={() => send(t.question, true)}
                            className="mt-1.5 ml-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-royal-700 hover:text-royal-900 transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" /> Retry
                          </button>
                        )}
                      </div>
                      {t.role === 'user' && (
                        <div className="w-7 h-7 rounded-lg bg-navy-100 text-navy-600 flex items-center justify-center shrink-0"><UserIcon className="w-4 h-4" /></div>
                      )}
                    </div>
                  ))}

                  {busy && (
                    <div className="flex items-center gap-2 text-navy-400 text-xs pl-9">
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-royal-400 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-royal-400 animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-royal-400 animate-bounce [animation-delay:300ms]" />
                      </span>
                      Gemini is thinking…
                    </div>
                  )}
                </div>

                {/* Next-step shortcuts */}
                {turns.length > 0 && shortcuts.length > 0 && (
                  <div className="px-4 pt-1 pb-2 flex flex-wrap gap-1.5 border-t border-navy-50">
                    {shortcuts.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => navigate(s.to)}
                        className={`transition-colors ${s.primary ? 'badge-royal hover:bg-royal-100' : 'badge bg-navy-100 text-navy-700 hover:bg-navy-200'}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input */}
                <div className="p-3 border-t border-navy-100">
                  <div className="flex items-center gap-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && send()}
                      placeholder="Ask about your project…"
                      className="input py-2 text-sm"
                    />
                    <button onClick={() => send()} disabled={!input.trim() || busy} className="btn-royal px-3 py-2 shrink-0" aria-label="Send">
                      <SendHorizonal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
