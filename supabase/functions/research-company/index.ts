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
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!geminiKey && !lovableKey) {
      return new Response(JSON.stringify({ error: "AI is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company, website } = await req.json();
    const websiteInput =
      typeof website === "string" && /^https?:\/\/\S+$/i.test(website.trim())
        ? website.trim().slice(0, 300)
        : "";
    if (!company || typeof company !== "string" || company.trim().length < 2) {
      return new Response(JSON.stringify({ error: "company required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const instructions =
      'You are a company research assistant for job seekers. Return ONLY a JSON object matching the requested shape. If a field is unknown, use the string "Unknown" (or an empty array). Never invent LinkedIn URLs — use "Unknown" if unsure.';
    const userPrompt = [
      `Research the company: ${company.trim().slice(0, 120)}`,
      websiteInput ? `Official website: ${websiteInput}` : null,
      websiteInput
        ? `Use this website to make sure you research the right company, and return it as the website field.`
        : null,
      ``,
      `Return JSON with exactly these keys: ${SCHEMA.required.join(", ")}.`,
      `founders and investing_rounds are arrays of strings; every other field is a string.`,
    ]
      .filter(Boolean)
      .join("\n");

    let content = "";
    let sources: { title: string; uri: string }[] = [];

    if (geminiKey) {
      // Your own Gemini API key — uses Google Search grounding for live data.
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": geminiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: instructions }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            tools: [{ google_search: {} }],
          }),
        },
      );

      if (!res.ok) {
        const body = await res.text();
        console.error(`research-company gemini error [${res.status}]: ${body}`);
        return new Response(
          JSON.stringify({ error: "Gemini request failed", status: res.status, details: body }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const data = await res.json();
      content =
        data?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text ?? "")
          .join("") ?? "";
      const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      sources = chunks
        .map((c: { web?: { title?: string; uri?: string } }) => ({
          title: c.web?.title ?? "",
          uri: c.web?.uri ?? "",
        }))
        .filter((s: { uri: string }) => !!s.uri)
        .slice(0, 8);
    } else {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": lovableKey!,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          messages: [
            { role: "system", content: instructions },
            { role: "user", content: userPrompt },
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
      content = data?.choices?.[0]?.message?.content ?? "";
    }

    let research: unknown = null;
    const jsonText = content.replace(/^```(?:json)?/i, "").replace(/```\s*$/, "").trim();
    const start = jsonText.indexOf("{");
    const end = jsonText.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        research = JSON.parse(jsonText.slice(start, end + 1));
      } catch {
        research = null;
      }
    }

    return new Response(JSON.stringify({ research, sources }), {
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
