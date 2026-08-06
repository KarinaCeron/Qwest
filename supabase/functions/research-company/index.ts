import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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

    const url = new URL(N8N_WEBHOOK_URL);
    url.searchParams.set("company", companyInput);
    if (websiteInput) url.searchParams.set("website", websiteInput);

    const requestPayload = { company: companyInput, website: websiteInput };
    console.log("research-company: sending to n8n:", JSON.stringify(requestPayload));

    let res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload),
    });

    let text = await res.text();
    console.log(`research-company: n8n responded [${res.status}] body length ${text.length}`);

    if (!res.ok && (res.status === 404 || res.status === 405)) {
      console.log("research-company: POST rejected, retrying with GET");
      res = await fetch(url.toString(), { method: "GET" });
      text = await res.text();
      console.log(`research-company: n8n GET responded [${res.status}] body length ${text.length}`);
    }

    if (!res.ok) {
      console.error(`research-company n8n error [${res.status}]: ${text}`);
      return new Response(
        JSON.stringify({ error: "Company research webhook failed", status: res.status, details: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ text }), {
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
