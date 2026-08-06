import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { company, website } = await req.json().catch(() => ({}));
    const companyName = typeof company === "string" && company.trim()
      ? company.trim()
      : "Acme Corp";
    const companyWebsite = typeof website === "string" && website.trim()
      ? website.trim()
      : "https://acme.example.com";

    const plainText = `Company: ${companyName}
Website: ${companyWebsite}
Foundation year: 2015
Founders: Alice Smith, Bob Jones
Investing rounds: Seed 2016, Series A 2018, Series B 2021
Number of employees: 250
CPO: Alice Smith (https://linkedin.com/in/alicesmith)
CTO: Bob Jones (https://linkedin.com/in/bobjones)
Product organization: Product teams are organized into autonomous squads, each owning a specific product line. They follow a dual-track Agile approach with discovery and delivery phases.
Culture: Remote-first, async communication, strong emphasis on ownership and psychological safety. Regular offsites and transparent OKRs.
Employee reviews: Employees praise the flexible schedule and talented colleagues. Some mention fast growth can make processes feel chaotic at times.
Sources:
- ${companyName} homepage: ${companyWebsite}
- ${companyName} LinkedIn: https://linkedin.com/company/acme-example
- Glassdoor reviews: https://glassdoor.com/Overview/Acme-Example-E12345.htm`;

    return new Response(JSON.stringify({ text: plainText }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("research-company-test error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
