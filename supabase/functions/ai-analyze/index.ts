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
        const profileInstructions: Record<string, string> = {
          "Agressivo": "The investor has an AGGRESSIVE profile: prioritize growth potential (sector_fit and size_fit should weigh more). Companies with high growth sectors and expansion potential should score higher. Risk tolerance is high.",
          "Moderado": "The investor has a MODERATE profile: use balanced weighting across all dimensions equally. Seek a good balance between growth opportunity and financial stability.",
          "Conservador": "The investor has a CONSERVATIVE profile: prioritize financial safety (financial_fit and risk_fit should weigh more). Companies with stable cash flows, low debt, and proven track records should score higher. Risk tolerance is low.",
        };
        const profileContext = profileInstructions[investorProfile] || profileInstructions["Moderado"];

        systemPrompt = `You are an elite M&A matching analyst specializing in the Brazilian market. ALL companies are located in Brazil. Evaluate each candidate company against buyer acquisition criteria across 5 dimensions. Be rigorous, data-driven, and provide actionable insights. For location_fit, strongly consider geographic proximity: if a reference city and radius were provided, companies closer to the reference point should score higher. If distance_km is provided for a company, use it directly. ${profileContext} Return ONLY a valid JSON array.`;
        userPrompt = `Buyer acquisition criteria: ${JSON.stringify(data.criteria)}\nInvestor profile: ${investorProfile}\n\nCandidate companies (all in Brazil): ${JSON.stringify(data.companies)}\n\nNote: Each company may include a "distance_km" field indicating distance from the buyer's reference city. Use this for location_fit scoring — closer companies should score higher.\n\nFor EACH company, evaluate compatibility and return a JSON array. Each element must have:\n- "company_id": the company's id\n- "compatibility_score": 0-100 overall score\n- "analysis": 2-3 sentence strategic analysis explaining the fit (mention geographic proximity if relevant)\n- "dimensions": {"financial_fit": 0-100, "sector_fit": 0-100, "size_fit": 0-100, "location_fit": 0-100, "risk_fit": 0-100}\n- "dimension_explanations": {"financial_fit": "1 sentence explaining this score", "sector_fit": "...", "size_fit": "...", "location_fit": "...", "risk_fit": "..."}\n- "recommendation": one actionable sentence on next steps\n\nReturn JSON array: [{"company_id": "...", "compatibility_score": 82, "analysis": "...", "dimensions": {...}, "dimension_explanations": {...}, "recommendation": "..."}]`;
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
        model: "google/gemini-3-flash-preview",
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
