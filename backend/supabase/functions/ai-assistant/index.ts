// ============================================================
// BUILDMATCH AI ASSISTANT — REAL Google Gemini (Edge Function)
// SELF-CONTAINED VERSION — paste this single file into the
// Supabase Dashboard function editor and deploy as `ai-assistant`.
//
// POST { op: 'analyze',  projectId?, message }  → structured analysis
// POST { op: 'chat',     projectId?, messages } → grounded chat reply
// POST { op: 'health' }                         → config probe (no key)
//
// Every analyze/chat request:
//   1. Resolves the authenticated user (Supabase JWT, or the demo
//      session id sent in the `x-buildmatch-user` header).
//   2. Loads REAL rows from the BuildMatch database (project,
//      milestones, payments, documents, milestone evidence, reviews,
//      complaints, engineers, professionals).
//   3. Sends ONLY that authorized context to Gemini.
//   4. Returns Gemini's real response — never fabricated data.
//
// Environment (Supabase secrets):
//   GEMINI_API_KEY              (required)
//   GEMINI_MODEL                (optional, default: gemini-3.6-flash)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY
//                               (auto-injected by the Edge runtime)
// ============================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI } from "npm:@google/genai@^1";

// ------------------------------------------------------------
// CORS (STEP 6) — browser requests, incl. the demo auth header
// ------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-buildmatch-user",
};

const corsResponse = (init?: ResponseInit) => new Response(init?.body, { ...init, headers: { ...corsHeaders, ...(init?.headers ?? {}) } });
const json = (body: unknown, status = 200) =>
  corsResponse({ body: JSON.stringify(body), status: 200 + (status - 200), headers: { "Content-Type": "application/json" } });

// ------------------------------------------------------------
// GEMINI (inlined — this file is fully self-contained)
// ------------------------------------------------------------
class GeminiConfigError extends Error {}

const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash";

function getGemini(): GoogleGenAI {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    // No fake fallback — the caller reports configuration state honestly.
    throw new GeminiConfigError("GEMINI_API_KEY is not set. Add it in Dashboard → Edge Functions → Secrets.");
  }
  return new GoogleGenAI({ apiKey });
}

interface GeminiStructuredResult<T> {
  text: string;
  data: T | null;
}

/** Real Gemini call expecting JSON back (structured analysis). */
async function askGeminiJSON<T>(
  systemInstruction: string,
  userPayload: unknown,
  opts?: { maxOutputTokens?: number; temperature?: number }
): Promise<GeminiStructuredResult<T>> {
  const ai = getGemini();
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: typeof userPayload === "string" ? userPayload : JSON.stringify(userPayload, null, 2) }],
      },
    ],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      temperature: opts?.temperature ?? 0.3,
      // Gemini 3.x spends output budget on internal thinking tokens —
      // keep generous headroom so the visible answer is never truncated.
      maxOutputTokens: opts?.maxOutputTokens ?? 8000,
    },
  });

  const text = response.text ?? "";
  if (!text.trim()) {
    throw new Error("Gemini returned an empty response (possibly all output budget went to thinking tokens). Please retry.");
  }

  let data: T | null = null;
  try {
    data = JSON.parse(text) as T;
  } catch {
    // Tolerate accidental code fences around the JSON.
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    try {
      data = JSON.parse(cleaned) as T;
    } catch {
      data = null;
    }
  }
  return { text, data };
}

/** Real Gemini call returning plain text (chat-style replies). */
async function askGeminiText(
  systemInstruction: string,
  contents: { role: "user" | "assistant"; content: string }[],
  opts?: { maxOutputTokens?: number; temperature?: number }
): Promise<string> {
  const ai = getGemini();
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: contents.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    config: {
      systemInstruction,
      temperature: opts?.temperature ?? 0.4,
      maxOutputTokens: opts?.maxOutputTokens ?? 4000,
    },
  });
  const text = response.text ?? "";
  if (!text.trim()) throw new Error("Gemini returned an empty response.");
  return text.trim();
}

/** Map SDK/network failures to safe, user-presentable messages. */
function geminiErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (err instanceof GeminiConfigError) return "Gemini configuration is missing. Set GEMINI_API_KEY in Supabase secrets.";
  if (/API key not valid|API_KEY_INVALID|permission/i.test(msg)) {
    return "The configured Gemini API key was rejected by Google. Check GEMINI_API_KEY in the backend secrets.";
  }
  if (/429|RESOURCE_EXHAUSTED|quota|rate/i.test(msg)) return "Gemini rate limit reached. Please try again in a moment.";
  if (/503|UNAVAILABLE|overloaded/i.test(msg)) return "Gemini is temporarily unavailable. Please try again.";
  if (/timeout|aborted|deadline/i.test(msg)) return "The Gemini request timed out. Please try again.";
  if (/fetch|network|ENOTFOUND|ECONNREFUSED/i.test(msg)) return "Could not reach the Gemini service. Check network connectivity.";
  return `Gemini request failed: ${msg.slice(0, 200)}`;
}

/** Health probe — reports configuration WITHOUT exposing the key. */
function geminiHealth() {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  return { configured: Boolean(apiKey), provider: "Google Gemini", model: GEMINI_MODEL };
}

// ------------------------------------------------------------
// DB CONTEXT (inlined — this file is fully self-contained)
// ------------------------------------------------------------
function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

/** Resolve the calling user's app_users row (JWT first, then demo header). */
async function resolveUser(req: Request, db: SupabaseClient): Promise<{ id: string; name: string; role: string } | null> {
  // 1) Real JWT path (Supabase auth).
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader.startsWith("Bearer ") && !authHeader.includes("anon")) {
    const token = authHeader.slice(7);
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data } = await client.auth.getUser(token);
    if (data?.user) {
      const { data: row } = await db.from("app_users").select("id, name, role").eq("id", data.user.id).maybeSingle();
      if (row) return row;
    }
  }

  // 2) Prototype path: the frontend sends the demo user's id explicitly.
  const demoId = req.headers.get("x-buildmatch-user");
  if (demoId) {
    const { data: row } = await db.from("app_users").select("id, name, role").eq("id", demoId).maybeSingle();
    if (row) return row;
    const { data: eng } = await db.from("engineers").select("id, name").eq("id", demoId).maybeSingle();
    if (eng) return { id: eng.id, name: eng.name, role: "engineer" };
  }

  return null;
}

interface ProjectContext {
  id: string;
  title: string;
  house_type: string;
  location: string;
  area_sqft: number;
  budget: number;
  construction_style: string;
  status: string;
  progress: number;
  start_date: string;
  expected_completion: string | null;
  current_milestone: string | null;
  milestones: { name: string; status: string; planned_date: string | null; verified: boolean }[];
  payments: { milestone_name: string; amount: number; status: string; due_date: string | null }[];
  documents: { name: string; category: string }[];
  evidence: { detected_stage: string | null; confidence: number | null; result: string | null; human_status: string | null }[];
  reviews: { rating: number; feedback: string }[];
  complaints: { category: string; status: string }[];
}

/** Fetch the real project with all related data (or null if not found). */
async function loadProjectContext(db: SupabaseClient, projectId: string): Promise<ProjectContext | null> {
  const { data: p } = await db.from("projects").select("*").eq("id", projectId).maybeSingle();
  if (!p) return null;

  const [ms, pays, docs, ev, revs, comps] = await Promise.all([
    db.from("milestones").select("name, status, planned_date, verified").eq("project_id", projectId).order("order_index"),
    db.from("payments").select("milestone_name, amount, status, due_date").eq("project_id", projectId),
    db.from("documents").select("name, category").eq("project_id", projectId),
    db.from("milestone_evidence").select("detected_stage, confidence, result, human_status").eq("project_id", projectId),
    db.from("reviews").select("rating, feedback").eq("project_id", projectId),
    db.from("complaints").select("category, status").eq("project_id", projectId),
  ]);

  return {
    id: p.id,
    title: p.title,
    house_type: p.house_type,
    location: p.location,
    area_sqft: p.area_sqft,
    budget: p.budget,
    construction_style: p.construction_style,
    status: p.status,
    progress: p.progress,
    start_date: p.start_date,
    expected_completion: p.expected_completion,
    current_milestone: p.current_milestone,
    milestones: ms.data ?? [],
    payments: pays.data ?? [],
    documents: docs.data ?? [],
    evidence: ev.data ?? [],
    reviews: revs.data ?? [],
    complaints: comps.data ?? [],
  };
}

// ------------------------------------------------------------
// SYSTEM PROMPT (unchanged — STEP 9)
// ------------------------------------------------------------
const SYSTEM_INSTRUCTION = `You are the AI project assistant inside BuildMatch, a construction/project management platform for Indian homeowners and professionals.

Analyze ONLY the authorized application data provided to you in the request.

Provide useful recommendations, explanations, risk identification, and next actions.

Never invent users, engineers, projects, certifications, ratings, project progress, documents, or other facts. If information is missing, explicitly state that it is missing.

Clearly distinguish in your answers:
1. verified application data
2. user-provided information
3. AI-generated recommendations
4. uncertain conclusions

You are an assistant, not the final decision-maker. Explain why you make each recommendation. Use ₹ for money. Be concise and practical.

For op=analyze you MUST respond with JSON matching exactly:
{
  "answer": string,
  "recommendations": [{ "name": string, "reason": string, "confidence": number }],
  "risks": [{ "title": string, "severity": "low"|"medium"|"high", "reason": string }],
  "nextActions": string[],
  "missingInformation": string[],
  "confidence": number
}
Use empty arrays when a section has nothing real to report. confidence is 0-1.`;

interface EngineerRow {
  id: string; name: string; location: string; specializations: string[];
  experience_years: number; projects_completed: number; rating: number;
  reviews_count: number; verification_status: string; availability: string;
  price_per_sqft: number; on_time_pct: number; quality_score: number;
}

interface ProfessionalRow {
  id: string; name: string; profession: string; location: string;
  service_area: string | null; specializations: string[]; skills: string[];
  experience_years: number; projects_completed: number; rating: number;
  reviews_count: number; verification_status: string; availability: string;
}

// ------------------------------------------------------------
// Role-aware authorization: which projects may this user analyze?
// ------------------------------------------------------------
async function canAccessProject(
  db: SupabaseClient,
  user: { id: string; role: string } | null,
  projectId: string
): Promise<boolean> {
  if (!user) return false;
  if (user.role === "admin") return true;
  const { data: p } = await db.from("projects").select("homeowner_id, engineer_id").eq("id", projectId).maybeSingle();
  if (!p) return false;
  if (user.role === "homeowner") {
    return p.homeowner_id === user.id;
  }
  // Professionals: must be the assigned engineer or a project member.
  if (user.role === "engineer") {
    const { data: eng } = await db.from("engineers").select("id").eq("user_id", user.id).maybeSingle();
    if (eng && eng.id === p.engineer_id) return true;
  }
  const { data: member } = await db
    .from("project_members").select("id").eq("project_id", projectId).eq("user_id", user.id).maybeSingle();
  return Boolean(member);
}

// ------------------------------------------------------------
// Real DB → AI context assembly (unchanged — STEP 9)
// ------------------------------------------------------------
function projectBlock(p: ProjectContext): string {
  const ms = p.milestones.map((m) => `  - ${m.name}: ${m.status}${m.verified ? " (verified)" : ""}${m.planned_date ? `, planned ${m.planned_date}` : ""}`).join("\n") || "  - none recorded";
  const pays = p.payments.map((x) => `  - ${x.milestone_name}: ₹${x.amount} (${x.status})`).join("\n") || "  - none recorded";
  const docs = p.documents.map((d) => `  - ${d.name} (${d.category})`).join("\n") || "  - none uploaded";
  const ev = p.evidence.map((e) => `  - stage detected: ${e.detected_stage ?? "?"}, confidence ${e.confidence ?? "?"}%, result ${e.result ?? "?"}, human review: ${e.human_status ?? "pending"}`).join("\n") || "  - none submitted";
  const revs = p.reviews.map((r) => `  - ${r.rating}★: ${r.feedback}`).join("\n") || "  - none yet";
  const comps = p.complaints.map((c) => `  - ${c.category} (${c.status})`).join("\n") || "  - none";
  return `PROJECT:
- title: ${p.title}
- type: ${p.house_type}
- location: ${p.location}
- budget: ₹${p.budget}
- area: ${p.area_sqft} sq.ft
- style: ${p.construction_style}
- timeline: start ${p.start_date}${p.expected_completion ? `, expected completion ${p.expected_completion}` : ", no completion date set"}
- current status: ${p.status}
- progress: ${p.progress}%
- current milestone: ${p.current_milestone ?? "not set"}

MILESTONES:
${ms}

PAYMENTS:
${pays}

DOCUMENTS:
${docs}

EVIDENCE (AI-assisted milestone verification):
${ev}

REVIEWS:
${revs}

COMPLAINTS:
${comps}`;
}

function engineersBlock(rows: EngineerRow[]): string {
  if (!rows.length) return "ENGINEERS:\n- none available in the database";
  return `ENGINEERS (real directory records):\n${rows.map((e) => `- ${e.name}
  location: ${e.location}; specializations: ${e.specializations.join(", ") || "none listed"}
  experience: ${e.experience_years} yrs, ${e.projects_completed} projects; rating: ${e.rating} (${e.reviews_count} reviews)
  verification: ${e.verification_status}; availability: ${e.availability}
  price: ₹${e.price_per_sqft}/sq.ft; on-time ${e.on_time_pct}%, quality ${e.quality_score}/100`).join("\n")}`;
}

function professionalsBlock(rows: ProfessionalRow[]): string {
  if (!rows.length) return "PROFESSIONALS:\n- none available in the database";
  return `PROFESSIONALS (real directory records):\n${rows.map((p) => `- ${p.name} (${p.profession})
  location: ${p.location}; service area: ${p.service_area ?? "not recorded"}
  skills: ${[...p.specializations, ...p.skills].slice(0, 6).join(", ") || "none listed"}
  experience: ${p.experience_years} yrs, ${p.projects_completed} projects; rating: ${p.rating} (${p.reviews_count} reviews)
  verification: ${p.verification_status}; availability: ${p.availability}`).join("\n")}`;
}

// ------------------------------------------------------------
// Main handler
// ------------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse({ body: "ok" });

  try {
    const body = await req.json().catch(() => null);
    const op = body?.op ?? "analyze";

    // Health check op — confirms configuration without exposing the key.
    if (op === "health") {
      const h = geminiHealth();
      let dbOk = true;
      try {
        const db = serviceClient();
        const { error } = await db.from("app_users").select("id").limit(1);
        dbOk = !error;
      } catch {
        dbOk = false;
      }
      return json({ ...h, database: dbOk ? "reachable" : "unreachable" });
    }

    // ---- Auth + DB ----
    const db = serviceClient();
    const user = await resolveUser(req, db);
    if (!user) return json({ error: "Authentication required." }, 401);

    if (op === "chat") {
      const messages = Array.isArray(body?.messages) ? body.messages : null;
      if (!messages || messages.length === 0) {
        return json({ error: "`messages` must be a non-empty array." }, 400);
      }
      // Ground the chat with the user's real project snapshot when available.
      let contextLine = "";
      if (body?.projectId) {
        if (!(await canAccessProject(db, user, String(body.projectId)))) {
          return json({ error: "You do not have access to this project." }, 403);
        }
        const p = await loadProjectContext(db, String(body.projectId));
        if (p) contextLine = `\n\nREAL PROJECT CONTEXT (verified application data):\n${projectBlock(p)}`;
      } else if (user.role === "homeowner") {
        const { data: own } = await db.from("projects").select("id").eq("homeowner_id", user.id).limit(1);
        if (own?.[0]) {
          const p = await loadProjectContext(db, own[0].id);
          if (p) contextLine = `\n\nREAL PROJECT CONTEXT (verified application data):\n${projectBlock(p)}`;
        }
      }
      const text = await askGeminiText(SYSTEM_INSTRUCTION, [
        ...messages.slice(-10),
        ...(contextLine ? [{ role: "user" as const, content: contextLine }] : []),
      ]);
      return json({ reply: text, model: geminiHealth().model });
    }

    // ---- op = analyze ----
    const projectId = body?.projectId ? String(body.projectId) : null;
    const message = String(body?.message ?? "").slice(0, 800);

    let project: ProjectContext | null = null;
    if (projectId) {
      if (!(await canAccessProject(db, user, projectId))) {
        return json({ error: "You do not have access to this project." }, 403);
      }
      project = await loadProjectContext(db, projectId);
      if (!project) return json({ error: "Project not found." }, 404);
    }

    // Real directory data — engineers, professionals, verification.
    const { data: engineers } = await db.from("engineers").select(
      "id, name, location, specializations, experience_years, projects_completed, rating, reviews_count, verification_status, availability, price_per_sqft, on_time_pct, quality_score"
    );
    const { data: professionals } = await db.from("professional_profiles").select(
      "id, name, profession, location, service_area, specializations, skills, experience_years, projects_completed, rating, reviews_count, verification_status, availability"
    );

    const payload = [
      project ? projectBlock(project) : "PROJECT:\n- no specific project selected",
      engineersBlock((engineers ?? []) as EngineerRow[]),
      professionalsBlock((professionals ?? []) as ProfessionalRow[]),
      `USER QUESTION: ${message || "(none — provide a general analysis)"}`,
      `USER ROLE: ${user.role}`,
    ].join("\n\n");

    const { data } = await askGeminiJSON<Record<string, unknown>>(SYSTEM_INSTRUCTION, payload, { maxOutputTokens: 1800 });

    if (!data) {
      return json({ error: "Gemini returned a response that was not valid JSON. Please retry." }, 502);
    }

    return json({
      answer: String(data.answer ?? ""),
      recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
      risks: Array.isArray(data.risks) ? data.risks : [],
      nextActions: Array.isArray(data.nextActions) ? data.nextActions.map(String) : [],
      missingInformation: Array.isArray(data.missingInformation) ? data.missingInformation.map(String) : [],
      confidence: typeof data.confidence === "number" ? data.confidence : null,
      model: geminiHealth().model,
    });
  } catch (err) {
    // Safe diagnostics server-side (never secrets — STEP 7).
    console.error("ai-assistant error:", err instanceof Error ? err.message : String(err));
    if (/GEMINI_API_KEY is not set/.test(err instanceof Error ? err.message : String(err))) {
      return json({ configured: false, requiredSecrets: ["GEMINI_API_KEY", "GEMINI_MODEL (optional)"] });
    }
    return json({ error: geminiErrorMessage(err) }, 502);
  }
});
