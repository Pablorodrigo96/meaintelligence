import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── CNAE → Sector ───────────────────────────────────────────────────────────
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

// ─── Layer 2: CNAE Business Model Benchmarks ─────────────────────────────────
const CNAE_BUSINESS_MODEL: Record<string, {
  payroll_pct: number;
  rev_per_employee: number;
  margin_profile: string;
  model_label: string;
  benchmark_revenue: number;
}> = {
  "Tecnologia":  { payroll_pct: 0.40, rev_per_employee: 500_000, margin_profile: "Alta margem", model_label: "Software / SaaS", benchmark_revenue: 5_000_000 },
  "Comércio":    { payroll_pct: 0.12, rev_per_employee: 200_000, margin_profile: "Margem baixa, giro alto", model_label: "Distribuição / Varejo", benchmark_revenue: 1_500_000 },
  "Indústria":   { payroll_pct: 0.20, rev_per_employee: 250_000, margin_profile: "Capital intensivo", model_label: "Produção industrial", benchmark_revenue: 3_000_000 },
  "Saúde":       { payroll_pct: 0.35, rev_per_employee: 180_000, margin_profile: "Estável regulado", model_label: "Serviços de saúde", benchmark_revenue: 2_000_000 },
  "Logística":   { payroll_pct: 0.25, rev_per_employee: 200_000, margin_profile: "Margem operacional apertada", model_label: "Transporte / Armazenagem", benchmark_revenue: 2_500_000 },
  "Agronegócio": { payroll_pct: 0.15, rev_per_employee: 300_000, margin_profile: "Cíclico / Commodity", model_label: "Produção agrícola", benchmark_revenue: 4_000_000 },
  "Finanças":    { payroll_pct: 0.30, rev_per_employee: 400_000, margin_profile: "Alta alavancagem", model_label: "Serviços financeiros", benchmark_revenue: 3_500_000 },
  "Educação":    { payroll_pct: 0.45, rev_per_employee: 120_000, margin_profile: "Escala de alunos", model_label: "Ensino e treinamento", benchmark_revenue: 1_200_000 },
  "Construção":  { payroll_pct: 0.22, rev_per_employee: 220_000, margin_profile: "Ciclo longo", model_label: "Incorporação / Obras", benchmark_revenue: 2_500_000 },
  "Energia":     { payroll_pct: 0.18, rev_per_employee: 350_000, margin_profile: "Capital intensivo regulado", model_label: "Geração / Distribuição", benchmark_revenue: 4_500_000 },
  "Imobiliário": { payroll_pct: 0.20, rev_per_employee: 250_000, margin_profile: "Ciclo longo / Ativo intensivo", model_label: "Gestão imobiliária", benchmark_revenue: 2_000_000 },
  "Serviços":    { payroll_pct: 0.38, rev_per_employee: 150_000, margin_profile: "Serviço profissional", model_label: "Prestação de serviços", benchmark_revenue: 1_000_000 },
};

// ─── Layer 5: Average Salary by Sector (BRL/month) ────────────────────────────
const AVG_SALARY_BY_SECTOR: Record<string, number> = {
  "Tecnologia":  8_000,
  "Comércio":    2_500,
  "Indústria":   3_500,
  "Saúde":       4_500,
  "Logística":   3_000,
  "Agronegócio": 2_800,
  "Finanças":    7_000,
  "Educação":    3_200,
  "Construção":  3_800,
  "Energia":     6_000,
  "Imobiliário": 4_000,
  "Serviços":    2_800,
};

// ─── Layer 1: Capital Social → Cluster de Porte ───────────────────────────────
function capitalCluster(capital: number): { label: string; tier: number } {
  if (capital < 10_000)    return { label: "Micro informal", tier: 1 };
  if (capital < 100_000)   return { label: "Micro estruturada", tier: 2 };
  if (capital < 500_000)   return { label: "Pequena", tier: 3 };
  if (capital < 2_000_000) return { label: "Média estruturada", tier: 4 };
  if (capital < 10_000_000) return { label: "Grande / Tese definida", tier: 5 };
  return { label: "Corporação", tier: 6 };
}

// ─── Layer 3: Idade → Sinal de Maturidade ────────────────────────────────────
function maturitySignal(yearsActive: number, capitalTier: number): {
  signal: string;
  label: string;
  insight: string;
} {
  if (yearsActive < 2) {
    return {
      signal: "startup_nascente",
      label: "Empresa nascente",
      insight: "DD aprofundada necessária — risco operacional alto",
    };
  }
  if (yearsActive < 5 && capitalTier >= 4) {
    return {
      signal: "crescimento_acelerado",
      label: "Crescimento acelerado",
      insight: "Alto potencial, alto risco — verificar queima de caixa",
    };
  }
  if (yearsActive > 15 && capitalTier <= 3) {
    return {
      signal: "estagnacao_estrutural",
      label: "Estagnação estrutural",
      insight: "Empresa antiga com capital baixo — cuidado com EBITDA negativo",
    };
  }
  if (yearsActive >= 5 && yearsActive <= 20 && capitalTier >= 3) {
    return {
      signal: "maturidade_consolidada",
      label: "Maturidade consolidada",
      insight: "Perfil ideal para M&A — histórico + capital estruturado",
    };
  }
  return {
    signal: "maturidade_consolidada",
    label: "Perfil em consolidação",
    insight: "Empresa em fase de estabilização",
  };
}

// ─── Layer 4: Employee Cluster ────────────────────────────────────────────────
function employeeCluster(n: number): string {
  if (n < 10)  return "1–10";
  if (n < 30)  return "10–30";
  if (n < 80)  return "30–80";
  if (n < 200) return "80–200";
  if (n < 500) return "200–500";
  return "500+";
}

// ─── Tax Regime ───────────────────────────────────────────────────────────────
function regimeAdjust(porte: string): { factor: number; label: string; limit: number } {
  const p = (porte || "").toUpperCase();
  if (p.includes("MEI") || p === "01") return { factor: 0.8, label: "Simples Nacional (MEI)", limit: 81_000 };
  if (p.includes("ME")  || p === "03") return { factor: 0.8, label: "Simples Nacional (ME)", limit: 4_800_000 };
  if (p.includes("EPP") || p === "05") return { factor: 1.0, label: "Lucro Presumido (EPP)", limit: 78_000_000 };
  return { factor: 1.2, label: "Lucro Real (Demais)", limit: 300_000_000 };
}

function locationAdjust(uf: string): { factor: number; label: string } {
  const high = ["SP", "RJ", "DF"];
  const mid  = ["MG", "PR", "RS", "SC", "BA"];
  if (high.includes(uf)) return { factor: 1.1, label: "Grande centro (1.1x)" };
  if (mid.includes(uf))  return { factor: 1.0, label: "Centro regional (1.0x)" };
  return { factor: 0.9, label: "Demais regiões (0.9x)" };
}

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
          intelligence: null,
        });
        continue;
      }

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
            intelligence: null,
          });
          continue;
        }

        const data = await resp.json();

        // ── Base calculations ──────────────────────────────────────────────────
        const sector     = cnaeSector(data.cnae_fiscal || 0);
        const sectorModel = CNAE_BUSINESS_MODEL[sector] || CNAE_BUSINESS_MODEL["Serviços"];
        const regime     = regimeAdjust(data.porte || "");
        const loc        = locationAdjust(data.uf || "");
        const sit        = situacaoLabel(data.situacao_cadastral || 0);
        const capitalSocial = data.capital_social || 0;

        let yearsActive: number | null = null;
        if (data.data_inicio_atividade) {
          const start = new Date(data.data_inicio_atividade);
          yearsActive = Math.floor((Date.now() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        }

        // ── Layer 1: Capital Cluster ───────────────────────────────────────────
        const capCluster = capitalCluster(capitalSocial);

        // ── Method 1: Benchmark × Regime × Capital Ratio × Location ───────────
        const capitalRatio = regime.limit > 0 ? Math.min(capitalSocial / regime.limit, 3) : 1;
        const revMethod1   = Math.round(sectorModel.benchmark_revenue * regime.factor * capitalRatio * loc.factor);

        // ── Layer 4: Estimated employees from method 1 ─────────────────────────
        const estimatedEmployeesRaw = revMethod1 / sectorModel.rev_per_employee;
        const estimatedEmployees    = Math.max(1, Math.round(estimatedEmployeesRaw));
        const empCluster            = employeeCluster(estimatedEmployees);

        // ── Layer 5: Payroll inversion method ─────────────────────────────────
        const avgSalary       = AVG_SALARY_BY_SECTOR[sector] || 3_500;
        const monthlyPayroll  = avgSalary * estimatedEmployees;
        const annualPayroll   = monthlyPayroll * 12;
        const revMethod2      = Math.round(annualPayroll / sectorModel.payroll_pct);

        // ── Convergence (divergence between two methods) ───────────────────────
        const maxRev    = Math.max(revMethod1, revMethod2);
        const divergence = maxRev > 0 ? Math.abs(revMethod1 - revMethod2) / maxRev : 1;
        const convergencePct = Math.round((1 - divergence) * 100);

        // ── Confidence score ───────────────────────────────────────────────────
        let confidence = 30;
        if (capitalSocial > 0) confidence += 15;
        if (sit.active)        confidence += 15;
        if (data.cnae_fiscal)  confidence += 10;
        if (data.uf)           confidence += 5;
        if (convergencePct > 70) confidence += 15;
        else if (convergencePct > 50) confidence += 8;
        if (yearsActive && yearsActive >= 3) confidence += 10;
        confidence = Math.min(confidence, 100);

        // ── Layer 3: Maturity Signal ───────────────────────────────────────────
        const maturity = maturitySignal(yearsActive ?? 0, capCluster.tier);

        // ── Alerts ────────────────────────────────────────────────────────────
        const alerts: { severity: "high" | "medium" | "low"; message: string }[] = [];
        if (!sit.active) alerts.push({ severity: "high", message: "Situação cadastral irregular — verificar antes de avançar" });
        if (capCluster.tier <= 1) alerts.push({ severity: "medium", message: "Capital social muito baixo — provável empresa de fachada ou informal" });
        if (maturity.signal === "estagnacao_estrutural") alerts.push({ severity: "medium", message: "Empresa antiga com crescimento estagnado — EBITDA pode ser negativo" });
        if (maturity.signal === "startup_nascente") alerts.push({ severity: "low", message: "Empresa nascente — histórico operacional insuficiente para M&A" });
        if (convergencePct < 40) alerts.push({ severity: "low", message: "Baixa convergência entre métodos de estimativa — dados insuficientes para confiança alta" });
        if (yearsActive && yearsActive > 0 && capCluster.tier >= 4 && yearsActive < 3) alerts.push({ severity: "low", message: "Alto capital em empresa jovem — verificar origem dos recursos" });

        // ── Intelligence object ────────────────────────────────────────────────
        const intelligence = {
          capital_cluster: capCluster,
          employee_cluster: empCluster,
          estimated_employees: estimatedEmployees,
          avg_salary_brl: avgSalary,
          monthly_payroll_brl: monthlyPayroll,
          annual_payroll_brl: annualPayroll,
          maturity_signal: maturity,
          business_model: {
            model_label: sectorModel.model_label,
            margin_profile: sectorModel.margin_profile,
            payroll_pct: sectorModel.payroll_pct,
            rev_per_employee: sectorModel.rev_per_employee,
          },
          revenue_method1_brl: revMethod1,
          revenue_method2_brl: revMethod2,
          convergence_pct: convergencePct,
          confidence_score: confidence,
          alerts,
        };

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
          // Keep legacy revenue_estimate for backward compat
          revenue_estimate: {
            estimated_revenue_brl: revMethod1,
            benchmark_sector: sectorModel.benchmark_revenue,
            sector,
            regime: regime.label,
            regime_factor: regime.factor,
            capital_ratio: Math.round(capitalRatio * 1000) / 1000,
            location_factor: loc.factor,
            location_label: loc.label,
            confidence_score: confidence,
            formula: `${sectorModel.benchmark_revenue.toLocaleString("pt-BR")} × ${regime.factor} × ${Math.round(capitalRatio * 1000) / 1000} × ${loc.factor} = R$ ${revMethod1.toLocaleString("pt-BR")}`,
          },
          intelligence,
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
          intelligence: null,
        });
      }
    }

    // ── AI Consolidated Analysis ───────────────────────────────────────────────
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiAnalysis = null;

    if (LOVABLE_API_KEY) {
      const companiesWithData = results.filter((r) => r.intelligence);
      if (companiesWithData.length > 0) {
        try {
          // Build structured summary for AI (not raw JSON)
          const structuredSummary = companiesWithData.map(r => ({
            empresa: r.company_name,
            cnpj: r.cnpj_formatted,
            setor: r.public_data?.sector_mapped,
            modelo_negocio: r.intelligence?.business_model.model_label,
            margem_perfil: r.intelligence?.business_model.margin_profile,
            cluster_porte: r.intelligence?.capital_cluster.label,
            maturidade: r.intelligence?.maturity_signal.label,
            insight_maturidade: r.intelligence?.maturity_signal.insight,
            funcionarios_faixa: r.intelligence?.employee_cluster,
            faturamento_benchmark: `R$ ${(r.intelligence?.revenue_method1_brl || 0).toLocaleString("pt-BR")}`,
            faturamento_massa_salarial: `R$ ${(r.intelligence?.revenue_method2_brl || 0).toLocaleString("pt-BR")}`,
            convergencia_metodos: `${r.intelligence?.convergence_pct}%`,
            confianca: `${r.intelligence?.confidence_score}%`,
            situacao_cadastral: r.public_data?.situacao_cadastral,
            anos_atividade: r.public_data?.years_active,
            alertas: r.intelligence?.alerts.map(a => `[${a.severity.toUpperCase()}] ${a.message}`),
          }));

          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content: `Você é um analista sênior de M&A especialista no mercado brasileiro. 
Receberá dados estruturados pré-analisados de empresas candidatas a aquisição.
Gere uma análise consolidada em português em 4 seções obrigatórias:
1. **Visão Geral do Grupo** (2-3 frases sobre o conjunto)
2. **Destaques Positivos** (top 2-3 empresas mais atrativas e por quê)
3. **Alertas e Riscos** (principais riscos identificados nos dados)
4. **Recomendação Final** (ordem de prioridade de aprofundamento)
Seja objetivo. Use os dados fornecidos, não invente informações.`,
                },
                {
                  role: "user",
                  content: `Dados estruturados das empresas pré-selecionadas:\n${JSON.stringify(structuredSummary, null, 2)}`,
                },
              ],
            }),
          });

          if (aiResp.ok) {
            const aiData = await aiResp.json();
            aiAnalysis = aiData.choices?.[0]?.message?.content || null;
          }
        } catch {
          // AI analysis is optional
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
