const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const N8N_WEBHOOK_URL =
  "https://karinaceron.app.n8n.cloud/webhook/dd564ef4-d017-43cb-bac2-e6c9efc57ac0";

const FIELDS = [
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
] as const;

const ARRAY_FIELDS = new Set(["founders", "investing_rounds"]);

function extractJson(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeResearch(raw: unknown, website: string) {
  let source: Record<string, unknown> | null = null;

  if (Array.isArray(raw)) raw = raw[0];
  if (typeof raw === "string") raw = extractJson(raw);

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    // n8n often wraps payloads in json / data / output / research
    for (const key of ["research", "output", "data", "json", "result"]) {
      const inner = obj[key];
      if (inner && (typeof inner === "object" || typeof inner === "string")) {
        const nested = normalizeResearch(inner, website);
        if (nested) return nested;
      }
    }
    source = obj;
  }

  if (!source) return null;

  const research: Record<string, unknown> = {};
  for (const field of FIELDS) {
    const value = source[field];
    if (ARRAY_FIELDS.has(field)) {
      research[field] = Array.isArray(value)
        ? value.map((v) => String(v))
        : typeof value === "string" && value.trim()
        ? [value.trim()]
        : [];
    } else {
      research[field] =
        typeof value === "string" && value.trim()
          ? value.trim()
          : value == null
          ? field === "website"
            ? website || "Unknown"
            : "Unknown"
          : String(value);
    }
  }
  return research;
}

function normalizeSources(raw: unknown): { title: string; uri: string }[] {
  let list: unknown = raw;
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (first && typeof first === "object" && "sources" in (first as object)) {
      list = (first as Record<string, unknown>).sources;
    }
  } else if (raw && typeof raw === "object") {
    list = (raw as Record<string, unknown>).sources;
  }
  if (!Array.isArray(list)) return [];
  return list
    .map((s) => {
      if (typeof s === "string") return { title: s, uri: s };
      const o = (s ?? {}) as Record<string, unknown>;
      return {
        title: String(o.title ?? o.name ?? o.uri ?? o.url ?? ""),
        uri: String(o.uri ?? o.url ?? ""),
      };
    })
    .filter((s) => !!s.uri)
    .slice(0, 8);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    // POST with body first; if the n8n node is GET-only, retry as GET with query params.
    let res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload),
    });

    let text = await res.text();

    if (!res.ok && (res.status === 404 || res.status === 405)) {
      console.log("research-company: POST rejected, retrying with GET");
      res = await fetch(url.toString(), { method: "GET" });
      text = await res.text();
    }

    if (!res.ok) {
      console.error(`research-company n8n error [${res.status}]: ${text}`);
      return new Response(
        JSON.stringify({ error: "Company research webhook failed", status: res.status, details: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let responsePayload: unknown;
    try {
      responsePayload = JSON.parse(text);
    } catch {
      responsePayload = extractJson(text);
    }

    const research = normalizeResearch(responsePayload, websiteInput);
    const sources = normalizeSources(responsePayload);

    if (!research) {
      console.error("research-company: unexpected webhook payload:", text.slice(0, 800));
      return new Response(
        JSON.stringify({ error: "The research webhook returned no usable data" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
