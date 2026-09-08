// ============================================================
// EXPLAINABLE INTELLIGENT MATCHING ENGINE — Supabase Edge Function
//
// Server-side matching with:
//   • Real DB data (service-role, no RLS restrictions)
//   • Transparent weighted scoring with per-factor explanations
//   • Cross-referencing engineers ↔ professionals for team assembly
//   • Audit-friendly logging (who matched, when, what factors)
//   • Confidence levels on every score
//
// Deploy:  supabase functions deploy explainable-match
// Call:    POST /functions/v1/explainable-match
// ============================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface ProjectRequirement {
  location: string;
  budget: number;
  house_type: string;
  area_sqft: number;
  construction_style: string;
  expected_completion?: string;
}

interface EngineerRow {
  id: string;
  name: string;
  location: string;
  specializations: string[];
  experience_years: number;
  projects_completed: number;
  price_per_sqft: number;
  price_min: number | null;
  price_max: number | null;
  on_time_pct: number;
  budget_adherence_pct: number;
  quality_score: number;
  availability: string;
  is_verified: boolean;
  verification_status: string;
  rating: number;
  reviews_count: number;
}

interface ProfessionalRow {
  id: string;
  name: string;
  profession: string;
  location: string;
  service_area: string | null;
  specializations: string[];
  skills: string[];
  experience_years: number;
  projects_completed: number;
  rating: number;
  reviews_count: number;
  verification_status: string;
  availability: string;
  price_range: string | null;
}

interface MatchFactor {
  label: string;
  score: number;       // 0-100
  weight: number;      // 0-1
  weighted: number;    // score × weight
  confidence: "high" | "medium" | "low";
  reason: string;
}

interface MatchResult {
  id: string;
  name: string;
  type: "engineer" | "professional";
  overallScore: number;
  factors: MatchFactor[];
  explanation: string;
  recommendation: string;
  confidence: "high" | "medium" | "low";
}

interface MatchResponse {
  engineers: MatchResult[];
  professionals: MatchResult[];
  teamRecommendation: {
    engineer: MatchResult | null;
    plumber: MatchResult | null;
    electrician: MatchResult | null;
    carpenter: MatchResult | null;
    supplier: MatchResult | null;
  } | null;
  meta: {
    engineVersion: string;
    matchId: string;
    timestamp: string;
    dataSources: string[];
  };
}

// ----------------------------------------------------------------
// Engine weights — transparent, auditable, swappable
// ----------------------------------------------------------------

const ENGINEER_WEIGHTS = {
  budgetFit: 0.25,
  location: 0.20,
  experience: 0.15,
  specialization: 0.15,
  pastPerformance: 0.15,
  timeline: 0.10,
} as const;

const PROFESSIONAL_WEIGHTS = {
  location: 0.25,
  experience: 0.20,
  specialization: 0.20,
  reputation: 0.15,
  availability: 0.10,
  verification: 0.10,
} as const;

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function confidenceFromEvidence(
  fieldsPresent: number,
  totalFields: number
): "high" | "medium" | "low" {
  const ratio = fieldsPresent / totalFields;
  if (ratio >= 0.8) return "high";
  if (ratio >= 0.5) return "medium";
  return "low";
}

function makeFactor(
  label: string,
  score: number,
  weight: number,
  confidence: "high" | "medium" | "low",
  reason: string
): MatchFactor {
  return {
    label,
    score: clamp(score),
    weight,
    weighted: Math.round(clamp(score) * weight),
    confidence,
    reason,
  };
}

// ----------------------------------------------------------------
// Engineer scoring functions
// ----------------------------------------------------------------

function budgetFit(e: EngineerRow, budget: number, area: number): MatchFactor {
  const estCost = e.price_per_sqft * area;
  const engMin = e.price_min ?? estCost * 0.7;
  const engMax = e.price_max ?? estCost * 1.3;
  const fields = [e.price_per_sqft, e.price_min, e.price_max].filter(
    (v) => v != null && v > 0
  ).length;
  const confidence = confidenceFromEvidence(fields, 3);

  if (budget >= engMin && budget <= engMax) {
    return makeFactor(
      "Budget Fit", 95, ENGINEER_WEIGHTS.budgetFit, confidence,
      `Your budget ₹${budget.toLocaleString("en-IN")} falls within this engineer's range (₹${engMin.toLocaleString("en-IN")}–₹${engMax.toLocaleString("en-IN")}).`
    );
  }
  if (estCost <= budget * 1.1 && estCost >= budget * 0.85) {
    return makeFactor(
      "Budget Fit", 88, ENGINEER_WEIGHTS.budgetFit, confidence,
      `Estimated cost ₹${estCost.toLocaleString("en-IN")} is close to your budget.`
    );
  }
  if (estCost > budget) {
    const over = Math.round(((estCost - budget) / budget) * 100);
    return makeFactor(
      "Budget Fit", clamp(80 - over), ENGINEER_WEIGHTS.budgetFit, confidence,
      `Estimated cost exceeds your budget by ${over}%.`
    );
  }
  const under = Math.round(((budget - estCost) / budget) * 100);
  return makeFactor(
    "Budget Fit", clamp(90 - under * 0.5), ENGINEER_WEIGHTS.budgetFit, confidence,
    `Estimated cost is ${under}% below budget — good value.`
  );
}

function locationMatch(e: EngineerRow, location: string): MatchFactor {
  const eng = e.location.toLowerCase();
  const req = location.toLowerCase();
  const confidence: "high" | "medium" | "low" = e.location ? "high" : "low";

  if (eng === req)
    return makeFactor("Location", 100, ENGINEER_WEIGHTS.location, confidence,
      `Based in ${e.location}, exact match.`);
  if (eng.includes(req) || req.includes(eng))
    return makeFactor("Location", 95, ENGINEER_WEIGHTS.location, confidence,
      `Operates in ${e.location}, within your region.`);
  const tnCities = ["coimbatore", "chennai", "madurai", "salem", "pollachi"];
  const sameRegion =
    tnCities.some((c) => eng.includes(c)) &&
    tnCities.some((c) => req.includes(c));
  if (sameRegion)
    return makeFactor("Location", 85, ENGINEER_WEIGHTS.location, confidence,
      `In ${e.location}, same region as ${location}.`);
  return makeFactor("Location", 60, ENGINEER_WEIGHTS.location, confidence,
    `In ${e.location}, different city — travel costs may apply.`);
}

function experience(e: EngineerRow): MatchFactor {
  const fields = [e.experience_years, e.projects_completed].filter(
    (v) => v != null && v > 0
  ).length;
  const confidence = confidenceFromEvidence(fields, 2);
  let score = clamp(60 + e.experience_years * 2.5);
  if (e.experience_years >= 10) score = clamp(score + 10);
  if (e.projects_completed >= 40) score = clamp(score + 5);
  return makeFactor(
    "Experience", score, ENGINEER_WEIGHTS.experience, confidence,
    `${e.experience_years} years, ${e.projects_completed} completed projects.`
  );
}

function specialization(e: EngineerRow, req: ProjectRequirement): MatchFactor {
  const specs = e.specializations.map((s) => s.toLowerCase());
  let matches = 0;
  const matched: string[] = [];
  if (specs.includes(req.house_type.toLowerCase())) { matches++; matched.push(req.house_type); }
  if (specs.includes(req.construction_style.toLowerCase())) { matches++; matched.push(req.construction_style); }
  if (specs.includes("residential")) { matches += 0.5; matched.push("Residential"); }
  const score = clamp(60 + matches * 18);
  const confidence = confidenceFromEvidence(matches > 0 ? 1 : 0, 1);
  return makeFactor(
    "Specialization", score, ENGINEER_WEIGHTS.specialization, confidence,
    matches >= 2
      ? `Specializes in ${matched.join(", ")} — direct match.`
      : matches >= 1
      ? `Partially matches: ${matched.join(", ")}.`
      : `General residential; no direct specialization match for ${req.house_type} ${req.construction_style}.`
  );
}

function pastPerformance(e: EngineerRow): MatchFactor {
  const fields = [e.on_time_pct, e.budget_adherence_pct, e.quality_score].filter(
    (v) => v != null && v > 0
  ).length;
  const confidence = confidenceFromEvidence(fields, 3);
  const avg = Math.round((e.on_time_pct + e.budget_adherence_pct + e.quality_score) / 3);
  return makeFactor(
    "Past Performance", avg, ENGINEER_WEIGHTS.pastPerformance, confidence,
    `On-time ${e.on_time_pct}%, budget adherence ${e.budget_adherence_pct}%, quality ${e.quality_score}/100 — avg ${avg}.`
  );
}

function timeline(e: EngineerRow, req: ProjectRequirement): MatchFactor {
  const confidence: "high" | "medium" | "low" = e.availability ? "medium" : "low";
  if (!req.expected_completion)
    return makeFactor("Timeline Fit", 80, ENGINEER_WEIGHTS.timeline, confidence,
      "No specific timeline provided; availability looks good.");
  if (e.availability === "Busy")
    return makeFactor("Timeline Fit", 65, ENGINEER_WEIGHTS.timeline, confidence,
      "Currently Busy — timeline may be tight.");
  if (e.availability === "Available")
    return makeFactor("Timeline Fit", 90, ENGINEER_WEIGHTS.timeline, confidence,
      "Available — can start per your timeline.");
  return makeFactor("Timeline Fit", 75, ENGINEER_WEIGHTS.timeline, confidence,
    `Availability: ${e.availability}.`);
}

function scoreEngineer(e: EngineerRow, req: ProjectRequirement): MatchResult {
  const factors = [
    budgetFit(e, req.budget, req.area_sqft),
    locationMatch(e, req.location),
    experience(e),
    specialization(e, req),
    pastPerformance(e),
    timeline(e, req),
  ];
  const overallScore = Math.round(
    factors.reduce((s, f) => s + f.weighted, 0)
  );
  const topFactors = [...factors].sort((a, b) => b.weighted - a.weighted).slice(0, 3);
  const avgConfidence =
    factors.filter((f) => f.confidence === "high").length >= 4
      ? "high"
      : factors.filter((f) => f.confidence === "low").length >= 3
      ? "low"
      : "medium";

  const explanation =
    `${e.name} is recommended because they have ${e.experience_years} years of experience ` +
    `across ${e.projects_completed} projects, operate in ${e.location}, ` +
    `and maintain ${e.on_time_pct}% on-time delivery. ` +
    `Strongest factors: ${topFactors.map((f) => `${f.label} (${f.score}%)`).join(", ")}.`;

  const recommendation =
    overallScore >= 85
      ? "Strong match — highly recommended for this project."
      : overallScore >= 70
      ? "Good match — worth considering."
      : overallScore >= 55
      ? "Fair match — review specialization and availability."
      : "Weak match — better alternatives likely exist.";

  return {
    id: e.id,
    name: e.name,
    type: "engineer",
    overallScore,
    factors,
    explanation,
    recommendation,
    confidence: avgConfidence,
  };
}

// ----------------------------------------------------------------
// Professional scoring (plumber, electrician, carpenter, etc.)
// ----------------------------------------------------------------

function profLocation(p: ProfessionalRow, location: string): MatchFactor {
  const loc = p.location.toLowerCase();
  const area = (p.service_area ?? "").toLowerCase();
  const req = location.toLowerCase();
  const fields = [p.location, p.service_area].filter(Boolean).length;
  const confidence = confidenceFromEvidence(fields, 2);
  if (loc === req)
    return makeFactor("Location", 100, PROFESSIONAL_WEIGHTS.location, confidence,
      `Based in ${p.location}, exact match.`);
  if (area && (area.includes(req) || req.split(",").some((t) => area.includes(t.trim()))))
    return makeFactor("Location", 95, PROFESSIONAL_WEIGHTS.location, confidence,
      `Service area (${p.service_area}) covers ${location}.`);
  if (loc.includes(req) || req.includes(loc))
    return makeFactor("Location", 90, PROFESSIONAL_WEIGHTS.location, confidence,
      `Operates in ${p.location}, within your region.`);
  return makeFactor("Location", 60, PROFESSIONAL_WEIGHTS.location, confidence,
    `In ${p.location}, different city — travel may apply.`);
}

function profExperience(p: ProfessionalRow): MatchFactor {
  const fields = [p.experience_years, p.projects_completed].filter(
    (v) => v > 0
  ).length;
  const confidence = confidenceFromEvidence(fields, 2);
  if (fields === 0)
    return makeFactor("Experience", 55, PROFESSIONAL_WEIGHTS.experience, confidence,
      "Not enough data — no experience recorded.");
  let score = clamp(60 + p.experience_years * 2);
  if (p.experience_years >= 8) score = clamp(score + 8);
  if (p.projects_completed >= 50) score = clamp(score + 5);
  return makeFactor(
    "Experience", score, PROFESSIONAL_WEIGHTS.experience, confidence,
    `${p.experience_years} years, ${p.projects_completed} completed projects.`
  );
}

function profSpecialization(p: ProfessionalRow, req: ProjectRequirement): MatchFactor {
  const all = [...p.specializations, ...p.skills].map((s) => s.toLowerCase());
  const confidence = confidenceFromEvidence(all.length > 0 ? 1 : 0, 1);
  if (all.length === 0)
    return makeFactor("Specialization", 55, PROFESSIONAL_WEIGHTS.specialization, confidence,
      "Not enough data — no skills recorded.");
  let matches = 0;
  const matched: string[] = [];
  if (all.some((s) => s.includes(req.house_type.toLowerCase()) || req.house_type.toLowerCase().includes(s))) { matches++; matched.push(req.house_type); }
  if (all.some((s) => s.includes(req.construction_style.toLowerCase()) || req.construction_style.toLowerCase().includes(s))) { matches++; matched.push(req.construction_style); }
  const score = clamp(60 + matches * 16);
  return makeFactor(
    "Specialization", score, PROFESSIONAL_WEIGHTS.specialization, confidence,
    matches >= 1
      ? `Relevant skills: ${matched.join(", ")}.`
      : `Skills (${all.slice(0, 3).join(", ")}) — general ${p.profession.replace("_", " ")} work.`
  );
}

function profReputation(p: ProfessionalRow): MatchFactor {
  const fields = [p.rating, p.reviews_count].filter((v) => v > 0).length;
  const confidence = confidenceFromEvidence(fields, 2);
  if (fields === 0)
    return makeFactor("Reputation", 55, PROFESSIONAL_WEIGHTS.reputation, confidence,
      "Not enough data — no verified ratings yet.");
  const score = clamp(Math.round((p.rating / 5) * 100) + Math.min(10, p.reviews_count));
  return makeFactor(
    "Reputation", score, PROFESSIONAL_WEIGHTS.reputation, confidence,
    `${p.rating.toFixed(1)}★ across ${p.reviews_count} reviews.`
  );
}

function profAvailability(p: ProfessionalRow): MatchFactor {
  const confidence: "high" | "medium" | "low" = p.availability ? "medium" : "low";
  if (!p.availability)
    return makeFactor("Availability", 60, PROFESSIONAL_WEIGHTS.availability, confidence,
      "Not enough data — availability not recorded.");
  if (p.availability === "Available")
    return makeFactor("Availability", 90, PROFESSIONAL_WEIGHTS.availability, confidence,
      "Available — can start per your timeline.");
  if (p.availability === "Busy")
    return makeFactor("Availability", 60, PROFESSIONAL_WEIGHTS.availability, confidence,
      "Busy — timeline may be tight.");
  return makeFactor("Availability", 75, PROFESSIONAL_WEIGHTS.availability, confidence,
    `Availability: ${p.availability}.`);
}

function profVerification(p: ProfessionalRow): MatchFactor {
  const confidence: "high" | "medium" | "low" = p.verification_status ? "high" : "low";
  if (p.verification_status === "verified")
    return makeFactor("Verification", 100, PROFESSIONAL_WEIGHTS.verification, confidence,
      "Verified — identity and credentials checked.");
  if (p.verification_status === "pending")
    return makeFactor("Verification", 70, PROFESSIONAL_WEIGHTS.verification, confidence,
      "Verification pending — not yet fully checked.");
  if (p.verification_status === "rejected")
    return makeFactor("Verification", 40, PROFESSIONAL_WEIGHTS.verification, confidence,
      "Verification rejected — review before engaging.");
  return makeFactor("Verification", 60, PROFESSIONAL_WEIGHTS.verification, confidence,
    "Verification status not recorded.");
}

function scoreProfessional(p: ProfessionalRow, req: ProjectRequirement): MatchResult {
  const factors = [
    profLocation(p, req.location),
    profExperience(p),
    profSpecialization(p, req),
    profReputation(p),
    profAvailability(p),
    profVerification(p),
  ];
  const overallScore = Math.round(factors.reduce((s, f) => s + f.weighted, 0));
  const topFactors = [...factors].sort((a, b) => b.weighted - a.weighted).slice(0, 3);
  const avgConfidence =
    factors.filter((f) => f.confidence === "high").length >= 4
      ? "high"
      : factors.filter((f) => f.confidence === "low").length >= 3
      ? "low"
      : "medium";

  const explanation =
    `${p.name} (${p.profession.replace("_", " ")}) serves ${p.service_area ?? p.location} ` +
    `with ${p.experience_years} years and ${p.projects_completed} completed projects. ` +
    `Strongest factors: ${topFactors.map((f) => `${f.label} (${f.score}%)`).join(", ")}.`;

  const recommendation =
    overallScore >= 85
      ? "Strong match — recommended for this project role."
      : overallScore >= 70
      ? "Good match — consider for the team."
      : overallScore >= 55
      ? "Fair match — review before engaging."
      : "Weak match — limited data or poor fit.";

  return {
    id: p.id,
    name: p.name,
    type: "professional",
    overallScore,
    factors,
    explanation,
    recommendation,
    confidence: avgConfidence,
  };
}

// ----------------------------------------------------------------
// Team assembly — picks best-in-role for the recommended team
// ----------------------------------------------------------------

function assembleTeam(
  profResults: MatchResult[]
): MatchResponse["teamRecommendation"] {
  const pick = (role: string) =>
    profResults.find((r) => {
      // name-based heuristic for demo; real data would use profession field
      const n = r.name.toLowerCase();
      if (role === "plumber") return n.includes("plumb") || r.factors.some((f) => f.reason.toLowerCase().includes("plumb"));
      if (role === "electrician") return n.includes("electric") || r.factors.some((f) => f.reason.toLowerCase().includes("electric"));
      if (role === "carpenter") return n.includes("carpent") || n.includes("wood") || r.factors.some((f) => f.reason.toLowerCase().includes("carpent"));
      if (role === "supplier") return n.includes("mart") || n.includes("supply") || n.includes("material");
      return false;
    }) ?? null;

  return {
    engineer: null, // filled by caller from engineerResults
    plumber: pick("plumber"),
    electrician: pick("electrician"),
    carpenter: pick("carpenter"),
    supplier: pick("supplier"),
  };
}

// ----------------------------------------------------------------
// Main handler
// ----------------------------------------------------------------

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const requirement: ProjectRequirement = body.requirement;

    if (!requirement || !requirement.location || !requirement.budget) {
      return new Response(
        JSON.stringify({ error: "requirement.location and requirement.budget are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch engineers from DB (service-role bypasses RLS)
    const { data: engineers, error: engErr } = await supabase
      .from("engineers")
      .select("*");

    // Fetch professional profiles
    const { data: professionals, error: profErr } = await supabase
      .from("professional_profiles")
      .select("*");

    const dataSources: string[] = [];
    if (!engErr && engineers) dataSources.push(`engineers (${engineers.length})`);
    if (!profErr && professionals) dataSources.push(`professionals (${professionals.length})`);

    // Score every engineer
    const engineerResults: MatchResult[] = (engineers ?? [])
      .map((e: EngineerRow) => scoreEngineer(e, requirement))
      .sort((a, b) => b.overallScore - a.overallScore);

    // Score every professional
    const professionalResults: MatchResult[] = (professionals ?? [])
      .map((p: ProfessionalRow) => scoreProfessional(p, requirement))
      .sort((a, b) => b.overallScore - a.overallScore);

    // Assemble recommended team
    const team = assembleTeam(professionalResults);
    team.engineer = engineerResults[0] ?? null;

    // Build response
    const matchId = crypto.randomUUID();
    const response: MatchResponse = {
      engineers: engineerResults,
      professionals: professionalResults,
      teamRecommendation: team,
      meta: {
        engineVersion: "1.0.0",
        matchId,
        timestamp: new Date().toISOString(),
        dataSources,
      },
    };

    // Log the match for auditing (insert into a lightweight log table if it exists)
    try {
      await supabase.from("match_logs").insert({
        match_id: matchId,
        requirement,
        top_engineer: engineerResults[0]?.id ?? null,
        top_engineer_score: engineerResults[0]?.overallScore ?? 0,
        total_engineers: engineerResults.length,
        total_professionals: professionalResults.length,
      });
    } catch {
      // match_logs table may not exist yet — non-fatal
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
