const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    website: { type: "string" },
    foundation_year: { type: "string" },
    founders: { type: "array", items: { type: "string" } },
    investing_rounds: { type: "array", items: { type: "string" } },
    number_of_employees: { type: "string" },
    cpo_name: { type: "string" },
    cpo_linkedin: { type: "string" },
    cto_name: { type: "string" },
    cto_linkedin: { type: "string" },
    product_organization: { type: "string" },
    culture: { type: "string" },
    employee_reviews: { type: "string" },
  },
  required: [
    "website",
    "foundation_year",
    "founders",
    "investing_rounds",
    "number_of_employees",
    "cpo_name",
    "cpo_linkedin",
    "cto_name",
    "cto_linkedin",
    "product_organization",
    "culture",
    "employee_reviews",
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company } = await req.json();
    if (!company || typeof company !== "string" || company.trim().length < 2) {
      return new Response(JSON.stringify({ error: "company required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a company research assistant for job seekers. Return factual company data in JSON. If a field is unknown, return the string \"Unknown\" (or an empty array). Never invent LinkedIn URLs — leave \"Unknown\" if unsure.",
          },
          { role: "user", content: `Research the company: ${company.trim()}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "company_research", strict: true, schema: SCHEMA },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`research-company gateway error [${res.status}]: ${body}`);
      return new Response(
        JSON.stringify({ error: "AI request failed", status: res.status, details: body }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let research: unknown;
    try {
      research = JSON.parse(content);
    } catch {
      research = null;
    }

    return new Response(JSON.stringify({ research }), {
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
