import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) {
      return new Response(
        JSON.stringify({ error: "PERPLEXITY_API_KEY not configured", companies: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { sector, state, city } = await req.json();

    if (!sector && !state) {
      return new Response(
        JSON.stringify({ error: "sector or state is required", companies: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const location = city ? `${city}, ${state}` : state || "Brasil";
    const prompt = `Liste as 20 principais empresas de ${sector || "serviços"} em ${location}, Brasil. Para cada empresa, informe apenas o nome fantasia (nome comercial). Retorne APENAS um JSON array de strings com os nomes, sem explicações. Exemplo: ["Empresa A", "Empresa B"]`;

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: "Você é um assistente que retorna dados estruturados em JSON. Retorne APENAS o JSON array solicitado, sem markdown, sem explicação." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Perplexity API error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: `Perplexity API error: ${response.status}`, companies: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const citations = data.citations || [];

    // Extract JSON array from response (may be wrapped in markdown code blocks)
    let companyNames: string[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        companyNames = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse Perplexity response:", content);
      // Fallback: try to extract names line by line
      companyNames = content
        .split("\n")
        .map((line: string) => line.replace(/^[\d\-\.\*]+\s*/, "").trim())
        .filter((line: string) => line.length > 2 && line.length < 100);
    }

    // Normalize names: lowercase, remove common suffixes
    const normalized = companyNames.map((name: string, index: number) => ({
      original: name,
      normalized: normalizeName(name),
      rank: index + 1,
    }));

    console.log(`perplexity-validate: found ${normalized.length} companies for ${sector} in ${location}`);

    return new Response(
      JSON.stringify({ companies: normalized, citations, query: prompt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("perplexity-validate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", companies: [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/\b(ltda|eireli|s\.?a\.?|me|epp|ss|s\/s|s\/a|grupo|cia|companhia)\b/gi, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
