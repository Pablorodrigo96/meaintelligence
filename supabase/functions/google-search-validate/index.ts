import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GOOGLE_CSE_API_KEY = Deno.env.get("GOOGLE_CSE_API_KEY");
    const GOOGLE_CSE_CX = Deno.env.get("GOOGLE_CSE_CX");
    console.log(`DEBUG: CX value = "${GOOGLE_CSE_CX}", length = ${GOOGLE_CSE_CX?.length}`);

    if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_CX) {
      return new Response(
        JSON.stringify({ error: "Google CSE not configured", companies: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { sector, state, city } = await req.json();
    const location = city ? `${city}, ${state}` : state || "Brasil";
    const query = `empresas de ${sector || "serviços"} em ${location}`;

    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", GOOGLE_CSE_API_KEY);
    url.searchParams.set("cx", GOOGLE_CSE_CX);
    url.searchParams.set("q", query);
    url.searchParams.set("num", "10");
    url.searchParams.set("gl", "br");
    url.searchParams.set("lr", "lang_pt");

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errText = await response.text();
      console.error("Google CSE API error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: `Google CSE error: ${response.status}`, companies: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const items = data.items || [];

    // Extract company names from titles and snippets
    const extractedNames = new Set<string>();
    for (const item of items) {
      const title = item.title || "";
      // Split title by common separators to get potential company names
      const titleParts = title.split(/\s*[\|–—\-:]\s*/);
      for (const part of titleParts) {
        const cleaned = part.trim();
        if (cleaned.length > 3 && cleaned.length < 80 && !isGenericPhrase(cleaned)) {
          extractedNames.add(cleaned);
        }
      }
    }

    const companies = Array.from(extractedNames).map((name, index) => ({
      original: name,
      normalized: normalizeName(name),
      rank: index + 1,
    }));

    console.log(`google-search-validate: found ${companies.length} names for "${query}"`);

    return new Response(
      JSON.stringify({ companies, query }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("google-search-validate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", companies: [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function isGenericPhrase(text: string): boolean {
  const generic = [
    "melhores empresas", "top empresas", "lista de", "ranking", "como escolher",
    "guia completo", "dicas", "comparação", "avaliação", "review",
    "wikipedia", "linkedin", "facebook", "instagram", "youtube",
  ];
  const lower = text.toLowerCase();
  return generic.some(g => lower.includes(g));
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(ltda|eireli|s\.?a\.?|me|epp|ss|s\/s|s\/a|grupo|cia|companhia)\b/gi, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
