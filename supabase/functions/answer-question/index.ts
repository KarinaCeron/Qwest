import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const N8N_CHAT_WEBHOOK =
  "https://karinaceron.app.n8n.cloud/webhook/0db1bc13-1b0a-4828-9870-3201d2894542";

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

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: claimsData, error: claimsError } =
      await supabaseClient.auth.getClaims(token);
    const claims = claimsData?.claims;
    if (claimsError || !claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = {
      id: claims.sub,
      email: typeof claims.email === "string" ? claims.email : "",
    };

    const { question, role, company, jobContent } = await req.json();
    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "question required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enrich the question with job context so the RAG can leverage both
    // the candidate's CV (via user_id) and the specific position info.
    const enriched = [
      `You are helping the candidate answer a question in a job application form.`,
      `Use the candidate's CV information (retrieved via RAG for this user) and the job details below to craft a concise, professional, first-person answer.`,
      ``,
      role ? `Position: ${role}` : null,
      company ? `Company: ${company}` : null,
      jobContent ? `Job Description:\n${jobContent}` : null,
      ``,
      `Employer question: ${question}`,
      ``,
      `Answer:`,
    ]
      .filter(Boolean)
      .join("\n");

    const url = new URL(N8N_CHAT_WEBHOOK);
    url.searchParams.set("question", enriched);
    url.searchParams.set("user_id", user.id);
    url.searchParams.set("user_email", user.email || "");

    const webhookResponse = await fetch(url.toString(), { method: "GET" });
    const responseText = await webhookResponse.text();
    console.log("answer-question n8n status:", webhookResponse.status);

    let answer: string;
    try {
      const parsed = JSON.parse(responseText);
      answer =
        parsed.response ||
        parsed.answer ||
        parsed.output ||
        parsed.text ||
        parsed.message ||
        responseText;
    } catch {
      answer = responseText;
    }

    return new Response(JSON.stringify({ answer }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("answer-question error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
