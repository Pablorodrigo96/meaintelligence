import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { company_name, cnpj, cnpj_basico, sector, state, city } = await req.json();
    if (!company_name) {
      return new Response(JSON.stringify({ error: "company_name is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sources: string[] = [];
    let dbContact: any = null;
    let brasilApiData: any = null;
    let owners: any[] = [];
    const contact: any = { phones: [], email: null, website: null, address: null, instagram: null, linkedin_company: null };
    let citations: string[] = [];

    // ── CAMADA 1: Banco Nacional (estabelecimentos) ──
    const EXTERNAL_DB_URL = Deno.env.get("EXTERNAL_DB_URL");
    const effectiveCnpjBasico = cnpj_basico || (cnpj ? String(cnpj).replace(/\D/g, "").substring(0, 8) : null);

    if (EXTERNAL_DB_URL && effectiveCnpjBasico) {
      try {
        const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
        const client = new Client(EXTERNAL_DB_URL);
        await client.connect();
        const result = await client.queryObject(`
          SELECT ddd_1, telefone_1, ddd_2, telefone_2, correio_eletronico,
                 tipo_logradouro, logradouro, numero, complemento, bairro, cep
          FROM estabelecimentos
          WHERE cnpj_basico = $1 AND situacao_cadastral = '02'
          ORDER BY identificador_matriz_filial ASC
          LIMIT 1
        `, [effectiveCnpjBasico]);
        await client.end();

        if (result.rows.length > 0) {
          dbContact = result.rows[0] as any;
          sources.push("banco_nacional");

          if (dbContact.ddd_1 && dbContact.telefone_1) {
            contact.phones.push(`(${dbContact.ddd_1}) ${dbContact.telefone_1}`);
          }
          if (dbContact.ddd_2 && dbContact.telefone_2) {
            contact.phones.push(`(${dbContact.ddd_2}) ${dbContact.telefone_2}`);
          }
          if (dbContact.correio_eletronico) {
            contact.email = dbContact.correio_eletronico.toLowerCase();
          }
          const addrParts = [
            dbContact.tipo_logradouro, dbContact.logradouro,
            dbContact.numero ? `, ${dbContact.numero}` : "",
            dbContact.complemento ? ` - ${dbContact.complemento}` : "",
            dbContact.bairro ? ` - ${dbContact.bairro}` : "",
            dbContact.cep ? ` - CEP ${dbContact.cep}` : "",
          ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
          if (addrParts.length > 5) contact.address = addrParts;
        }
      } catch (e) {
        console.error("Layer 1 (DB) error:", e);
      }
    }

    // ── CAMADA 2: BrasilAPI (QSA / sócios) ──
    const fullCnpj = cnpj ? String(cnpj).replace(/\D/g, "") : null;
    if (fullCnpj && fullCnpj.length === 14) {
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${fullCnpj}`);
        if (res.ok) {
          brasilApiData = await res.json();
          sources.push("brasilapi");

          // Extract QSA (owners)
          if (brasilApiData.qsa && Array.isArray(brasilApiData.qsa)) {
            owners = brasilApiData.qsa.map((s: any) => ({
              name: formatName(s.nome_socio || s.nome || ""),
              role: s.qualificacao_socio || s.qual || "Sócio",
              linkedin: null,
              instagram: null,
            }));
          }

          // Complement contact from BrasilAPI
          if (brasilApiData.ddd_telefone_1 && !contact.phones.length) {
            contact.phones.push(brasilApiData.ddd_telefone_1);
          }
          if (brasilApiData.ddd_telefone_2 && contact.phones.length < 2) {
            contact.phones.push(brasilApiData.ddd_telefone_2);
          }
          if (brasilApiData.email && !contact.email) {
            contact.email = brasilApiData.email.toLowerCase();
          }
        }
      } catch (e) {
        console.error("Layer 2 (BrasilAPI) error:", e);
      }
    }

    // ── CAMADA 3: Perplexity (Web Search — LinkedIn, Instagram, Website) ──
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (PERPLEXITY_API_KEY) {
      try {
        const ownerNames = owners.map(o => o.name).filter(n => n.length > 3).slice(0, 5);
        const location = city ? `${city}, ${state}` : state || "Brasil";

        const prompt = `Pesquise sobre a empresa "${company_name}" localizada em ${location}${sector ? `, setor ${sector}` : ""}${fullCnpj ? `, CNPJ ${fullCnpj}` : ""}.

Preciso encontrar:
1. Website oficial da empresa
2. Instagram da empresa
3. LinkedIn da empresa (página da empresa no LinkedIn)
${ownerNames.length > 0 ? `4. Para cada sócio abaixo, encontre o perfil do LinkedIn e Instagram pessoal:
${ownerNames.map((n, i) => `   - ${n}`).join("\n")}` : "4. Nomes dos proprietários/sócios e seus perfis LinkedIn e Instagram"}

Retorne APENAS um JSON válido neste formato exato, sem markdown:
{
  "website": "url ou null",
  "instagram": "@handle ou null",
  "linkedin_company": "url do linkedin da empresa ou null",
  "owners": [
    { "name": "Nome Completo", "linkedin": "url ou null", "instagram": "@handle ou null" }
  ]
}`;

        const perplexityRes = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar-pro",
            messages: [
              { role: "system", content: "Você é um assistente de pesquisa empresarial. Retorne APENAS JSON válido, sem markdown, sem explicação." },
              { role: "user", content: prompt },
            ],
            temperature: 0.1,
            max_tokens: 1500,
          }),
        });

        if (perplexityRes.ok) {
          const perplexityData = await perplexityRes.json();
          const content = perplexityData.choices?.[0]?.message?.content || "";
          citations = perplexityData.citations || [];
          sources.push("perplexity");

          // Parse JSON from response
          try {
            const cleaned = content.trim()
              .replace(/^```(?:json)?\s*\n?/, "")
              .replace(/\n?```\s*$/, "")
              .trim();
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const webData = JSON.parse(jsonMatch[0]);

              if (webData.website) contact.website = webData.website;
              if (webData.instagram) contact.instagram = webData.instagram;
              if (webData.linkedin_company) contact.linkedin_company = webData.linkedin_company;

              // Merge web owner data with BrasilAPI owners
              if (webData.owners && Array.isArray(webData.owners)) {
                if (owners.length === 0) {
                  // No BrasilAPI data — use Perplexity owners
                  owners = webData.owners.map((o: any) => ({
                    name: o.name || "",
                    role: "Sócio",
                    linkedin: o.linkedin || null,
                    instagram: o.instagram || null,
                  }));
                } else {
                  // Merge: match by normalized name
                  for (const webOwner of webData.owners) {
                    const webNorm = (webOwner.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    const match = owners.find(o => {
                      const oNorm = o.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                      return oNorm.includes(webNorm) || webNorm.includes(oNorm) ||
                        oNorm.split(" ").filter((t: string) => t.length > 3).some((t: string) => webNorm.includes(t));
                    });
                    if (match) {
                      if (webOwner.linkedin) match.linkedin = webOwner.linkedin;
                      if (webOwner.instagram) match.instagram = webOwner.instagram;
                    } else {
                      owners.push({
                        name: webOwner.name || "",
                        role: "Sócio (Web)",
                        linkedin: webOwner.linkedin || null,
                        instagram: webOwner.instagram || null,
                      });
                    }
                  }
                }
              }
            }
          } catch (parseErr) {
            console.error("Failed to parse Perplexity response:", content);
          }
        }
      } catch (e) {
        console.error("Layer 3 (Perplexity) error:", e);
      }
    }

    // ── CAMADA 3b: Busca dedicada de LinkedIn por sócio (sonar-pro) ──
    if (PERPLEXITY_API_KEY && owners.length > 0) {
      const ownersToSearch = owners.filter(o => !o.linkedin && o.name.length > 3).slice(0, 5);
      const location = city ? `${city}, ${state}` : state || "Brasil";

      for (const owner of ownersToSearch) {
        try {
          const searchPrompt = `Encontre o perfil do LinkedIn de "${owner.name}", que é ${owner.role} da empresa "${company_name}" em ${location}.
Busque por "${owner.name} ${company_name} LinkedIn".
Retorne APENAS um JSON válido: {"linkedin": "url do perfil ou null", "instagram": "@handle ou null"}`;

          const ownerRes = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "sonar-pro",
              messages: [
                { role: "system", content: "Você é um assistente de pesquisa. Retorne APENAS JSON válido, sem markdown." },
                { role: "user", content: searchPrompt },
              ],
              temperature: 0.1,
              max_tokens: 300,
            }),
          });

          if (ownerRes.ok) {
            const ownerData = await ownerRes.json();
            const ownerContent = ownerData.choices?.[0]?.message?.content || "";
            try {
              const cleaned = ownerContent.trim().replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
              const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.linkedin && parsed.linkedin.includes("linkedin.com/in/")) {
                  owner.linkedin = parsed.linkedin;
                }
                if (parsed.instagram) {
                  owner.instagram = parsed.instagram;
                }
              }
            } catch (_) { /* ignore parse error */ }
          }
        } catch (e) {
          console.error(`LinkedIn search error for ${owner.name}:`, e);
        }
      }
    }

    // ── Fallback: gerar URL de busca LinkedIn para sócios sem perfil ──
    for (const owner of owners) {
      if (!owner.linkedin) {
        owner.linkedin = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(owner.name + " " + company_name)}`;
        owner.linkedin_is_search = true;
      }
    }

    console.log(`company-enrich: ${company_name} — sources: ${sources.join(", ")} — ${owners.length} owners`);

    return new Response(JSON.stringify({
      owners,
      contact,
      sources,
      citations,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("company-enrich error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error",
      owners: [],
      contact: {},
      sources: [],
      citations: [],
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function formatName(name: string): string {
  return name
    .toLowerCase()
    .split(" ")
    .map(word => word.length <= 2 ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
