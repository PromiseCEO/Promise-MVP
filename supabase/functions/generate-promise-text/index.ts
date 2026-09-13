// Supabase Edge Function: generate-promise-text
// Deploy with: supabase functions deploy generate-promise-text
// Secrets needed (supabase secrets set ...):
//   ANTHROPIC_API_KEY
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-available in Edge Functions)
//
// Generates the narrative text for any of the four Promise
// documents (self / dating / engagement / marriage) using Claude,
// grounded in the user's own answers. The frontend never calls
// Anthropic directly, so the API key never reaches the client.

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function callClaude(system: string, user: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 900,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${t}`);
  }
  const data = await res.json();
  const text = (data.content ?? [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n")
    .trim();
  if (!text) throw new Error("Empty response from model");
  return text;
}

const SYSTEM_PROMPT = `You write warm, sincere, specific promise documents for a relationship app called Promise.
Ground everything in the details the user actually gave you — never invent facts they didn't state.
Write in first person (or "we" for shared promises), 3-5 short paragraphs, no headers, no bullet lists,
no markdown formatting. Tone: heartfelt but not corny, plainspoken, a little literary. Do not use the words
"journey" or "intentional" more than once each.`;

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }

    const { kind, payload } = await req.json();
    let userPrompt = "";

    if (kind === "self") {
      const { dateYourself, commitments, goals } = payload;
      const goalLines = Object.entries(goals ?? {})
        .filter(([, v]) => typeof v === "string" && v.trim())
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n");
      userPrompt = `Write a personal "Self Promise" for someone building a relationship with themselves before dating.

Their required reflection ("Date Yourself First"): "${dateYourself}"

Personal commitments they selected: ${(commitments ?? []).join("; ")}

${goalLines ? `Other goals they shared:\n${goalLines}` : ""}

Write it as a promise to themselves, in first person, that a healthy partner should add to their life rather than complete it.`;
    } else if (kind === "dating") {
      const { commitments, nameA, nameB } = payload;
      userPrompt = `Write a short "Dating Promise" for two people, ${nameA} and ${nameB}, who matched on Promise and are choosing to date with intention.

Shared commitments they both selected: ${(commitments ?? []).join("; ")}

Write it in "we" language — a promise about how they intend to date each other honestly and check in on how things are going, without assuming any outcome like engagement.`;
    } else if (kind === "engagement") {
      const { commitments, nameA, nameB, weddingTargetDate, venueType, budgetNotes, familyInvolvement } = payload;
      userPrompt = `Write an "Engagement Promise" for ${nameA} and ${nameB}, who have been dating consistently and are now engaged.

Commitments they selected: ${(commitments ?? []).join("; ")}
Wedding target timing: ${weddingTargetDate || "not yet decided"}
Venue type: ${venueType || "not yet decided"}
Budget approach they discussed: ${budgetNotes || "not specified"}
Family involvement: ${familyInvolvement || "not specified"}

Write it as a shared promise about how they'll plan the wedding and build the marriage together, weaving in the practical details above naturally rather than listing them.`;
    } else if (kind === "marriage") {
      const { selfPromiseA, selfPromiseB, datingOrRealignmentHtml, engagementHtml, longTermGoals, nameA, nameB } = payload;
      userPrompt = `Write the final "Marriage Promise" for ${nameA} and ${nameB} — a keepsake document that draws together everything they have promised so far into one combined statement, plus a few new long-term commitments.

${nameA}'s original Self Promise:
${stripHtml(selfPromiseA || "")}

${nameB}'s original Self Promise:
${stripHtml(selfPromiseB || "")}

Their Dating/Realignment Promise:
${stripHtml(datingOrRealignmentHtml || "")}

Their Engagement Promise:
${stripHtml(engagementHtml || "")}

New long-term commitment goals for the marriage: ${(longTermGoals ?? []).join("; ")}

Weave the throughlines from the earlier promises into one cohesive marriage promise — don't just concatenate them. End with the new long-term goals folded in naturally.`;
    } else {
      return new Response(JSON.stringify({ error: "Unknown kind" }), { status: 400 });
    }

    const text = await callClaude(SYSTEM_PROMPT, userPrompt);
    return new Response(JSON.stringify({ text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
