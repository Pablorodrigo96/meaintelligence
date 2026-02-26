import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SECTOR_MULTIPLIERS: Record<string, number> = {
  "information technology and services": 500_000,
  "computer software": 500_000,
  "internet": 500_000,
  "computer & network security": 500_000,
  "computer networking": 500_000,
  "telecommunications": 500_000,
  "semiconductors": 500_000,
  "manufacturing": 400_000,
  "industrial automation": 400_000,
  "machinery": 400_000,
  "automotive": 400_000,
  "chemicals": 400_000,
  "mining & metals": 400_000,
  "oil & energy": 400_000,
  "construction": 400_000,
  "retail": 180_000,
  "consumer services": 180_000,
  "hospitality": 180_000,
  "food & beverages": 180_000,
  "restaurants": 180_000,
  "apparel & fashion": 180_000,
  "supermarkets": 180_000,
};
const DEFAULT_MULTIPLIER = 200_000;

function getMultiplier(industry: string | null): number {
  if (!industry) return DEFAULT_MULTIPLIER;
  const key = industry.toLowerCase().trim();
  return SECTOR_MULTIPLIERS[key] || DEFAULT_MULTIPLIER;
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const APOLLO_API_KEY = Deno.env.get("APOLLO_API_KEY");
    if (!APOLLO_API_KEY) {
      return new Response(JSON.stringify({ error: "APOLLO_API_KEY not configured", enriched: [] }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { companies } = await req.json();
    if (!companies || !Array.isArray(companies) || companies.length === 0) {
      return new Response(JSON.stringify({ error: "companies array is required", enriched: [] }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enriched: any[] = [];
    const BATCH_SIZE = 10;

    for (let i = 0; i < companies.length; i += BATCH_SIZE) {
      const batch = companies.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(batch.map(async (company: any) => {
        try {
          const searchBody: any = {
            person_seniorities: ["owner", "founder", "c_suite", "director"],
            per_page: 5,
          };

          if (company.email_domain) {
            searchBody.q_organization_domains = company.email_domain;
          } else {
            searchBody.q_organization_name = company.name;
            if (company.state) {
              searchBody.organization_locations = [`${company.state}, Brazil`];
            }
          }

          const res = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Api-Key": APOLLO_API_KEY,
            },
            body: JSON.stringify(searchBody),
          });

          if (!res.ok) {
            const errText = await res.text();
            console.error(`Apollo error for ${company.name}: ${res.status} ${errText}`);
            return { name: company.name, revenue_apollo: null, employee_count: null, apollo_industry: null, decision_makers: [] };
          }

          const data = await res.json();
          const people = data.people || [];

          // Extract org from first person with org data
          let org: any = null;
          for (const person of people) {
            if (person.organization?.estimated_num_employees) {
              org = person.organization;
              break;
            }
          }

          const decision_makers = people.slice(0, 5).map((p: any) => ({
            name: p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
            title: p.title || null,
            linkedin_url: p.linkedin_url || null,
          })).filter((d: any) => d.name);

          if (org?.estimated_num_employees) {
            const multiplier = getMultiplier(org.industry);
            return {
              name: company.name,
              revenue_apollo: org.estimated_num_employees * multiplier,
              employee_count: org.estimated_num_employees,
              apollo_industry: org.industry || null,
              website: org.website_url || null,
              linkedin_url: org.linkedin_url || null,
              decision_makers,
            };
          }

          return { name: company.name, revenue_apollo: null, employee_count: null, apollo_industry: null, decision_makers };
        } catch (e) {
          console.error(`Apollo enrichment error for ${company.name}:`, e);
          return { name: company.name, revenue_apollo: null, employee_count: null, apollo_industry: null, decision_makers: [] };
        }
      }));

      enriched.push(...batchResults);

      // Rate limit delay between batches
      if (i + BATCH_SIZE < companies.length) {
        await delay(500);
      }
    }

    const enrichedCount = enriched.filter(e => e.revenue_apollo !== null).length;
    console.log(`apollo-enrich: ${enrichedCount}/${companies.length} companies enriched`);

    return new Response(JSON.stringify({ enriched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("apollo-enrich error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", enriched: [] }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
