const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// TODO: Replace with your n8n webhook URL for offer discussion
const N8N_DISCUSS_OFFER_WEBHOOK =
  "https://karinaceron.app.n8n.cloud/webhook/PLACEHOLDER-DISCUSS-OFFER";

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

    const { topic, role, company, jobContent, salary, requestedSalary, salaryCurrency, salaryPeriod } = await req.json();
    if (!topic || typeof topic !== "ver"string") {
      return new Response(JSON.stringify({ error: "topic required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enriched = [
      `You are helping the candidate discuss or negotiate a job offer.`,
      `Use the candidate's CV information (retrieved via RAG for this user) and the job details below to craft a concise, professional, first-person response.`,
      ``,
      role ? `Position: ${role}` : null,
      company ? `Company: ${company}` : null,
      jobContent ? `Job Description:\n${jobContent}` : null,
      salary ? `Offered salary: ${salary} ${salaryCurrency || "USD"} (${salaryPeriod || "annual"})` : null,
      requestedSalary ? `Requested salary: ${requestedSalary} ${salaryCurrency || "USD"} (${salaryPeriod || "annual"})` : null,
      ``,
      `Topic to discuss: ${topic}`,
      ``,
      `Response:`,
    ]
      .filter(Boolean)
      .join("\n");

    const url = new URL(N8N_DISCUSS_OFFER_WEBHOOK);
    url.searchParams.set("question", enriched);
    url.searchParams.set("user_id", user.id);
    url.searchParams.set("user_email", user.email || "");

    console.log("Calling n8n discuss-offer webhook for user:", user.id);

    const webhookResponse = await fetch(url.toString(), { method: "GET" });
    const responseText = await webhookResponse.text();
    console.log("n8n discuss-offer response status:", webhookResponse.status);

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
    console.error("discuss-offer error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
