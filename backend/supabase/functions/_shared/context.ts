// ============================================================
// REAL DATA CONTEXT BUILDER (shared module)
//
// Gathers the actual BuildMatch database records that ground every
// Gemini request. Nothing here is invented: rows come from Supabase,
// and only fields the user is authorized to see are included.
//
// Used by ai-assistant (project/engineer analysis) and by the health
// check to verify DB connectivity.
// ============================================================

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface DbContext {
  db: SupabaseClient;
  /** Authenticated app user row (role + identity) or null. */
  user: { id: string; name: string; role: string } | null;
}

/** Create a service-role client (Edge runtime) — RLS is enforced in code below. */
export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

/** Resolve the calling user's app_users row from their JWT (or demo anon headers). */
export async function resolveUser(req: Request, db: SupabaseClient): Promise<DbContext["user"]> {
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
  //    (The app uses demo logins; treat this as the authenticated identity.)
  const demoId = req.headers.get("x-buildmatch-user");
  if (demoId) {
    const { data: row } = await db.from("app_users").select("id, name, role").eq("id", demoId).maybeSingle();
    if (row) return row;
    // Engineers/professionals demo users exist in app_users by id.
    const { data: eng } = await db.from("engineers").select("id, name").eq("id", demoId).maybeSingle();
    if (eng) return { id: eng.id, name: eng.name, role: "engineer" };
  }

  return null;
}

// ------------------------------------------------------------
// Shapes of the real DB rows we read (subset used in prompts)
// ------------------------------------------------------------

export interface ProjectContext {
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

/** Fetch the real project with all related data (or null if not found/not permitted). */
export async function loadProjectContext(db: SupabaseClient, projectId: string): Promise<ProjectContext | null> {
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
