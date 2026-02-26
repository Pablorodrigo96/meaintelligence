import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "match": {
        const investorProfile = data.investor_profile || "Moderado";
        const riskLevel = data.criteria?.risk_level || "";
        const notes = data.criteria?.notes || "";
        const criteria = data.criteria || {};

        // ── LAYER 2: Deterministic pre-score with sector adjacency ──
        // Matriz de adjacência: setores complementares recebem pontuação parcial em vez de zero
        const SECTOR_ADJACENCY: Record<string, string[]> = {
          "Finance": ["Technology", "Real Estate", "Other"],
          "Technology": ["Finance", "Telecom", "Education"],
          "Healthcare": ["Technology", "Education", "Other"],
          "Manufacturing": ["Logistics", "Energy", "Retail"],
          "Retail": ["Logistics", "Manufacturing", "Other"],
          "Logistics": ["Manufacturing", "Retail", "Agribusiness"],
          "Real Estate": ["Finance", "Construction", "Other"],
          "Agribusiness": ["Logistics", "Manufacturing", "Energy"],
          "Education": ["Technology", "Healthcare", "Other"],
          "Energy": ["Manufacturing", "Agribusiness", "Other"],
          "Telecom": ["Technology", "Finance", "Other"],
          "Other": [],
        };

        const allCompanies: any[] = data.companies || [];
        const buyerCnaePrefixes: string[] = criteria.cnae_prefixes || [];

        const preScored = allCompanies.map((c: any) => {
          let score = 0;

          // Setor: exato (+40), adjacente (+20), bonus por CNAE prefix (+15)
          if (criteria.target_sector) {
            if (c.sector === criteria.target_sector) {
              score += 40;
            } else if (SECTOR_ADJACENCY[criteria.target_sector]?.includes(c.sector)) {
              score += 20;
            }
          }
          // Bonus CNAE: se o prefixo da empresa bate com os prefixos extraídos pelo parse-intent
          if (buyerCnaePrefixes.length > 0) {
            const companyCnae = c.cnae_fiscal_principal ||
              (c.description?.match(/CNAE: (\d+)/)?.[1]) || "";
            if (buyerCnaePrefixes.some((p: string) => String(companyCnae).startsWith(p))) {
              score += 15;
            }
          }

          // Porte: exato (+20), adjacente (+10)
          const sizeOrder = ["Startup", "Small", "Medium", "Large", "Enterprise"];
          const targetIdx = sizeOrder.indexOf(criteria.target_size || "");
          const companyIdx = sizeOrder.indexOf(c.size || "");
          if (criteria.target_size) {
            if (c.size === criteria.target_size) score += 20;
            else if (targetIdx >= 0 && companyIdx >= 0 && Math.abs(targetIdx - companyIdx) === 1) score += 10;
          }

          // Estado (+20)
          if (criteria.target_state && c.state === criteria.target_state) score += 20;

          // Dados disponíveis (+10)
          if (c.revenue || c.capital_social) score += 10;

          // CNPJ válido (+10)
          if (c.cnpj && String(c.cnpj).replace(/\D/g, "").length >= 14) score += 10;

          return { ...c, pre_score: score };
        });

        // Threshold reduzido de 30→20 para aumentar recall (adjacências agora pontuam)
        const preFiltered = preScored
          .filter((c: any) => c.pre_score >= 20)
          .sort((a: any, b: any) => b.pre_score - a.pre_score)
          .slice(0, 25);

        const funnelReceived = allCompanies.length;
        const funnelPreFiltered = preFiltered.length;

        console.log(`[Funil] Recebidas: ${funnelReceived} → Pré-filtradas: ${funnelPreFiltered} → IA`);

        systemPrompt = `You are an elite M&A matching analyst specializing in the Brazilian market. ALL companies are located in Brazil. You MUST follow the SCORING RUBRIC below strictly. Return ONLY a valid JSON array.

SCORING RUBRIC PER DIMENSION (0-100):

FINANCIAL_FIT (CONFIDENCE-AWARE):
- 90-100: Revenue AND EBITDA within desired range, healthy margins, controlled debt
- 70-89: Within range with minor deviations, acceptable margins
- 40-69: Partially outside range OR estimated financial data (capital_social proxy)
- 0-39: Significantly outside financial criteria
- IMPORTANT: If the company has NO revenue AND NO ebitda (only capital_social), set financial_fit = 50 (neutral — do NOT penalize). Mention in dimension_explanations that data is estimated from capital social.
- Do NOT reduce financial_fit below 50 solely due to missing data.

SECTOR_FIT:
- 90-100: Same sector or adjacent sector with clear synergy
- 70-89: Related sector with synergy potential
- 40-69: Different sector but some complementarity
- 0-39: Unrelated sector or declining industry
- Note: companies with pre_score bonus from CNAE prefix match should receive higher sector_fit.

SIZE_FIT:
- 90-100: Exact target size match
- 70-89: One level difference (e.g., Small vs Medium)
- 40-69: Two levels difference
- 0-39: Too large or too small for criteria

LOCATION_FIT:
- If distance_km is provided: score = max(10, 100 - (distance_km / radius_km * 50))
- No coordinates available: 50 (neutral)
- Same state bonus: +15 points (cap at 100)

RISK_FIT:
${riskLevel ? `- Buyer's preferred risk level: "${riskLevel}". Companies matching this level score 85-100. One level difference: 50-70. Two levels: 20-40.` : "- No specific risk preference from buyer."}
- For Conservative profile: Low risk = 90+, Medium = 60-75, High = 20-40
- For Aggressive profile: High risk = 70-85, Medium = 55-70, Low = 50-65
- For Moderate profile: balanced distribution

DYNAMIC WEIGHT FOR FINANCIAL_FIT based on data availability:
- If the company HAS revenue AND ebitda: use standard profile weights below
- If the company has ONLY capital_social (no real revenue): reduce financial_fit weight by 40% and redistribute equally to sector_fit and size_fit

OVERALL SCORE = Weighted average based on investor profile:
- Agressivo (standard): sector_fit*0.30 + size_fit*0.25 + financial_fit*0.20 + location_fit*0.15 + risk_fit*0.10
- Agressivo (sem dados financeiros): sector_fit*0.35 + size_fit*0.30 + financial_fit*0.12 + location_fit*0.15 + risk_fit*0.08
- Moderado (standard): financial_fit*0.25 + sector_fit*0.20 + size_fit*0.20 + location_fit*0.20 + risk_fit*0.15
- Moderado (sem dados financeiros): sector_fit*0.30 + size_fit*0.30 + financial_fit*0.15 + location_fit*0.15 + risk_fit*0.10
- Conservador (standard): financial_fit*0.30 + risk_fit*0.30 + sector_fit*0.15 + size_fit*0.15 + location_fit*0.10
- Conservador (sem dados financeiros): risk_fit*0.35 + sector_fit*0.20 + size_fit*0.20 + financial_fit*0.15 + location_fit*0.10

The compatibility_score MUST equal the weighted average of the dimensions using the appropriate weight set (rounded). Do NOT generate it independently.

${notes ? `STRATEGIC NOTES FROM BUYER (MUST influence scoring and analysis): "${notes}"` : ""}`;

        userPrompt = `Buyer acquisition criteria: ${JSON.stringify(criteria)}
Investor profile: ${investorProfile}

Candidate companies (pre-filtered, all in Brazil): ${JSON.stringify(preFiltered)}

Note: Each company may include a "distance_km" field indicating distance from the buyer's reference city. Use this for location_fit scoring.

For EACH company, return a JSON array element with:
- "company_id": the company's id
- "compatibility_score": 0-100 (MUST be the weighted average of dimensions per investor profile)
- "analysis": 2-3 sentence strategic analysis (mention geographic proximity, data completeness, and strategic notes if relevant)
- "dimensions": {"financial_fit": 0-100, "sector_fit": 0-100, "size_fit": 0-100, "location_fit": 0-100, "risk_fit": 0-100}
- "dimension_explanations": {"financial_fit": "1 sentence", "sector_fit": "...", "size_fit": "...", "location_fit": "...", "risk_fit": "..."}
- "strengths": ["2-3 key strengths of this company for the buyer"]
- "weaknesses": ["2-3 key weaknesses or risks for the buyer"]
- "recommendation": one actionable sentence on next steps

Return ONLY a JSON array.`;

        // Update funnel data  
        (data as any).__funnel = { received: funnelReceived, pre_filtered: funnelPreFiltered };
        break;
      }

      case "match-single": {
        // Analyze ONE company with AI (on-demand enrichment)
        const company = data.company || {};
        const criteria = data.criteria || {};
        const investorProfile = data.investor_profile || "Moderado";
        const preDimensions = data.pre_score_dimensions || null;

        systemPrompt = `You are an elite M&A analyst specializing in the Brazilian market. Analyze ONE specific company and return a detailed JSON enrichment. ALL responses and analysis text must be in PORTUGUESE (Brazil).

Return ONLY valid JSON with this structure:
{
  "compatibility_score": 0-100,
  "analysis": "2-3 sentence strategic analysis in Portuguese",
  "dimensions": {
    "financial_fit": 0-100,
    "sector_fit": 0-100,
    "size_fit": 0-100,
    "location_fit": 0-100,
    "risk_fit": 0-100
  },
  "dimension_explanations": {
    "financial_fit": "1 sentence in Portuguese",
    "sector_fit": "1 sentence in Portuguese",
    "size_fit": "1 sentence in Portuguese",
    "location_fit": "1 sentence in Portuguese",
    "risk_fit": "1 sentence in Portuguese"
  },
  "strengths": ["2-3 key strengths in Portuguese"],
  "weaknesses": ["2-3 key risks/weaknesses in Portuguese"],
  "recommendation": "One actionable next step in Portuguese"
}

FINANCIAL_FIT: If no revenue/EBITDA, set financial_fit = 50 (neutral). Do NOT penalize for missing data.
SECTOR_FIT: Consider CNAE codes, sector adjacency, and strategic synergies.
INVESTOR PROFILE: ${investorProfile}
- Agressivo: prioritize growth, synergy, expansion potential
- Moderado: balance between growth and security
- Conservador: prioritize stability, low risk, proven track record`;

        userPrompt = `Buyer criteria: ${JSON.stringify(criteria)}
Company to analyze: ${JSON.stringify(company)}
${preDimensions ? `Pre-calculated deterministic dimensions (use as baseline, you may refine): ${JSON.stringify(preDimensions)}` : ""}

Return ONLY the JSON enrichment.`;
        break;
      }

      case "due-diligence":
        systemPrompt = "You are a due diligence analyst. Analyze the provided company data and documents for risks. Return JSON with ai_report (string), risk_items (array of {category, severity, description}), and status.";
        userPrompt = `Company: ${JSON.stringify(data.company)}\nDocument content: ${data.documentText || "No document provided"}\n\nReturn JSON: {"ai_report": "...", "risk_items": [...], "status": "completed"}`;
        break;

      case "due-diligence-full":
        systemPrompt = `You are a senior M&A due diligence analyst specializing in the Brazilian market. You must analyze ALL data provided (company info, checklist status, documents) and produce a comprehensive structured report. ALL responses must be in Portuguese (Brazil).

Return ONLY valid JSON with this structure:
{
  "summary": "Executive summary of the DD findings (2-3 paragraphs in Portuguese)",
  "category_scores": [{"category": "financeiro", "score": 0-100, "analysis": "brief analysis"}...],
  "risk_items": [{"category": "...", "severity": "low|medium|high|critical", "description": "...", "recommendation": "..."}...],
  "verdict": "go|no-go|conditional",
  "justification": "Detailed justification for the verdict in Portuguese"
}`;
        userPrompt = `Company: ${JSON.stringify(data.company)}
Checklist items (${data.checklist?.length || 0} total): ${JSON.stringify(data.checklist?.map((i: any) => ({ category: i.category, item: i.item_name, status: i.status, severity: i.severity, notes: i.notes })))}
Documents analyzed: ${JSON.stringify(data.documents)}

Provide a comprehensive due diligence analysis.`;
        break;

      case "valuation":
        systemPrompt = "You are a financial valuation expert. Calculate company valuation using DCF and EBITDA multiple methods. Return JSON with dcf_value, ebitda_value, sensitivity_data (array for chart), and analysis text.";
        userPrompt = `Company financials: ${JSON.stringify(data.financials)}\nParameters: growth_rate=${data.growthRate}%, discount_rate=${data.discountRate}%, ebitda_multiple=${data.ebitdaMultiple}x\n\nReturn JSON: {"dcf_value": ..., "ebitda_value": ..., "sensitivity_data": [{"growth_rate": ..., "value": ...}], "analysis": "..."}`;
        break;

      case "strategy":
        systemPrompt = "You are an M&A strategy advisor. Analyze the transaction and provide success probability, strategic recommendations, and integration timeline. Return JSON.";
        userPrompt = `Transaction: ${JSON.stringify(data.transaction)}\nBuyer company: ${JSON.stringify(data.buyer)}\nTarget company: ${JSON.stringify(data.target)}\n\nReturn JSON: {"success_probability": 75, "recommendations": [{"title": "...", "description": "...", "priority": "high"}], "integration_timeline": [{"phase": "...", "duration": "...", "tasks": [...]}]}`;
        break;

      case "contract":
        systemPrompt = "You are a legal document generator specializing in M&A contracts. Generate professional contract text based on the parameters provided. Return the full contract text as a string.";
        userPrompt = `Contract type: ${data.contractType}\nParameters: ${JSON.stringify(data.parameters)}\n\nGenerate a professional ${data.contractType} contract.`;
        break;

      case "risk":
        systemPrompt = "You are a risk analyst. Evaluate the company across financial, legal, and operational dimensions. Return JSON with scores (0-100) and recommendations.";
        userPrompt = `Company: ${JSON.stringify(data.company)}\n\nReturn JSON: {"financial_score": ..., "legal_score": ..., "operational_score": ..., "overall_score": ..., "details": {...}, "recommendations": "..."}`;
        break;

      case "parse-intent": {
        systemPrompt = `Você é um especialista em M&A brasileiro com profundo conhecimento em CNAE (Classificação Nacional de Atividades Econômicas). 
O usuário irá descrever em linguagem informal o que procura em uma aquisição ou parceria.
Sua tarefa é extrair parâmetros de busca precisos e retornar APENAS um JSON válido sem markdown.

MAPEAMENTO DE CNAE:
- Consultoria financeira / gestão financeira / assessoria financeira / CFOaaS / BPO financeiro → cnae_prefixes: ["6920", "70"]
- Advocacia / escritório de advocacia / jurídico → cnae_prefixes: ["6911"]
- Contabilidade / escritório contábil / auditoria → cnae_prefixes: ["6920"]
- Fundos / corretoras / mercado financeiro → cnae_prefixes: ["66"]
- Software / tecnologia / TI / sistemas → cnae_prefixes: ["62", "63"]
- Comércio / varejo / distribuição → cnae_prefixes: ["45", "46", "47"]
- Saúde / clínica / hospital / farmácia → cnae_prefixes: ["86", "87", "88"]
- Educação / ensino / escola → cnae_prefixes: ["85"]
- Construção / incorporação / obra → cnae_prefixes: ["41", "42", "43"]
- Transporte / logística → cnae_prefixes: ["49", "50", "51", "52"]
- Indústria / manufatura / fábrica → cnae_prefixes: ["10", "11", "12", "13", "14", "15", "16", "17", "18", "20", "22", "23", "24", "25"]
- Agronegócio / agricultura / pecuária → cnae_prefixes: ["01", "02", "03"]
- Telecomunicações / telecom → cnae_prefixes: ["61"]
- Energia → cnae_prefixes: ["35"]

REGRAS DE CAPITAL SOCIAL:
- Se o usuário menciona faturamento de R$X, estimar capital social máximo como X * 0.5 e mínimo como X * 0.005
- Empresas com capital social > 10x o faturamento do comprador são irrelevantes (grandes demais)
- Capital social mínimo: ao menos R$ 10.000 para filtrar informais

Retorne SOMENTE JSON, sem explicações:`;

        userPrompt = `Texto do usuário: "${data.text}"

Retorne JSON com este formato exato:
{
  "target_sector": "Finance",
  "cnae_subtype": "Consulting",
  "cnae_prefixes": ["69", "70"],
  "target_size": "Small",
  "buyer_revenue_brl": 5000000,
  "max_capital_social_brl": 2500000,
  "min_capital_social_brl": 10000,
  "intent": "acquisition",
  "suggested_notes": "Consultoria financeira buscando empresas similares menores para aquisição ou parceria estratégica",
  "human_readable_summary": "Consultoria Financeira (CNAE 69xx/70xx) · Pequenas e Startups · Capital até R$2,5M"
}`;
        break;
      }

      case "parse-seller-intent": {
        const seller = data.seller || {};
        systemPrompt = `Você é um especialista em M&A brasileiro. O usuário possui uma EMPRESA À VENDA e precisa encontrar COMPRADORES potenciais.
Sua tarefa é analisar os dados do vendedor e retornar perfis de compradores ideais com CNAEs para busca.

Considere 3 estratégias de busca:
1. CONSOLIDAÇÃO HORIZONTAL — Concorrentes maiores do mesmo setor que querem aumentar market share
2. INTEGRAÇÃO VERTICAL — Empresas na cadeia de valor (fornecedores ou clientes) que querem internalizar
3. DIVERSIFICAÇÃO — Empresas de setores adjacentes ou fundos que querem entrar no setor

Para cada perfil, forneça CNAEs específicos (2 ou 4 dígitos) para busca na base de dados da Receita Federal.

IMPORTANTE — AMPLIE A COBERTURA DE CNAEs:
- Sempre inclua CNAEs de consultorias de gestão (7020) e sedes de empresas/holdings (7010, 6462) nos perfis de consolidação ou diversificação
- Para empresas de serviços profissionais (contabilidade, advocacia, consultoria), inclua também: 62 (TI/software), 7020 (gestão), 7010 (sedes), 6462 (holdings)
- Para empresas de tecnologia, inclua: 6311 (dados), 6319 (portais), 7020, 7010
- Gere no mínimo 3 perfis e no máximo 5, cada um com pelo menos 3 prefixos CNAE diferentes
- NÃO se limite a um único CNAE por perfil — compradores reais vêm de setores variados

IMPORTANTE — RESPEITE A GEOGRAFIA:
- Se o vendedor está em um estado específico, defina search_nationwide = false nos perfis de consolidação horizontal (concorrentes locais)
- Apenas perfis de diversificação ou integração vertical devem ter search_nationwide = true
- NUNCA defina search_nationwide = true para TODOS os perfis

Retorne SOMENTE JSON válido, sem markdown.`;

        userPrompt = `Dados do vendedor:
- Nome: ${seller.name || "N/A"}
- CNPJ: ${seller.cnpj || "N/A"}
- Setor/CNAE: ${seller.cnae || seller.sector || "N/A"}
- Estado/Cidade: ${seller.state || "N/A"} / ${seller.city || "N/A"}
- Faturamento anual: R$${seller.revenue ? (seller.revenue / 1e6).toFixed(1) + "M" : "N/A"}
- Lucro/EBITDA: R$${seller.ebitda ? (seller.ebitda / 1e6).toFixed(1) + "M" : "N/A"}
- Valor pedido (asking price): R$${seller.asking_price ? (seller.asking_price / 1e6).toFixed(1) + "M" : "N/A"}
- Descrição: ${seller.description || "N/A"}

Retorne JSON com este formato:
{
  "buyer_profiles": [
    {
      "strategy": "horizontal|vertical|diversification",
      "label": "Descrição curta do perfil (ex: Concorrentes de beneficiamento de grãos)",
      "motivation": "Por que esse comprador compraria (1-2 frases)",
      "cnae_prefixes": ["10", "1061"],
      "target_size": "Medium",
      "min_capital_social": 1000000,
      "search_nationwide": false
    }
  ],
  "investment_thesis": "Resumo da tese de investimento em 2-3 frases",
  "estimated_buyer_count": 50,
  "recommended_asking_multiple": 2.5
}`;
        break;
      }

      default:
        throw new Error(`Unknown analysis type: ${type}`);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: (type === "match" || type === "match-single" || type === "parse-seller-intent") ? "google/gemini-2.5-flash" : "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";

    if (type === "contract") {
      return new Response(JSON.stringify({ content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed;
    try {
      // Strip code fences (```json ... ```) before extracting JSON
      const stripped = content.trim()
        .replace(/^```(?:json|javascript|typescript)?\s*\n?/, '')
        .replace(/\n?```\s*$/, '')
        .trim();
      const jsonMatch = stripped.match(/\{[\s\S]*\}/) || stripped.match(/\[[\s\S]*\]/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : stripped;
    } catch {
      parsed = content;
    }

    const funnel = (data as any).__funnel || null;
    return new Response(JSON.stringify({ result: parsed, funnel }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
