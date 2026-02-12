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

        systemPrompt = `You are an elite M&A matching analyst specializing in the Brazilian market. ALL companies are located in Brazil. You MUST follow the SCORING RUBRIC below strictly. Return ONLY a valid JSON array.

SCORING RUBRIC PER DIMENSION (0-100):

FINANCIAL_FIT:
- 90-100: Revenue AND EBITDA within desired range, healthy margins, controlled debt
- 70-89: Within range with minor deviations, acceptable margins
- 40-69: Partially outside range OR incomplete financial data
- 0-39: Significantly outside financial criteria OR no financial data
- PENALTY: If the company has NO revenue OR NO ebitda data, reduce financial_fit by 20 points and mention this in the explanation.

SECTOR_FIT:
- 90-100: Same sector or adjacent sector with clear synergy
- 70-89: Related sector with synergy potential
- 40-69: Different sector but some complementarity
- 0-39: Unrelated sector or declining industry

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

OVERALL SCORE = Weighted average based on investor profile:
- Agressivo: sector_fit*0.30 + size_fit*0.25 + financial_fit*0.20 + location_fit*0.15 + risk_fit*0.10
- Moderado: financial_fit*0.25 + sector_fit*0.20 + size_fit*0.20 + location_fit*0.20 + risk_fit*0.15
- Conservador: financial_fit*0.30 + risk_fit*0.30 + sector_fit*0.15 + size_fit*0.15 + location_fit*0.10

The compatibility_score MUST equal the weighted average of the dimensions (rounded). Do NOT generate it independently.

INCOMPLETE DATA: If a company lacks revenue OR ebitda, reduce financial_fit by 20 points and mention in the explanation.

${notes ? `STRATEGIC NOTES FROM BUYER (MUST influence scoring and analysis): "${notes}"` : ""}`;

        userPrompt = `Buyer acquisition criteria: ${JSON.stringify(data.criteria)}
Investor profile: ${investorProfile}

Candidate companies (all in Brazil): ${JSON.stringify(data.companies)}

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
        break;
      }

      case "due-diligence":
        systemPrompt = "You are a due diligence analyst. Analyze the provided company data and documents for risks. Return JSON with ai_report (string), risk_items (array of {category, severity, description}), and status.";
        userPrompt = `Company: ${JSON.stringify(data.company)}\nDocument content: ${data.documentText || "No document provided"}\n\nReturn JSON: {"ai_report": "...", "risk_items": [...], "status": "completed"}`;
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
        model: type === "match" ? "google/gemini-3-pro-preview" : "google/gemini-3-flash-preview",
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
      const jsonMatch = content.match(/\[[\s\S]*\]/) || content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : content;
    } catch {
      parsed = content;
    }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
