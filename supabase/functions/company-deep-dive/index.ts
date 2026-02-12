import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// CNAE to sector mapping
function cnaeSector(cnae: number): string {
  if (cnae >= 100 && cnae <= 399) return "Agronegócio";
  if (cnae >= 500 && cnae <= 999) return "Indústria";
  if (cnae >= 1000 && cnae <= 3399) return "Indústria";
  if (cnae >= 3500 && cnae <= 3999) return "Energia";
  if (cnae >= 4100 && cnae <= 4399) return "Construção";
  if (cnae >= 4500 && cnae <= 4799) return "Comércio";
  if (cnae >= 4900 && cnae <= 5399) return "Logística";
  if (cnae >= 5500 && cnae <= 5699) return "Serviços";
  if (cnae >= 5800 && cnae <= 6399) return "Tecnologia";
  if (cnae >= 6400 && cnae <= 6699) return "Finanças";
  if (cnae >= 6800 && cnae <= 6899) return "Imobiliário";
  if (cnae >= 8500 && cnae <= 8599) return "Educação";
  if (cnae >= 8600 && cnae <= 8699) return "Saúde";
  return "Serviços";
}

// Sector benchmarks (annual revenue in BRL)
const SECTOR_BENCHMARKS: Record<string, number> = {
  "Tecnologia": 5_000_000,
  "Comércio": 1_500_000,
  "Serviços": 1_000_000,
  "Indústria": 3_000_000,
  "Saúde": 2_000_000,
  "Agronegócio": 4_000_000,
  "Finanças": 3_500_000,
  "Energia": 4_500_000,
  "Logística": 2_500_000,
  "Educação": 1_200_000,
  "Imobiliário": 2_000_000,
  "Construção": 2_500_000,
};

// Revenue per employee by sector
const REV_PER_EMPLOYEE: Record<string, number> = {
  "Tecnologia": 500_000,
  "Comércio": 200_000,
  "Serviços": 150_000,
  "Indústria": 250_000,
  "Saúde": 180_000,
  "Agronegócio": 300_000,
  "Finanças": 400_000,
  "Energia": 350_000,
  "Logística": 200_000,
  "Educação": 120_000,
  "Imobiliário": 250_000,
  "Construção": 220_000,
};

// Tax regime adjustment based on company size/porte
function regimeAdjust(porte: string): { factor: number; label: string; limit: number } {
  const p = (porte || "").toUpperCase();
  if (p.includes("MEI") || p === "01") return { factor: 0.8, label: "Simples Nacional (MEI)", limit: 81_000 };
  if (p.includes("ME") || p === "03") return { factor: 0.8, label: "Simples Nacional (ME)", limit: 4_800_000 };
  if (p.includes("EPP") || p === "05") return { factor: 1.0, label: "Lucro Presumido (EPP)", limit: 78_000_000 };
  return { factor: 1.2, label: "Lucro Real (Demais)", limit: 300_000_000 };
}

// Location adjustment
function locationAdjust(uf: string): { factor: number; label: string } {
  const high = ["SP", "RJ", "DF"];
  const mid = ["MG", "PR", "RS", "SC", "BA"];
  if (high.includes(uf)) return { factor: 1.1, label: "Grande centro (1.1x)" };
  if (mid.includes(uf)) return { factor: 1.0, label: "Centro regional (1.0x)" };
  return { factor: 0.9, label: "Demais regiões (0.9x)" };
}

// Situação cadastral labels
function situacaoLabel(code: number): { label: string; active: boolean } {
  const map: Record<number, string> = { 1: "Nula", 2: "Ativa", 3: "Suspensa", 4: "Inapta", 8: "Baixada" };
  return { label: map[code] || "Desconhecida", active: code === 2 };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { companies } = await req.json();
    if (!Array.isArray(companies) || companies.length === 0) {
      throw new Error("companies array is required");
    }

    const results = [];

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      const cnpj = (company.cnpj || "").replace(/\D/g, "");

      if (!cnpj || cnpj.length !== 14) {
        results.push({
          company_id: company.id,
          company_name: company.name,
          has_cnpj: false,
          error: null,
          public_data: null,
          revenue_estimate: null,
        });
        continue;
      }

      // Rate limit: wait 400ms between calls
      if (i > 0) await delay(400);

      try {
        const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
        if (!resp.ok) {
          results.push({
            company_id: company.id,
            company_name: company.name,
            has_cnpj: true,
            cnpj_formatted: cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"),
            error: `BrasilAPI retornou status ${resp.status}`,
            public_data: null,
            revenue_estimate: null,
          });
          continue;
        }

        const data = await resp.json();
        const sector = cnaeSector(data.cnae_fiscal || 0);
        const benchmark = SECTOR_BENCHMARKS[sector] || 1_500_000;
        const regime = regimeAdjust(data.porte || "");
        const loc = locationAdjust(data.uf || "");
        const sit = situacaoLabel(data.situacao_cadastral || 0);

        const capitalSocial = data.capital_social || 0;
        const capitalRatio = regime.limit > 0 ? Math.min(capitalSocial / regime.limit, 3) : 1;

        const estimatedRevenue = Math.round(benchmark * regime.factor * capitalRatio * loc.factor);

        // Confidence score (0-100)
        let confidence = 40; // base
        if (capitalSocial > 0) confidence += 20;
        if (sit.active) confidence += 15;
        if (data.cnae_fiscal) confidence += 15;
        if (data.uf) confidence += 10;
        confidence = Math.min(confidence, 100);

        // Years active
        let yearsActive = null;
        if (data.data_inicio_atividade) {
          const start = new Date(data.data_inicio_atividade);
          yearsActive = Math.floor((Date.now() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        }

        results.push({
          company_id: company.id,
          company_name: company.name,
          has_cnpj: true,
          cnpj_formatted: cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"),
          error: null,
          public_data: {
            razao_social: data.razao_social,
            nome_fantasia: data.nome_fantasia,
            capital_social: capitalSocial,
            porte: data.porte,
            natureza_juridica: data.natureza_juridica,
            cnae_fiscal: data.cnae_fiscal,
            cnae_descricao: data.cnae_fiscal_descricao,
            sector_mapped: sector,
            municipio: data.municipio,
            uf: data.uf,
            situacao_cadastral: sit.label,
            situacao_ativa: sit.active,
            data_abertura: data.data_inicio_atividade,
            years_active: yearsActive,
            qsa: (data.qsa || []).map((s: any) => ({
              nome: s.nome_socio,
              qualificacao: s.qualificacao_socio,
            })),
          },
          revenue_estimate: {
            estimated_revenue_brl: estimatedRevenue,
            benchmark_sector: benchmark,
            sector: sector,
            regime: regime.label,
            regime_factor: regime.factor,
            capital_ratio: Math.round(capitalRatio * 1000) / 1000,
            location_factor: loc.factor,
            location_label: loc.label,
            confidence_score: confidence,
            formula: `${benchmark.toLocaleString("pt-BR")} × ${regime.factor} × ${(Math.round(capitalRatio * 1000) / 1000)} × ${loc.factor} = R$ ${estimatedRevenue.toLocaleString("pt-BR")}`,
          },
        });
      } catch (fetchErr) {
        results.push({
          company_id: company.id,
          company_name: company.name,
          has_cnpj: true,
          cnpj_formatted: cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"),
          error: `Erro ao consultar BrasilAPI: ${fetchErr instanceof Error ? fetchErr.message : "unknown"}`,
          public_data: null,
          revenue_estimate: null,
        });
      }
    }

    // Generate AI consolidated analysis
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiAnalysis = null;

    if (LOVABLE_API_KEY) {
      const companiesWithData = results.filter((r) => r.public_data);
      if (companiesWithData.length > 0) {
        try {
          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content: "Você é um analista de M&A especialista no mercado brasileiro. Analise os dados públicos das empresas e gere uma análise consolidada em português, destacando: empresas mais promissoras, riscos identificados, e recomendações estratégicas. Seja conciso e objetivo.",
                },
                {
                  role: "user",
                  content: `Dados públicos das top empresas do matching:\n${JSON.stringify(companiesWithData, null, 2)}\n\nGere uma análise consolidada em 3-5 parágrafos cobrindo: visão geral do grupo, destaques positivos, riscos e alertas, e recomendação final.`,
                },
              ],
            }),
          });

          if (aiResp.ok) {
            const aiData = await aiResp.json();
            aiAnalysis = aiData.choices?.[0]?.message?.content || null;
          }
        } catch {
          // AI analysis is optional, proceed without it
        }
      }
    }

    return new Response(JSON.stringify({ results, ai_analysis: aiAnalysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("company-deep-dive error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
