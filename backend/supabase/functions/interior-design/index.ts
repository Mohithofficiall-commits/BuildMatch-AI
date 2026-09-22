// ============================================================
// AI INTERIOR DESIGN — REAL Google Gemini vision (Edge Function)
// SELF-CONTAINED VERSION — paste this single file into the
// Supabase Dashboard function editor and deploy as `interior-design`.
//
// POST { imageDataUrl, roomType, style, budget, preferredColours,
//        furnitureNeeds }
// → { result: { summary, sections: {…}, budgetNote? }, model }
//    or { configured: false, requiredSecrets: [...] }
//    or { error: string }
//
// The photo + the user's inputs go to the REAL Gemini API with the
// official @google/genai SDK. Gemini's real analysis is returned;
// nothing is simulated. The key stays in Supabase secrets.
//
// Environment (Supabase secrets):
//   GEMINI_API_KEY  (required)
//   GEMINI_MODEL    (optional, default: gemini-3.6-flash)
// ============================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { GoogleGenAI } from "npm:@google/genai@^1";

// ------------------------------------------------------------
// CORS (STEP 6)
// ------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    throw new GeminiConfigError("GEMINI_API_KEY is not set. Add it in Dashboard → Edge Functions → Secrets.");
  }
  return new GoogleGenAI({ apiKey });
}

interface GeminiStructuredResult<T> {
  text: string;
  data: T | null;
}

/** Real Gemini vision call (image + instruction) expecting JSON back. */
async function askGeminiVisionJSON<T>(
  systemInstruction: string,
  prompt: string,
  image: { mimeType: string; base64: string },
  opts?: { maxOutputTokens?: number; temperature?: number }
): Promise<GeminiStructuredResult<T>> {
  const ai = getGemini();
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: image.mimeType, data: image.base64 } },
        ],
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
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    data = cleaned ? (JSON.parse(cleaned) as T) : null;
  }
  return { text, data };
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

/** Model name for response metadata (no key material). */
function geminiModelName(): string {
  return GEMINI_MODEL;
}

// ------------------------------------------------------------
// SYSTEM PROMPT (unchanged — STEP 9)
// ------------------------------------------------------------
const SYSTEM_INSTRUCTION = `You are the interior-design analyst for BuildMatch, an Indian
construction platform. You receive a photo of a room plus the
homeowner's inputs (room type, preferred style, budget in ₹, preferred
colours, furniture needs).

Analyze only what the photo and inputs actually show. Never invent
dimensions, brands or prices you cannot infer. Recommendations must be
plausible for Indian homes and respect the stated budget.

Respond ONLY with JSON matching exactly:
{
  "summary": string,
  "sections": {
    "styles":    { "title": string, "items": string[] },
    "furniture": { "title": string, "items": string[] },
    "colours":   { "title": string, "items": string[] },
    "layout":    { "title": string, "items": string[] },
    "materials": { "title": string, "items": string[] }
  },
  "budgetNote": string
}
3-5 short items per section. No markdown, no text outside the JSON.`;

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const m = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl.trim());
  return m ? { mimeType: m[1], base64: m[2] } : null;
}

interface DesignRequest {
  imageDataUrl?: string;
  roomType?: string;
  style?: string;
  budget?: number;
  preferredColours?: string;
  furnitureNeeds?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse({ body: "ok" });

  try {
    const body = (await req.json().catch(() => null)) as DesignRequest | null;
    if (!body?.imageDataUrl || typeof body.imageDataUrl !== "string") {
      return json({ error: "Request body must include `imageDataUrl` (base64 data URL of the room photo)." }, 400);
    }
    const image = parseDataUrl(body.imageDataUrl);
    if (!image) {
      return json({ error: "`imageDataUrl` must be a base64 data URL (data:image/...;base64,...)." }, 400);
    }

    const roomType = String(body.roomType || "any room");
    const style = String(body.style || "no fixed style");
    const budget = Number.isFinite(body.budget) ? Number(body.budget) : 0;
    const colours = String(body.preferredColours || "no preference");
    const furniture = String(body.furnitureNeeds || "no specific needs");

    const prompt = `Analyze this ${roomType} photo for an Indian homeowner.
Preferred style: ${style}. Budget: ₹${budget.toLocaleString("en-IN")}.
Preferred colours: ${colours}. Furniture needs: ${furniture}.
Ground every observation in what is visible in the photo and the provided inputs. Return only the JSON described in the system prompt.`;

    const { data } = await askGeminiVisionJSON<Record<string, unknown>>(SYSTEM_INSTRUCTION, prompt, image, {
      maxOutputTokens: 1800,
    });

    if (!data) {
      return json({ error: "Gemini returned a response that was not valid JSON. Please retry." }, 502);
    }

    const r = data as {
      summary?: unknown;
      sections?: Record<string, { title?: unknown; items?: unknown }>;
      budgetNote?: unknown;
    };
    const required = ["styles", "furniture", "colours", "layout", "materials"] as const;
    const missing = required.filter((k) => !r.sections || !r.sections[k] || !Array.isArray(r.sections[k].items));
    if (typeof r.summary !== "string" || missing.length > 0) {
      return json({ error: `Gemini analysis payload is missing required sections: ${missing.join(", ") || "summary"}.` }, 502);
    }

    const section = (k: (typeof required)[number], fallbackTitle: string) => ({
      title: typeof r.sections![k].title === "string" ? String(r.sections![k].title) : fallbackTitle,
      items: (r.sections![k].items as unknown[]).map(String).slice(0, 8),
    });

    return json({
      result: {
        summary: r.summary,
        sections: {
          styles: section("styles", "Recommended Styles"),
          furniture: section("furniture", "Furniture Recommendations"),
          colours: section("colours", "Colour Palette"),
          layout: section("layout", "Layout Suggestions"),
          materials: section("materials", "Material Suggestions"),
        },
        ...(typeof r.budgetNote === "string" ? { budgetNote: r.budgetNote } : {}),
      },
      model: geminiModelName(),
    });
  } catch (err) {
    // Safe diagnostics server-side (never secrets — STEP 7).
    console.error("interior-design error:", err instanceof Error ? err.message : String(err));
    if (/GEMINI_API_KEY is not set/.test(err instanceof Error ? err.message : String(err))) {
      return json({ configured: false, requiredSecrets: ["GEMINI_API_KEY", "GEMINI_MODEL (optional)"] });
    }
    return json({ error: geminiErrorMessage(err) }, 502);
  }
});
