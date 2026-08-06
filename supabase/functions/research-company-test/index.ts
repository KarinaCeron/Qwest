const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company, website } = await req.json().catch(() => ({}));
    const companyName = typeof company === "string" && company.trim()
      ? company.trim()
      : "Acme Corp";
    const companyWebsite = typeof website === "string" && website.trim()
      ? website.trim()
      : "https://acme.example.com";

    const mockResearch = {
      website: companyWebsite,
      foundation_year: "2015",
      founders: ["Alice Smith", "Bob Jones"],
      investing_rounds: ["Seed 2016", "Series A 2018", "Series B 2021"],
      number_of_employees: "250",
      cpo_name: "Alice Smith",
      cpo_linkedin: "https://linkedin.com/in/alicesmith",
      cto_name: "Bob Jones",
      cto_linkedin: "https://linkedin.com/in/bobjones",
      product_organization:
        "Product teams are organized into autonomous squads, each owning a specific product line. They follow a dual-track Agile approach with discovery and delivery phases.",
      culture:
        "Remote-first, async communication, strong emphasis on ownership and psychological safety. Regular offsites and transparent OKRs.",
      employee_reviews:
        "Employees praise the flexible schedule and talented colleagues. Some mention fast growth can make processes feel chaotic at times.",
    };

    const mockSources = [
      { title: `${companyName} homepage`, uri: companyWebsite },
      { title: `${companyName} LinkedIn`, uri: "https://linkedin.com/company/acme-example" },
      { title: "Glassdoor reviews", uri: "https://glassdoor.com/Overview/Acme-Example-E12345.htm" },
    ];

    // Return the exact shape n8n should produce.
    return new Response(
      JSON.stringify({
        research: mockResearch,
        sources: mockSources,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("research-company-test error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
