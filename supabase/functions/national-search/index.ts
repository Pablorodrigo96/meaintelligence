import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { RF_MUNICIPIOS } from "./rf-municipios.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// CNAE to internal sector mapping
const CNAE_SECTOR_MAP: Record<string, string> = {
  "01": "Agribusiness", "02": "Agribusiness", "03": "Agribusiness",
  "05": "Energy", "06": "Energy", "07": "Energy", "08": "Energy", "09": "Energy",
  "10": "Manufacturing", "11": "Manufacturing", "12": "Manufacturing",
  "13": "Manufacturing", "14": "Manufacturing", "15": "Manufacturing",
  "16": "Manufacturing", "17": "Manufacturing", "18": "Manufacturing",
  "19": "Energy", "20": "Manufacturing", "21": "Healthcare",
  "22": "Manufacturing", "23": "Manufacturing", "24": "Manufacturing",
  "25": "Manufacturing", "26": "Technology", "27": "Manufacturing",
  "28": "Manufacturing", "29": "Manufacturing", "30": "Manufacturing",
  "31": "Manufacturing", "32": "Manufacturing", "33": "Manufacturing",
  "35": "Energy", "36": "Manufacturing", "37": "Manufacturing",
  "38": "Manufacturing", "39": "Manufacturing",
  "41": "Real Estate", "42": "Real Estate", "43": "Real Estate",
  "45": "Retail", "46": "Retail", "47": "Retail",
  "49": "Logistics", "50": "Logistics", "51": "Logistics",
  "52": "Logistics", "53": "Logistics",
  "55": "Retail", "56": "Retail",
  "58": "Technology", "59": "Technology", "60": "Telecom",
  "61": "Telecom", "62": "Technology", "63": "Technology",
  "64": "Finance", "65": "Finance", "66": "Finance",
  "68": "Real Estate",
  "69": "Finance", "70": "Finance",
  "71": "Technology", "72": "Technology", "73": "Technology",
  "74": "Technology", "75": "Healthcare",
  "77": "Retail", "78": "Other", "79": "Retail",
  "80": "Other", "81": "Other", "82": "Other",
  "84": "Other", "85": "Education",
  "86": "Healthcare", "87": "Healthcare", "88": "Healthcare",
  "90": "Other", "91": "Other", "92": "Other", "93": "Other",
  "94": "Other", "95": "Technology", "96": "Other",
  "97": "Other", "99": "Other",
};

function mapCnaeToSector(cnae: string | null): string {
  if (!cnae) return "Other";
  const prefix = String(cnae).substring(0, 2);
  return CNAE_SECTOR_MAP[prefix] || "Other";
}

// Sector benchmarks for revenue and EBITDA estimation
const SECTOR_BENCHMARKS: Record<string, { rev_per_employee: number; ebitda_margin: number }> = {
  "Technology":    { rev_per_employee: 500_000, ebitda_margin: 0.25 },
  "Retail":        { rev_per_employee: 200_000, ebitda_margin: 0.05 },
  "Manufacturing": { rev_per_employee: 250_000, ebitda_margin: 0.12 },
  "Healthcare":    { rev_per_employee: 180_000, ebitda_margin: 0.15 },
  "Logistics":     { rev_per_employee: 200_000, ebitda_margin: 0.08 },
  "Finance":       { rev_per_employee: 400_000, ebitda_margin: 0.20 },
  "Education":     { rev_per_employee: 120_000, ebitda_margin: 0.18 },
  "Real Estate":   { rev_per_employee: 250_000, ebitda_margin: 0.15 },
  "Energy":        { rev_per_employee: 350_000, ebitda_margin: 0.18 },
  "Telecom":       { rev_per_employee: 300_000, ebitda_margin: 0.20 },
  "Agribusiness":  { rev_per_employee: 300_000, ebitda_margin: 0.15 },
  "Other":         { rev_per_employee: 150_000, ebitda_margin: 0.10 },
};

function estimateRevenue(
  opcaoSimples: string | null,
  porte: string | null,
  cnae: string | null,
  capitalSocial: number | null
): number | null {
  const sector = mapCnaeToSector(cnae);

  // Camada 1: Simples Nacional → teto prático R$7M
  if (opcaoSimples === "S") {
    const p = (porte || "").trim();
    if (p === "01") return 1_500_000;   // Micro: ~R$1.5M média
    if (p === "03") return 5_000_000;   // EPP: ~R$5M média
    return 3_500_000;                   // Default Simples: ~R$3.5M
  }

  // Camada 2: Presumido/Real (fora do Simples) → piso R$7M
  const p = (porte || "").trim();
  if (p === "05" && capitalSocial && capitalSocial > 0) {
    const multipliers: Record<string, number> = {
      "Technology": 8, "Finance": 5, "Healthcare": 4,
      "Retail": 6, "Manufacturing": 2.5, "Energy": 1.5,
      "Real Estate": 1.5, "Logistics": 3, "Education": 4,
      "Telecom": 2, "Agribusiness": 2, "Other": 3,
    };
    const mult = multipliers[sector] || 3;
    return Math.max(capitalSocial * mult, 7_000_000);
  }

  // Porte desconhecido mas fora do Simples
  if (capitalSocial && capitalSocial > 100_000) {
    return Math.max(capitalSocial * 3, 7_000_000);
  }

  return 7_000_000; // Default fora do Simples
}

function estimateEbitda(revenue: number | null, cnae: string | null): number | null {
  if (!revenue) return null;
  const sector = mapCnaeToSector(cnae);
  const bench = SECTOR_BENCHMARKS[sector] || SECTOR_BENCHMARKS["Other"];
  return Math.round(revenue * bench.ebitda_margin);
}

// Map Receita Federal porte_empresa to internal size
function mapPorteToSize(porte: string | null): string {
  if (!porte) return "Small";
  const p = porte.trim();
  if (p === "00") return "Startup";
  if (p === "01") return "Small";
  if (p === "03") return "Small";
  if (p === "05") return "Medium";
  return "Small";
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const EXTERNAL_DB_URL = Deno.env.get("EXTERNAL_DB_URL");
    if (!EXTERNAL_DB_URL) {
      return new Response(
        JSON.stringify({ error: "EXTERNAL_DB_URL not configured. Please add the connection string as a secret." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      target_sector,
      target_state,
      target_size,
      cnae_prefixes,
      min_capital_social,
      max_capital_social,
      buyer_revenue_brl,
      raw = false,
      limit,
      mode,                  // "find-buyers" for reverse matching
      seller_asking_price,   // asking price for buyer capacity filtering
    } = body;

    // Layer 1: DB-level filter - DISTINCT ON ensures 1 company per cnpj_basico
    // Use 2000 to get a large initial pool — hundreds of unique companies after dedup
    const effectiveLimit = limit ?? (raw ? 200 : 2000);

    // Capital social caps by sector — prevents giants (Vivo, Itaú, Petrobras) from dominating
    // when the caller doesn't specify max_capital_social or buyer_revenue_brl
    const SECTOR_DEFAULT_MAX_CAPITAL: Record<string, number> = {
      "Telecom": 50_000_000,      // R$50M — excludes Vivo/Claro/TIM (capital >R$1B)
      "Finance": 100_000_000,     // R$100M — excludes Itaú, Bradesco
      "Energy": 200_000_000,      // R$200M — excludes Petrobras, Eletrobras
    };

    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
    const client = new Client(EXTERNAL_DB_URL);
    await client.connect();
    // Prevent runaway queries from blocking the connection
    await client.queryObject("SET statement_timeout = '25s'");

    // Build conditions
    const conditions: string[] = ["e.situacao_cadastral = '02'"]; // 02 = ATIVA
    const params: string[] = [];

    if (target_state) {
      params.push(target_state.toUpperCase());
      conditions.push(`e.uf = $${params.length}`);
    }

    if (target_size) {
      const porteMap: Record<string, string[]> = {
        "Startup": ["00"],
        "Small": ["01", "03"],
        "Medium": ["05"],
        "Large": ["05"],
        "Enterprise": ["05"],
      };
      const portes = porteMap[target_size];
      if (portes && portes.length > 0) {
        const placeholders = portes.map((_, i) => `$${params.length + i + 1}`).join(", ");
        params.push(...portes);
        conditions.push(`em.porte_empresa IN (${placeholders})`);
      }
    }

    // CNAE filter: specific prefixes take priority over broad sector filter
    if (cnae_prefixes && Array.isArray(cnae_prefixes) && cnae_prefixes.length > 0) {
      // Precise sub-sector filter (e.g. ["69","70"] for financial consulting, excludes banks)
      const cnaeConditions = cnae_prefixes.map((p: string) => {
        params.push(p);
        return `LEFT(e.cnae_fiscal_principal, ${p.length}) = $${params.length}`;
      }).join(" OR ");
      conditions.push(`(${cnaeConditions})`);
    } else if (target_sector) {
      // Fallback: broad sector filter from CNAE map
      const matchingPrefixes = Object.entries(CNAE_SECTOR_MAP)
        .filter(([, sector]) => sector === target_sector)
        .map(([prefix]) => prefix);

      if (matchingPrefixes.length > 0) {
        const cnaeConditions = matchingPrefixes.map((prefix) => {
          params.push(prefix);
          return `LEFT(e.cnae_fiscal_principal, ${prefix.length}) = $${params.length}`;
        }).join(" OR ");
        conditions.push(`(${cnaeConditions})`);
      }
    }

    // Apply sector default cap when max_capital_social not explicitly provided
    const effectiveMaxCapital: number | null = max_capital_social ??
      (target_sector ? (SECTOR_DEFAULT_MAX_CAPITAL[target_sector] ?? null) : null);

    // Capital social filters
    // For find-buyers mode: we want companies with enough capital to be potential buyers
    if (mode === "find-buyers" && seller_asking_price) {
      // Buyers should have capital social >= 30% of asking price (minimum financial capacity)
      const minBuyerCapital = min_capital_social ?? Math.max(100_000, seller_asking_price * 0.3);
      params.push(String(minBuyerCapital));
      conditions.push(`em.capital_social >= $${params.length}`);
      // No max cap for buyers — we want larger companies
    } else {
      // Standard mode: prevents giants from dominating results
      if (effectiveMaxCapital != null) {
        params.push(String(effectiveMaxCapital));
        conditions.push(`em.capital_social <= $${params.length}`);
      }
      if (min_capital_social != null) {
        params.push(String(min_capital_social));
        conditions.push(`em.capital_social >= $${params.length}`);
      }
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // DISTINCT ON requires ORDER BY to start with the DISTINCT ON column.
    // The secondary sort controls which establishment represents each company.
    let secondaryOrder = "em.capital_social DESC NULLS LAST";
    if (mode === "find-buyers") {
      // For buyer search: order by largest capital first (most capable buyers)
      secondaryOrder = "em.capital_social DESC NULLS LAST";
    } else if (buyer_revenue_brl != null && buyer_revenue_brl > 0) {
      const targetCapital = buyer_revenue_brl * 0.15;
      params.push(String(targetCapital));
      secondaryOrder = `ABS(COALESCE(em.capital_social, 0) - $${params.length}) ASC NULLS LAST`;
    } else if (effectiveMaxCapital != null) {
      const midCapital = effectiveMaxCapital * 0.3;
      params.push(String(midCapital));
      secondaryOrder = `ABS(COALESCE(em.capital_social, 0) - $${params.length}) ASC NULLS LAST`;
    }

    // DISTINCT ON (cnpj_basico) = 1 result per company, regardless of branch count
    // This prevents Telefônica's 500 branches from filling all 25 slots
    // Phase 2: subqueries add num_filiais (branch count) and num_ufs (multi-state presence)
    // Optimized query: removed correlated subqueries (num_filiais, num_ufs) that caused
    // timeouts on 50M+ row table. Default values (1) are used instead.
    const query = `
      SELECT DISTINCT ON (e.cnpj_basico)
        e.cnpj_basico || e.cnpj_ordem || e.cnpj_dv AS cnpj_completo,
        e.cnpj_basico,
        e.nome_fantasia,
        e.cnae_fiscal_principal,
        e.uf,
        e.municipio,
        e.situacao_cadastral,
        em.razao_social,
        em.capital_social,
        em.porte_empresa
      FROM estabelecimentos e
      INNER JOIN empresas em ON em.cnpj_basico = e.cnpj_basico
      ${whereClause}
      ORDER BY e.cnpj_basico, ${secondaryOrder}
      LIMIT ${effectiveLimit}
    `;


    console.log("Executing query with params:", params);

    const result = await client.queryObject({
      text: query,
      args: params,
    });

    await client.end();

    // Map to internal company format
    const companies = (result.rows as any[]).map((row) => {
      const cnpj = String(row.cnpj_completo || row.cnpj_basico || "").replace(/\D/g, "");
      const capitalSocial = parseFloat(row.capital_social) || null;
      const municipioCod = String(row.municipio || "");
      const cityName = RF_MUNICIPIOS[municipioCod] || municipioCod;

      return {
        id: cnpj || `ext_${Math.random().toString(36).substr(2, 9)}`,
        name: row.nome_fantasia || row.razao_social || "Empresa sem nome",
        cnpj: cnpj || null,
        sector: mapCnaeToSector(row.cnae_fiscal_principal),
        state: row.uf || null,
        city: cityName,
        size: mapPorteToSize(row.porte_empresa),
        revenue: estimateRevenue(null, row.porte_empresa, row.cnae_fiscal_principal, capitalSocial),
        ebitda: estimateEbitda(estimateRevenue(null, row.porte_empresa, row.cnae_fiscal_principal, capitalSocial), row.cnae_fiscal_principal),
        cash_flow: null,
        debt: null,
        risk_level: "Medium",
        description: `CNAE: ${row.cnae_fiscal_principal || "N/A"} | Porte: ${row.porte_empresa || "N/A"} | Capital Social: ${capitalSocial ? `R$${(capitalSocial / 1000).toFixed(0)}K` : "N/A"}`,
        location: `${cityName}, ${row.uf || ""}`.trim().replace(/^,\s*/, ""),
        source: "national_db",
        num_filiais: parseInt(row.num_filiais) || 1,
        num_ufs: parseInt(row.num_ufs) || 1,
      };
    });

    console.log(`national-search: returned ${companies.length} companies`);

    return new Response(
      JSON.stringify({ companies, total: companies.length, db_count: companies.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("national-search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", companies: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
