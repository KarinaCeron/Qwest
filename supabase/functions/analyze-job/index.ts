const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const N8N_ANALYZE_JOB_WEBHOOK =
  "https://karinaceron.app.n8n.cloud/webhook/c7df7503-8a6a-451c-b97b-545ecab3bb62";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { jobContent, role, company } = await req.json();
    if (!jobContent || typeof jobContent !== "string") {
      return new Response(JSON.stringify({ error: "jobContent required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load the user's core skills (name -> explanation) to send along with the job description.
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("skills, skill_meanings")
      .eq("user_id", user.id)
      .maybeSingle();

    const skillList: string[] = Array.isArray((profile as any)?.skills)
      ? ((profile as any).skills as unknown[]).map((s) => String(s ?? "").trim()).filter(Boolean)
      : [];
    const meanings = ((profile as any)?.skill_meanings ?? {}) as Record<string, string>;
    const coreSkills: Record<string, string> = {};
    for (const skill of skillList) {
      coreSkills[skill] = (meanings?.[skill] ?? "").trim();
    }
    const coreSkillsJson = JSON.stringify(coreSkills);

    // The n8n webhook is registered for GET only, and long job descriptions in the
    // query string make the request exceed n8n's header limit (HTTP 431).
    // -> truncate the description to a safe size for the URL.
    const MAX_DESC = 1800;
    const desc = jobContent.slice(0, MAX_DESC);

    const url = new URL(N8N_ANALYZE_JOB_WEBHOOK);
    url.searchParams.set("job_description", desc);
    url.searchParams.set("question", desc);
    url.searchParams.set("role", (role || "").slice(0, 200));
    url.searchParams.set("company", (company || "").slice(0, 200));
    url.searchParams.set("core_skills", coreSkillsJson.slice(0, 4000));
    url.searchParams.set("user_id", user.id);
    url.searchParams.set("user_email", user.email || "");

    let webhookResponse = await fetch(url.toString(), { method: "GET" });

    // Fallback: if the URL is still too large, retry with a POST body
    if (webhookResponse.status === 431 || webhookResponse.status === 414) {
      webhookResponse = await fetch(N8N_ANALYZE_JOB_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_description: jobContent,
          question: jobContent,
          role: role || "",
          company: company || "",
          core_skills: coreSkills,
          user_id: user.id,
          user_email: user.email || "",
        }),
      });
    }


    const responseText = await webhookResponse.text();
    console.log("analyze-job n8n status:", webhookResponse.status, "length:", responseText.length);

    let answer: string;
    try {
      const parsed = JSON.parse(responseText);
      answer =
        parsed.response || parsed.answer || parsed.output || parsed.text || parsed.message ||
        (typeof parsed === "string" ? parsed : responseText);
    } catch {
      answer = responseText;
    }

    return new Response(JSON.stringify({ answer }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-job error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
