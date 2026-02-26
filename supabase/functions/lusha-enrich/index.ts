import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LUSHA_API_KEY = Deno.env.get("LUSHA_API_KEY");
    if (!LUSHA_API_KEY) {
      return new Response(JSON.stringify({ error: "LUSHA_API_KEY not configured", contacts: [] }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company_name, decision_makers } = await req.json();
    if (!decision_makers || !Array.isArray(decision_makers) || decision_makers.length === 0) {
      return new Response(JSON.stringify({ error: "decision_makers array is required", contacts: [] }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contacts: any[] = [];

    for (let i = 0; i < decision_makers.length; i++) {
      const dm = decision_makers[i];
      const firstName = dm.first_name || "";
      const lastName = dm.last_name || "";
      const companyName = dm.company_name || company_name || "";

      if (!firstName && !lastName) {
        contacts.push({ ...dm, lusha_found: false, error: "Missing name" });
        continue;
      }

      try {
        const params = new URLSearchParams();
        params.set("firstName", firstName);
        params.set("lastName", lastName);
        params.set("companyName", companyName);
        if (dm.linkedin_url) {
          params.set("linkedinUrl", dm.linkedin_url);
        }

        console.log(`lusha-enrich: Searching for ${firstName} ${lastName} at ${companyName}`);

        const res = await fetch(`https://api.lusha.com/v2/person?${params.toString()}`, {
          method: "GET",
          headers: { "api_key": LUSHA_API_KEY },
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`Lusha error for ${firstName} ${lastName}: ${res.status} ${errText}`);
          contacts.push({
            name: `${firstName} ${lastName}`.trim(),
            title: dm.title || null,
            linkedin_url: dm.linkedin_url || null,
            lusha_found: false,
            error: `HTTP ${res.status}`,
          });
        } else {
          const data = await res.json();
          console.log(`lusha-enrich: Found data for ${firstName} ${lastName}:`, JSON.stringify(data).substring(0, 200));

          contacts.push({
            name: `${firstName} ${lastName}`.trim(),
            title: dm.title || null,
            linkedin_url: dm.linkedin_url || data.socialNetworks?.linkedin?.url || null,
            lusha_found: true,
            phone_numbers: (data.phoneNumbers || []).map((p: any) => ({
              number: p.internationalNumber || p.localNumber || p.number,
              type: p.type || "unknown",
            })),
            email_addresses: (data.emailAddresses || []).map((e: any) => ({
              email: e.email,
              type: e.type || "unknown",
            })),
            company_info: data.company ? {
              name: data.company.name,
              domain: data.company.domain,
            } : null,
          });
        }
      } catch (e) {
        console.error(`Lusha enrichment error for ${firstName} ${lastName}:`, e);
        contacts.push({
          name: `${firstName} ${lastName}`.trim(),
          title: dm.title || null,
          linkedin_url: dm.linkedin_url || null,
          lusha_found: false,
          error: e instanceof Error ? e.message : "Unknown error",
        });
      }

      // Rate limit: 300ms between calls
      if (i < decision_makers.length - 1) {
        await delay(300);
      }
    }

    const foundCount = contacts.filter(c => c.lusha_found).length;
    console.log(`lusha-enrich: ${foundCount}/${decision_makers.length} contacts enriched`);

    return new Response(JSON.stringify({ contacts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lusha-enrich error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", contacts: [] }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
