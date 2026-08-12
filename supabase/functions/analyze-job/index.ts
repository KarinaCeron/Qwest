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

    const payload = {
      job_description: jobContent,
      question: jobContent,
      role: role || "",
      company: company || "",
      user_id: user.id,
      user_email: user.email || "",
    };

    // Send as POST with a JSON body (long job descriptions break query-string GETs -> HTTP 431)
    let webhookResponse = await fetch(N8N_ANALYZE_JOB_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Fallback: webhook configured for GET only
    if (webhookResponse.status === 404 || webhookResponse.status === 405) {
      const url = new URL(N8N_ANALYZE_JOB_WEBHOOK);
      for (const [k, v] of Object.entries(payload)) url.searchParams.set(k, String(v).slice(0, 4000));
      webhookResponse = await fetch(url.toString(), { method: "GET" });
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
