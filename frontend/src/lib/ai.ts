// ============================================================
// BUILDMATCH AI CLIENT — real Gemini via BuildMatch Edge Functions
//
// Architecture (enforced):
//   Frontend → Supabase Edge Function (holds GEMINI_API_KEY) → Google Gemini
//
// The key NEVER appears in browser code, VITE_ vars, or responses.
// This client NEVER fabricates AI output: failures surface as
// status 'error' / 'not_configured' with the server's real message.
// ============================================================

import { supabase } from "./supabase";

export interface AIConfig {
  /** Edge Functions are wired and callable. */
  managedAvailable: boolean;
  /** Human-readable setup steps shown when Gemini isn't configured yet. */
  requiredSetup: string[];
}

export function getAIConfig(): AIConfig {
  return {
    managedAvailable: Boolean(supabase),
    requiredSetup: [
      "supabase functions deploy ai-assistant interior-design",
      "supabase secrets set GEMINI_API_KEY=your_real_key",
      "supabase secrets set GEMINI_MODEL=gemini-3.6-flash (optional)",
    ],
  };
}

/** Result of an attempted remote AI call. */
export interface AIRemoteResult<T> {
  status: "ok" | "not_configured" | "error";
  data?: T;
  /** Why the call did not succeed — shown verbatim in the UI. */
  reason?: string;
}

interface EdgeEnvelope {
  configured?: boolean;
  requiredSecrets?: string[];
  error?: string;
  reply?: string;
  result?: unknown;
  answer?: unknown;
  recommendations?: unknown;
  risks?: unknown;
  nextActions?: unknown;
  missingInformation?: unknown;
  confidence?: unknown;
  model?: string;
}

async function callFunction(name: string, body: Record<string, unknown>): Promise<AIRemoteResult<EdgeEnvelope>> {
  // Identify the caller to the backend (demo sessions have no Supabase JWT).
  let userId: string | null = null;
  try { userId = sessionStorage.getItem('buildmatch-user-id'); } catch { /* unavailable */ }
  try {
    const { data, error } = await supabase.functions.invoke(name, {
      body,
      ...(userId ? { headers: { 'x-buildmatch-user': userId } } : {}),
    });
    if (error) {
      const msg = (error as { message?: string }).message || `AI service (${name}) failed.`;
      // functions.invoke throws FunctionsHttpError for non-2xx; the JSON body
      // carries our real error message. Surface it verbatim.
      return { status: "error", reason: msg };
    }
    const env = data as EdgeEnvelope | null;
    if (!env) return { status: "error", reason: `AI service (${name}) returned an empty response.` };
    if (env.configured === false) {
      return {
        status: "not_configured",
        reason:
          "The AI service is not configured on the server yet. The deployment needs: " +
          (env.requiredSecrets?.join(" · ") || "GEMINI_API_KEY"),
      };
    }
    if (env.error) return { status: "error", reason: env.error };
    return { status: "ok", data: env };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: "not_configured",
      reason: `The AI service (${name}) is not reachable — it may not be deployed yet, or your network is offline. ${msg}`,
    };
  }
}

// ------------------------------------------------------------
// Chat completion (Helping AI assistant)
// ------------------------------------------------------------

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResult {
  status: "ok" | "not_configured" | "error";
  reply?: string;
  model?: string;
  reason?: string;
}

/**
 * Real Gemini chat via the ai-assistant Edge Function.
 * The function grounds the reply in the user's real BuildMatch data.
 */
export async function aiChat(messages: ChatMessage[]): Promise<ChatResult> {
  const res = await callFunction("ai-assistant", {
    op: "chat",
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  if (res.status === "ok" && res.data?.reply) {
    return { status: "ok", reply: res.data.reply, model: res.data.model };
  }
  return { status: res.status, reason: res.reason };
}

// ------------------------------------------------------------
// Structured project analysis (recommendations, risks, actions)
// ------------------------------------------------------------

export interface AIRecommendation {
  name: string;
  reason: string;
  confidence: number;
}

export interface AIRisk {
  title: string;
  severity: "low" | "medium" | "high";
  reason: string;
}

export interface AIAnalysis {
  answer: string;
  recommendations: AIRecommendation[];
  risks: AIRisk[];
  nextActions: string[];
  missingInformation: string[];
  confidence: number | null;
  model?: string;
}

/**
 * Real Gemini structured analysis via the ai-assistant Edge Function.
 * All data in the response derives from the user's real BuildMatch records.
 */
export async function aiAnalyze(params: { message: string; projectId?: string }): Promise<AIRemoteResult<AIAnalysis>> {
  const res = await callFunction("ai-assistant", {
    op: "analyze",
    message: params.message,
    ...(params.projectId ? { projectId: params.projectId } : {}),
  });
  if (res.status !== "ok" || !res.data) return { status: res.status, reason: res.reason };

  const d = res.data;
  const answer = typeof d.answer === "string" ? d.answer : "";
  if (!answer) return { status: "error", reason: "Gemini returned an analysis without an answer." };

  const recs = Array.isArray(d.recommendations) ? d.recommendations : [];
  return {
    status: "ok",
    data: {
      answer,
      recommendations: recs.map((r) => {
        const o = r as Record<string, unknown>;
        return {
          name: String(o.name ?? "Unknown"),
          reason: String(o.reason ?? ""),
          confidence: typeof o.confidence === "number" ? o.confidence : 0,
        };
      }),
      risks: (Array.isArray(d.risks) ? d.risks : []).map((r) => {
        const o = r as Record<string, unknown>;
        return {
          title: String(o.title ?? "Risk"),
          severity: (["low", "medium", "high"] as const).includes(o.severity as "low" | "medium" | "high")
            ? (o.severity as "low" | "medium" | "high")
            : "medium",
          reason: String(o.reason ?? ""),
        };
      }),
      nextActions: (Array.isArray(d.nextActions) ? d.nextActions : []).map(String),
      missingInformation: (Array.isArray(d.missingInformation) ? d.missingInformation : []).map(String),
      confidence: typeof d.confidence === "number" ? d.confidence : null,
      model: d.model,
    },
  };
}

// ------------------------------------------------------------
// Interior design image analysis (real Gemini vision)
// ------------------------------------------------------------

export interface InteriorDesignRequest {
  /** Base64 data URL of the uploaded photo. */
  imageDataUrl: string;
  roomType: string;
  style: string;
  budget: number;
  preferredColours: string;
  furnitureNeeds: string;
}

export interface InteriorDesignSection {
  title: string;
  items: string[];
}

export interface InteriorDesignResult {
  summary: string;
  sections: {
    styles: InteriorDesignSection;
    furniture: InteriorDesignSection;
    colours: InteriorDesignSection;
    layout: InteriorDesignSection;
    materials: InteriorDesignSection;
  };
  budgetNote?: string;
}

export interface InteriorDesignResultEnvelope {
  status: "ok" | "not_configured" | "error";
  result?: InteriorDesignResult;
  model?: string;
  reason?: string;
}

/**
 * Real Gemini vision analysis of the uploaded room photo.
 */
export async function aiInteriorDesign(req: InteriorDesignRequest): Promise<InteriorDesignResultEnvelope> {
  const res = await callFunction("interior-design", {
    imageDataUrl: req.imageDataUrl,
    roomType: req.roomType,
    style: req.style,
    budget: req.budget,
    preferredColours: req.preferredColours,
    furnitureNeeds: req.furnitureNeeds,
  });
  if (res.status === "ok" && res.data?.result) {
    return { status: "ok", result: res.data.result as InteriorDesignResult, model: res.data.model };
  }
  return { status: res.status, reason: res.reason };
}
