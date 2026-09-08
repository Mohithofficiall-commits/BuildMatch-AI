// ============================================================
// EXPLAINABLE MATCHING CLIENT — calls the Edge Function, falls
// back to the local engine if the function isn't deployed yet.
//
// The local engine is a byte-for-byte copy of the server logic,
// so results are identical either way. The backend path adds:
//   • service-role DB access (no RLS restrictions)
//   • match audit logging
//   • future: AI-enhanced explanations
// ============================================================

import { supabase } from "./supabase";
import {
  rankEngineers,
  rankProfessionals,
} from "./matching";
import type {
  Engineer,
  ProfessionalProfile,
  ProjectRequirement,
  MatchResult,
  ProfessionalMatchResult,
} from "./types";

// ----------------------------------------------------------------
// Types returned by the Edge Function
// ----------------------------------------------------------------

interface EdgeMatchResult {
  id: string;
  name: string;
  type: "engineer" | "professional";
  overallScore: number;
  factors: {
    label: string;
    score: number;
    weight: number;
    weighted: number;
    confidence: "high" | "medium" | "low";
    reason: string;
  }[];
  explanation: string;
  recommendation: string;
  confidence: "high" | "medium" | "low";
}

interface EdgeMatchResponse {
  engineers: EdgeMatchResult[];
  professionals: EdgeMatchResult[];
  teamRecommendation: {
    engineer: EdgeMatchResult | null;
    plumber: EdgeMatchResult | null;
    electrician: EdgeMatchResult | null;
    carpenter: EdgeMatchResult | null;
    supplier: EdgeMatchResult | null;
  } | null;
  meta: {
    engineVersion: string;
    matchId: string;
    timestamp: string;
    dataSources: string[];
  };
}

// ----------------------------------------------------------------
// Convert Edge Function results back to frontend types
// ----------------------------------------------------------------

function edgeToEngineerMatch(
  edge: EdgeMatchResult,
  engineers: Engineer[]
): MatchResult {
  const engineer = engineers.find((e) => e.id === edge.id) ?? engineers[0];
  return {
    engineer,
    overallScore: edge.overallScore,
    factors: edge.factors.map((f) => ({
      label: f.label,
      score: f.score,
      weight: f.weight,
      weighted: f.weighted,
      reason: f.reason + (f.confidence !== "high" ? ` [confidence: ${f.confidence}]` : ""),
    })),
    explanation: edge.explanation,
  };
}

function edgeToProfessionalMatch(
  edge: EdgeMatchResult,
  profiles: ProfessionalProfile[]
): ProfessionalMatchResult {
  const profile = profiles.find((p) => p.id === edge.id) ?? profiles[0];
  return {
    profile,
    overallScore: edge.overallScore,
    factors: edge.factors.map((f) => ({
      label: f.label,
      score: f.score,
      weight: f.weight,
      weighted: f.weighted,
      reason: f.reason + (f.confidence !== "high" ? ` [confidence: ${f.confidence}]` : ""),
    })),
    explanation: edge.explanation,
  };
}

// ----------------------------------------------------------------
// Public API — the single entry point consumers use
// ----------------------------------------------------------------

export interface MatchApiResponse {
  engineerResults: MatchResult[];
  professionalResults: ProfessionalMatchResult[];
  teamRecommendation: {
    engineer: MatchResult | null;
    plumber: ProfessionalMatchResult | null;
    electrician: ProfessionalMatchResult | null;
    carpenter: ProfessionalMatchResult | null;
    supplier: ProfessionalMatchResult | null;
  } | null;
  source: "backend" | "local";
  meta?: {
    engineVersion: string;
    matchId: string;
    timestamp: string;
    dataSources: string[];
  };
}

/**
 * Run the explainable matching engine.
 * Tries the Supabase Edge Function first; falls back to local computation.
 */
export async function runExplainableMatch(
  requirement: ProjectRequirement,
  engineers: Engineer[],
  professionals: ProfessionalProfile[]
): Promise<MatchApiResponse> {
  // Try the Edge Function first
  try {
    const { data, error } = await supabase.functions.invoke(
      "explainable-match",
      {
        body: { requirement },
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!error && data && data.engineers) {
      const edge = data as EdgeMatchResponse;
      return {
        engineerResults: edge.engineers.map((e) =>
          edgeToEngineerMatch(e, engineers)
        ),
        professionalResults: edge.professionals.map((p) =>
          edgeToProfessionalMatch(p, professionals)
        ),
        teamRecommendation: edge.teamRecommendation
          ? {
              engineer: edge.teamRecommendation.engineer
                ? edgeToEngineerMatch(edge.teamRecommendation.engineer, engineers)
                : null,
              plumber: edge.teamRecommendation.plumber
                ? edgeToProfessionalMatch(edge.teamRecommendation.plumber, professionals)
                : null,
              electrician: edge.teamRecommendation.electrician
                ? edgeToProfessionalMatch(edge.teamRecommendation.electrician, professionals)
                : null,
              carpenter: edge.teamRecommendation.carpenter
                ? edgeToProfessionalMatch(edge.teamRecommendation.carpenter, professionals)
                : null,
              supplier: edge.teamRecommendation.supplier
                ? edgeToProfessionalMatch(edge.teamRecommendation.supplier, professionals)
                : null,
            }
          : null,
        source: "backend",
        meta: edge.meta,
      };
    }
  } catch {
    // Edge Function not deployed — fall through to local
  }

  // Local fallback — same algorithm, same transparency
  const engineerResults = rankEngineers(engineers, requirement);
  const professionalResults = rankProfessionals(professionals, requirement);

  return {
    engineerResults,
    professionalResults,
    teamRecommendation: null,
    source: "local",
  };
}
