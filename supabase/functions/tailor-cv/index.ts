const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const N8N_TAILOR_CV_WEBHOOK =
  "https://karinaceron.app.n8n.cloud/webhook/8622d2e0-1f64-4700-a6f2-6e24b89f80a1";

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
    if (!jobContent) {
      return new Response(JSON.stringify({ error: "jobContent required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(N8N_TAILOR_CV_WEBHOOK);
    url.searchParams.set("question", jobContent);
    url.searchParams.set("role", role || "");
    url.searchParams.set("company", company || "");
    url.searchParams.set("user_id", user.id);
    url.searchParams.set("user_email", user.email || "");

    console.log("Calling n8n tailor-cv webhook for user:", user.id);

    const webhookResponse = await fetch(url.toString(), { method: "GET" });
    const responseText = await webhookResponse.text();
    console.log("n8n tailor-cv response status:", webhookResponse.status);

    let answer: string;
    try {
      const parsed = JSON.parse(responseText);
      answer = parsed.response || parsed.answer || parsed.output || parsed.text || parsed.message || responseText;
    } catch {
      answer = responseText;
    }

    return new Response(
      JSON.stringify({ answer }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("tailor-cv error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
