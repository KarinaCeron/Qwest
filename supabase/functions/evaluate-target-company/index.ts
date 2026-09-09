import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const N8N_WEBHOOK_URL =
  "https://karinaceron.app.n8n.cloud/webhook/dd564ef4-d017-43cb-bac2-e6c9efc57ac0";


const CRITERIA = [
  { key: "stage", patterns: [/etapa/i, /runway/i, /financiaci/i] },
  { key: "history", patterns: [/historia/i, /calidad de la empresa/i] },
  { key: "compensation", patterns: [/salario/i, /compensaci/i, /no negociabl/i] },
  { key: "culture", patterns: [/cultura/i, /equipo/i] },
  { key: "path", patterns: [/head of product/i, /trayectoria/i, /camino/i] },
] as const;

function unwrap(text: string): string {
  let clean = text.trim();
  try {
    let parsed: unknown = JSON.parse(clean);
    if (Array.isArray(parsed)) parsed = parsed[0];
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      const val = obj.output ?? obj.text ?? obj.response ?? obj.result ?? obj.message;
      if (typeof val === "string") return val;
    }
  } catch {
    const m = clean.match(/^\{\s*"(?:output|text|response|result|message)"\s*:\s*"([\s\S]*)"\s*\}$/);
    if (m) {
      clean = m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
  }
  return clean;
}

/** Extracts per-criterion scores, confidence and verdicts from the markdown scorecard table. */
function parseScorecard(text: string) {
  const scores: Record<string, number | null> = {};
  const confidence: Record<string, string> = {};
  const verdicts: Record<string, string> = {};
  for (const c of CRITERIA) {
    scores[c.key] = null;
  }

  const lines = text.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    const scoreMatch = line.match(/(\d(?:[.,]\d)?)\s*\/\s*5\b/);
    if (!scoreMatch) continue;
    const label = line.replace(/^\|/, "").split("|")[0] ?? line;
    const target = CRITERIA.find((c) => c.patterns.some((p) => p.test(label)));
    if (!target || scores[target.key] !== null) continue;

    const value = Math.max(0, Math.min(5, Math.round(Number(scoreMatch[1].replace(",", ".")))));
    scores[target.key] = value;

    if (line.startsWith("|")) {
      const cells = line.split("|").map((c) => c.trim()).filter((c) => c !== "");
      const conf = cells.find((c) => /^(alta|media|baja|high|medium|low)$/i.test(c));
      if (conf) confidence[target.key] = conf;
      const verdict = cells[cells.length - 1];
      if (verdict && !/\/\s*5/.test(verdict) && !/^(alta|media|baja)$/i.test(verdict)) {
        verdicts[target.key] = verdict;
      }
    }
  }

  const decision = text.match(/DECISI[ÓO]N FINAL\s*[:\-–]\s*([^\n]+)/i)?.[1]?.trim() ?? null;
  return { scores, confidence, verdicts, decision };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const company = typeof body.company === "string" ? body.company.trim() : "";
    if (company.length < 2) {
      return new Response(JSON.stringify({ error: "company required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const website = typeof body.website === "string" ? body.website.trim().slice(0, 300) : "";
    const role = typeof body.role === "string" ? body.role.trim().slice(0, 200) : "";
    const jobDescription =
      typeof body.jobDescription === "string" ? body.jobDescription.trim().slice(0, 6000) : "";

    // Identify the caller and fetch their Qwest candidate profile summary.
    let candidateProfile = "";
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (supabaseUrl && serviceKey) {
        const admin = createClient(supabaseUrl, serviceKey);
        const { data: userData, error: userError } = await admin.auth.getUser(token);
        if (userError) {
          console.warn(`evaluate-target-company: auth.getUser failed: ${userError.message}`);
        } else if (userData?.user) {
          const { data: profile, error: profileError } = await admin
            .from("profiles")
            .select("candidate_profile")
            .eq("user_id", userData.user.id)
            .maybeSingle();
          if (profileError) {
            console.warn(`evaluate-target-company: profile fetch failed: ${profileError.message}`);
          } else if (typeof profile?.candidate_profile === "string") {
            candidateProfile = profile.candidate_profile.trim().slice(0, 4000);
          }
        }
      }
    }

    const payload = {
      company: company.slice(0, 120),
      website,
      role,
      job_description: jobDescription,
      candidate_profile: candidateProfile,
    };

    console.log(`evaluate-target-company: payload enviado al webhook: ${JSON.stringify(payload)}`);
    console.log(`evaluate-target-company: POST to n8n for "${company}"`);
    let res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let text = await res.text();
    console.log(`evaluate-target-company: n8n POST [${res.status}] length ${text.length}`);

    if (!res.ok && (res.status === 404 || res.status === 405)) {
      const url = new URL(N8N_WEBHOOK_URL);
      url.searchParams.set("company", payload.company);
      if (website) url.searchParams.set("website", website);
      if (role) url.searchParams.set("role", role);
      if (candidateProfile) url.searchParams.set("candidate_profile", candidateProfile.slice(0, 2000));
      if (jobDescription) url.searchParams.set("job_description", jobDescription.slice(0, 1500));
      console.log(
        `evaluate-target-company: GET query params: ${JSON.stringify(
          Object.fromEntries(url.searchParams.entries()),
        )}`,
      );
      res = await fetch(url.toString(), { method: "GET" });
      text = await res.text();
      console.log(`evaluate-target-company: n8n GET [${res.status}] length ${text.length}`);
    }

    if (!res.ok) {
      console.error(`evaluate-target-company n8n error [${res.status}]: ${text.slice(0, 500)}`);
      return new Response(
        JSON.stringify({ error: "Evaluation webhook failed", status: res.status, details: text.slice(0, 800) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const clean = unwrap(text).replace(/\\n/g, "\n");
    const parsed = parseScorecard(clean);

    return new Response(JSON.stringify({ text: clean, ...parsed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-target-company error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
