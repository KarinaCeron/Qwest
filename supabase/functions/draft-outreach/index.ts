import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "google/gemini-3.8-flash";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token || !supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const companyId = typeof body.companyId === "string" ? body.companyId : "";
    const contactName = typeof body.contactName === "string" ? body.contactName.slice(0, 120) : "";
    const contactTitle = typeof body.contactTitle === "string" ? body.contactTitle.slice(0, 160) : "";
    if (!companyId || !contactName) {
      return new Response(JSON.stringify({ error: "companyId and contactName are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: company, error: companyError } = await admin
      .from("target_companies")
      .select("company, website, role_title, final_decision, analysis, evaluation")
      .eq("id", companyId)
      .eq("user_id", userId)
      .maybeSingle();
    if (companyError || !company) {
      return new Response(JSON.stringify({ error: "Target company not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("candidate_profile, first_name, last_name, display_name, linkedin_url")
      .eq("user_id", userId)
      .maybeSingle();

    const candidateName =
      profile?.display_name ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
      "the candidate";

    const evaluationText = company.evaluation
      ? JSON.stringify(company.evaluation).slice(0, 6000)
      : (company.analysis ?? "").slice(0, 6000);

    const prompt = [
      `Write a short LinkedIn outreach message from ${candidateName} to ${contactName}${
        contactTitle ? ` (${contactTitle})` : ""
      } at ${company.company}.`,
      company.role_title ? `Target role: ${company.role_title}.` : "",
      profile?.candidate_profile ? `Candidate profile:\n${profile.candidate_profile.slice(0, 3000)}` : "",
      evaluationText ? `Company research:\n${evaluationText}` : "",
      "",
      "Rules: under 120 words, warm and specific, no flattery clichés, reference one concrete detail about the company, end with a light ask for a short conversation. Return only the message text, no subject line and no commentary.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": lovableApiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const details = await res.text();
      console.error(`draft-outreach AI error [${res.status}]: ${details.slice(0, 500)}`);
      return new Response(
        JSON.stringify({ error: "AI request failed", status: res.status, details: details.slice(0, 800) }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await res.json();
    const message: string = data?.choices?.[0]?.message?.content ?? "";
    if (!message.trim()) {
      return new Response(JSON.stringify({ error: "The model returned an empty message." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: message.trim() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("draft-outreach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
