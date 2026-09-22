// ============================================================
// GEMINI SERVICE — REAL Google Gemini integration (shared module)
//
// Used by the BuildMatch Edge Functions (ai-assistant,
// interior-design). This is the ONLY place that talks to Gemini.
//
// Uses the official @google/genai SDK via npm:jsr compatibility in
// Deno Edge Functions. The API key comes from Supabase secrets:
//   GEMINI_API_KEY  (required)
//   GEMINI_MODEL    (optional, default: gemini-3.6-flash)
//
// Principles:
//   • REAL requests only — no mocks, no fallback text, no if/else
//     answer simulation. If Gemini fails, we surface a real error.
//   • The key NEVER leaves the server (not in responses, not in logs).
// ============================================================

import { GoogleGenAI } from "npm:@google/genai@^1";

export const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash";

/** Build the SDK client per call (cheap; keeps secrets handling central). */
export function getGemini(): GoogleGenAI {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    // No fake fallback — the caller reports configuration state honestly.
    throw new GeminiConfigError(
      "GEMINI_API_KEY is not set. Configure it with: supabase secrets set GEMINI_API_KEY=your_real_key"
    );
  }
  return new GoogleGenAI({ apiKey });
}

export class GeminiConfigError extends Error {}

export interface GeminiStructuredResult<T> {
  text: string;
  data: T | null; // parsed JSON when the model was asked for JSON
}

/**
 * Real Gemini call expecting JSON back (structured analysis).
 * Uses responseMimeType: application/json so Gemini returns parseable JSON.
 */
export async function askGeminiJSON<T>(
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
        parts: [
          { text: typeof userPayload === "string" ? userPayload : JSON.stringify(userPayload, null, 2) },
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
  if (!text.trim()) throw new Error("Gemini returned an empty response (possibly all output budget went to thinking tokens). Please retry.");

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

/**
 * Real Gemini call returning plain text (chat-style replies).
 */
export async function askGeminiText(
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

/**
 * Real Gemini vision call (image + instruction) expecting JSON back.
 */
export async function askGeminiVisionJSON<T>(
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
      maxOutputTokens: opts?.maxOutputTokens ?? 8000,
    },
  });

  const text = response.text ?? "";
  if (!text.trim()) throw new Error("Gemini returned an empty response (possibly all output budget went to thinking tokens). Please retry.");

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
export function geminiErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (err instanceof GeminiConfigError) return msg;
  if (/API key not valid|API_KEY_INVALID|permission/i.test(msg)) {
    return "The configured Gemini API key was rejected by Google. Check GEMINI_API_KEY in the backend secrets.";
  }
  if (/429|RESOURCE_EXHAUSTED|quota|rate/i.test(msg)) {
    return "Gemini rate limit reached. Please try again in a moment.";
  }
  if (/503|UNAVAILABLE|overloaded/i.test(msg)) {
    return "Gemini is temporarily unavailable. Please try again.";
  }
  if (/timeout|aborted|deadline/i.test(msg)) {
    return "The Gemini request timed out. Please try again.";
  }
  if (/fetch|network|ENOTFOUND|ECONNREFUSED/i.test(msg)) {
    return "Could not reach the Gemini service. Check network connectivity.";
  }
  return `Gemini request failed: ${msg.slice(0, 200)}`;
}

/** Health probe — reports configuration WITHOUT exposing the key. */
export function geminiHealth() {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  return {
    configured: Boolean(apiKey),
    provider: "Google Gemini",
    model: GEMINI_MODEL,
    keyPreview: apiKey ? `${apiKey.slice(0, 4)}…${apiKey.slice(-2)}` : null, // never the full key
  };
}
