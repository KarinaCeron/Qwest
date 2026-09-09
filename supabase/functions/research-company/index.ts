import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const N8N_WEBHOOK_URL =
  "https://karinaceron.app.n8n.cloud/webhook/dd564ef4-d017-43cb-bac2-e6c9efc57ac0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { company, website } = await req.json();
    if (!company || typeof company !== "string" || company.trim().length < 2) {
      return new Response(JSON.stringify({ error: "company required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const companyInput = company.trim().slice(0, 120);
    const websiteInput =
      typeof website === "string" && website.trim() ? website.trim().slice(0, 300) : "";

    // Identify the caller and fetch their Qwest candidate profile summary.
    let candidateProfile = "";
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (token) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (supabaseUrl && serviceKey) {
        const admin = createClient(supabaseUrl, serviceKey);
        const { data: userData, error: userError } = await admin.auth.getUser(token);
        if (userError) {
          console.warn(`research-company: auth.getUser failed: ${userError.message}`);
        } else if (userData?.user) {
          const { data: profile, error: profileError } = await admin
            .from("profiles")
            .select("candidate_profile")
            .eq("user_id", userData.user.id)
            .maybeSingle();
          if (profileError) {
            console.warn(`research-company: profile fetch failed: ${profileError.message}`);
          } else if (typeof profile?.candidate_profile === "string") {
            candidateProfile = profile.candidate_profile.trim().slice(0, 4000);
          }
        }
      }
    }

    const url = new URL(N8N_WEBHOOK_URL);
    url.searchParams.set("company", companyInput);
    if (websiteInput) url.searchParams.set("website", websiteInput);
    if (candidateProfile) url.searchParams.set("candidate_profile", candidateProfile.slice(0, 1500));

    const requestPayload = {
      company: companyInput,
      website: websiteInput,
      candidate_profile: candidateProfile,
    };
    console.log("research-company: sending to n8n:", JSON.stringify(requestPayload));


    let res = await fetch(url.toString(), { method: "GET" });
    let text = await res.text();
    console.log(`research-company: n8n GET responded [${res.status}] body length ${text.length}`);

    if (!res.ok && (res.status === 404 || res.status === 405)) {
      console.log("research-company: GET rejected, retrying with POST");
      res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });
      text = await res.text();
      console.log(`research-company: n8n POST responded [${res.status}] body length ${text.length}`);
    }

    if (!res.ok) {
      console.error(`research-company n8n error [${res.status}]: ${text}`);
      return new Response(
        JSON.stringify({ error: "Company research webhook failed", status: res.status, details: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Unwrap JSON envelopes like {"output":"..."} / {"text":"..."} / {"response":"..."} and arrays
    let clean = text.trim();
    try {
      let parsed: unknown = JSON.parse(clean);
      if (Array.isArray(parsed)) parsed = parsed[0];
      if (typeof parsed === "string") {
        clean = parsed;
      } else if (parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;
        const val = obj.output ?? obj.text ?? obj.response ?? obj.result ?? obj.message;
        if (typeof val === "string") clean = val;
      }
    } catch {
      // not JSON: strip a leading {"output":" wrapper and trailing "} if present
      const m = clean.match(/^\{\s*"(?:output|text|response|result|message)"\s*:\s*"([\s\S]*)"\s*\}$/);
      if (m) clean = m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }

    return new Response(JSON.stringify({ text: clean }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("research-company error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
