import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Zap, Star, X, ChevronDown, ChevronUp, BarChart3, Target, TrendingUp, Globe, Building2, DollarSign, Shield, Filter, MapPin, Microscope, Info, UserCheck, CheckCircle2, ArrowRight, ArrowLeft, RotateCcw, ThumbsUp, ThumbsDown, Trophy, Database, Sparkles, Loader2, BrainCircuit, PencilLine, Bookmark, Phone, AlertCircle, Link2, Mail, ExternalLink, Instagram, Linkedin, MapPinned, Users, ArrowLeftRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, PieChart, Pie, Cell } from "recharts";
import { BRAZILIAN_STATES, BRAZILIAN_CITIES, findCity, getCitiesByState } from "@/data/brazilian-cities";
import { haversineDistance } from "@/lib/geo";
import { DeepDiveDialog } from "@/components/DeepDiveDialog";

const sectors = [
  { value: "Technology", label: "Tecnologia" },
  { value: "Healthcare", label: "Saúde" },
  { value: "Finance", label: "Finanças" },
  { value: "Manufacturing", label: "Manufatura" },
  { value: "Energy", label: "Energia" },
  { value: "Retail", label: "Varejo" },
  { value: "Real Estate", label: "Imobiliário" },
  { value: "Agribusiness", label: "Agronegócio" },
  { value: "Logistics", label: "Logística" },
  { value: "Telecom", label: "Telecom" },
  { value: "Education", label: "Educação" },
  { value: "Other", label: "Outro" },
];
const companySizes = [
  { value: "Startup", label: "Startup" },
  { value: "Small", label: "Pequena" },
  { value: "Medium", label: "Média" },
  { value: "Large", label: "Grande" },
  { value: "Enterprise", label: "Corporação" },
];
const riskLevels = [
  { value: "Low", label: "Baixo" },
  { value: "Medium", label: "Médio" },
  { value: "High", label: "Alto" },
];
const investorProfiles = [
  { value: "Agressivo", label: "Agressivo", desc: "Prioriza crescimento e oportunidades de expansão", icon: TrendingUp },
  { value: "Moderado", label: "Moderado", desc: "Equilíbrio entre crescimento e segurança", icon: Target },
  { value: "Conservador", label: "Conservador", desc: "Prioriza segurança financeira e baixo risco", icon: Shield },
];

const sectorLabel = (value: string | null) => sectors.find((s) => s.value === value)?.label || value || "—";

function normalizeNameForMatch(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(ltda|eireli|s\.?a\.?|me|epp|ss|s\/s|s\/a|grupo|cia|companhia)\b/gi, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  // Ensure a is shorter for O(min(n,m)) space
  if (a.length > b.length) [a, b] = [b, a];
  let prev = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    const curr = [j];
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[i] = Math.min(prev[i] + 1, curr[i - 1] + 1, prev[i - 1] + cost);
    }
    prev = curr;
  }
  return prev[a.length];
}

function levenshteinSimilarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  const maxLen = Math.max(a.length, b.length);
  return 1 - levenshteinDistance(a, b) / maxLen;
}

function bestMatchSimilarity(nameA: string, nameB: string): number {
  // Full-string similarity
  let best = levenshteinSimilarity(nameA, nameB);
  // Token-based similarity for reordered names
  const tokensA = nameA.split(" ").filter(t => t.length > 3);
  const tokensB = nameB.split(" ").filter(t => t.length > 3);
  if (tokensA.length > 0 && tokensB.length > 0) {
    let totalSim = 0;
    let matched = 0;
    const usedB = new Set<number>();
    for (const tA of tokensA) {
      let bestTokenSim = 0;
      let bestIdx = -1;
      for (let i = 0; i < tokensB.length; i++) {
        if (usedB.has(i)) continue;
        const sim = levenshteinSimilarity(tA, tokensB[i]);
        if (sim > bestTokenSim) { bestTokenSim = sim; bestIdx = i; }
      }
      if (bestIdx >= 0 && bestTokenSim > 0.5) {
        usedB.add(bestIdx);
        totalSim += bestTokenSim;
        matched++;
      }
    }
    if (matched > 0) {
      const tokenScore = totalSim / Math.max(tokensA.length, tokensB.length);
      best = Math.max(best, tokenScore);
    }
  }
  return best;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface MatchDimensions {
  financial_fit: number;
  sector_fit: number;
  size_fit: number;
  location_fit: number;
  risk_fit: number;
  revenue_synergy: number;
  cost_synergy: number;
  vertical_synergy: number;
  consolidation_synergy: number;
  strategic_synergy: number;
  synergy_type: string;
  gain_insights: string[];
  bottleneck_resolution: string | null;
  consolidator_score: number;
  quality_score: number;
  tier_priority: number;
  tier_label: string;
  web_validated?: boolean;
  web_rank?: number | null;
  google_validated?: boolean;
  google_rank?: number | null;
}

interface DimensionExplanations {
  financial_fit?: string;
  sector_fit?: string;
  size_fit?: string;
  location_fit?: string;
  risk_fit?: string;
}

interface MatchResult {
  id: string;
  compatibility_score: number;
  ai_analysis: string;
  status: string;
  created_at: string;
  companies: {
    id: string;
    name: string;
    sector: string | null;
    location: string | null;
    revenue: number | null;
    ebitda: number | null;
    size: string | null;
    risk_level: string | null;
    description: string | null;
    cnpj: string | null;
    state: string | null;
    city: string | null;
  } | null;
}

function calcCompleteness(c: { revenue?: number | null; ebitda?: number | null; cnpj?: string | null; sector?: string | null; state?: string | null; city?: string | null }): number {
  const fields = [c.revenue, c.ebitda, c.cnpj, c.sector, c.state || c.city];
  const filled = fields.filter((f) => f != null && f !== "").length;
  return Math.round((filled / fields.length) * 100);
}

const PROGRESS_STEPS = [
  { label: "Buscando no banco nacional...", pct: 10 },
  { label: "Aplicando filtros determinísticos...", pct: 30 },
  { label: "Calculando scores de compatibilidade...", pct: 50 },
  { label: "Validando presença digital (Perplexity + Google)...", pct: 70 },
  { label: "Cruzando resultados web...", pct: 85 },
  { label: "Salvando resultados...", pct: 95 },
];

type SearchSource = "carteira" | "nacional";
type MatchMode = "find-targets" | "find-buyers";

interface SellerData {
  name: string;
  cnpj: string;
  cnae: string;
  sector: string;
  state: string;
  city: string;
  revenue: string;
  ebitda: string;
  asking_price: string;
  description: string;
}

interface BuyerProfile {
  strategy: string;
  label: string;
  motivation: string;
  cnae_prefixes: string[];
  target_size: string;
  min_capital_social: number;
  search_nationwide: boolean;
}

interface FunnelStats {
  db_fetched: number;
  pre_filtered: number;
  ai_analyzed: number;
  final_matches: number;
}

function FunnelCard({ stats, open, onToggle }: { stats: FunnelStats; open: boolean; onToggle: () => void }) {
  const steps = [
    { label: "Base Nacional", icon: Database, value: stats.db_fetched, color: "text-primary", bg: "bg-primary/10" },
    { label: "Deduplicados", icon: Filter, value: stats.pre_filtered, color: "text-accent", bg: "bg-accent/10" },
    { label: "Scored", icon: Zap, value: stats.pre_filtered, color: "text-warning", bg: "bg-warning/10" },
    { label: "Top Seleção", icon: Star, value: stats.ai_analyzed, color: "text-success", bg: "bg-success/10" },
    { label: "Salvos", icon: Trophy, value: stats.final_matches, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <Collapsible open={open} onOpenChange={onToggle}>
      <Card className="border-primary/20 bg-primary/5">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-2 pt-3 cursor-pointer">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                Funil de Seleção
                <Badge variant="secondary" className="text-xs">{stats.db_fetched} → {stats.final_matches} matches</Badge>
              </CardTitle>
              {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pb-4 pt-0">
            <div className="flex items-center gap-1 flex-wrap">
              {steps.map((step, i) => {
                const Icon = step.icon;
                const convRate = i > 0 ? Math.round((step.value / (steps[i - 1].value || 1)) * 100) : 100;
                return (
                  <div key={step.label} className="flex items-center gap-1">
                    {i > 0 && (
                      <div className="flex flex-col items-center">
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground">{convRate}%</span>
                      </div>
                    )}
                    <div className={`flex flex-col items-center rounded-lg px-3 py-2 ${step.bg} min-w-[70px]`}>
                      <Icon className={`w-4 h-4 ${step.color} mb-1`} />
                      <span className={`text-lg font-bold ${step.color}`}>{step.value}</span>
                      <span className="text-[10px] text-muted-foreground text-center leading-tight">{step.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Redução de {stats.db_fetched > 0 ? Math.round((1 - stats.ai_analyzed / stats.db_fetched) * 100) : 0}% no volume enviado para IA → resposta mais rápida e precisa.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}



export default function Matching() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("criteria");
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [minScoreFilter, setMinScoreFilter] = useState([0]);
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [investorProfile, setInvestorProfile] = useState("Moderado");
  const [buyerCnae, setBuyerCnae] = useState("");
  const [buyerBottlenecks, setBuyerBottlenecks] = useState<string[]>([]);
  const [wizardStep, setWizardStep] = useState(1);
  const [progressStep, setProgressStep] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [geoOpen, setGeoOpen] = useState(false);
  const [searchSource, setSearchSource] = useState<SearchSource>("carteira");
  const [matchMode, setMatchMode] = useState<MatchMode>("find-targets");
  const [sellerData, setSellerData] = useState<SellerData>({
    name: "", cnpj: "", cnae: "", sector: "", state: "", city: "",
    revenue: "", ebitda: "", asking_price: "", description: "",
  });
  const [buyerProfiles, setBuyerProfiles] = useState<BuyerProfile[]>([]);
  const [buyerSearchLoading, setBuyerSearchLoading] = useState(false);
  const [investmentThesis, setInvestmentThesis] = useState<string>("");
  const [nationalCompanies, setNationalCompanies] = useState<any[]>([]);
  const [funnelStats, setFunnelStats] = useState<{
    db_fetched: number;
    pre_filtered: number;
    ai_analyzed: number;
    final_matches: number;
  } | null>(null);
  const [funnelOpen, setFunnelOpen] = useState(true);
  // feedback state: set of match IDs with pending feedback action
  const [feedbackLoading, setFeedbackLoading] = useState<Record<string, string>>({});
  // AI enrichment per individual match (on-demand)
  const [aiEnrichingMatch, setAiEnrichingMatch] = useState<string | null>(null);
  const [enrichingMatch, setEnrichingMatch] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [webFilterMode, setWebFilterMode] = useState<"all" | "any">("all");

  // Buyer revenue field (Wizard Step 1)
  const [buyerRevenueBrl, setBuyerRevenueBrl] = useState<string>("");

  const handleBuyerRevenueChange = (val: string) => {
    setBuyerRevenueBrl(val);
    const numVal = Number(val);
    if (numVal > 0) {
      setNlExtraParams(prev => ({
        ...prev,
        buyer_revenue_brl: numVal,
        max_capital_social: numVal * 0.5,
      }));
    } else {
      setNlExtraParams(prev => {
        const next = { ...prev };
        delete next.buyer_revenue_brl;
        delete next.max_capital_social;
        return next;
      });
    }
  };

  // Natural language / parse-intent state
  const [nlText, setNlText] = useState("");
  const [nlParsing, setNlParsing] = useState(false);
  const [nlResult, setNlResult] = useState<{
    target_sector?: string;
    cnae_prefixes?: string[];
    cnae_subtype?: string;
    target_size?: string;
    buyer_revenue_brl?: number;
    max_capital_social_brl?: number;
    min_capital_social_brl?: number;
    intent?: string;
    suggested_notes?: string;
    human_readable_summary?: string;
  } | null>(null);

  // Extra params extracted by parse-intent, passed to national-search
  const [nlExtraParams, setNlExtraParams] = useState<{
    cnae_prefixes?: string[];
    min_capital_social?: number;
    max_capital_social?: number;
    buyer_revenue_brl?: number;
  }>({});

  const [criteria, setCriteria] = useState({
    target_sector: "",
    target_size: "",
    target_state: "",
    geo_reference_city: "",
    geo_radius_km: 500,
    no_geo_limit: true,
    min_revenue: "",
    max_revenue: "",
    min_ebitda: "",
    max_ebitda: "",
    risk_level: "",
    notes: "",
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*, companies:seller_company_id(*)")
        .eq("buyer_id", user!.id)
        .order("compatibility_score", { ascending: false });
      if (error) throw error;
      return data as MatchResult[];
    },
  });

  const { data: criteriaHistory = [] } = useQuery({
    queryKey: ["match_criteria"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_criteria")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const refCityData = useMemo(() => {
    if (!criteria.geo_reference_city) return null;
    return findCity(criteria.geo_reference_city, criteria.target_state || undefined);
  }, [criteria.geo_reference_city, criteria.target_state]);

  const filteredCompanies = useMemo(() => {
    let filtered = [...companies];
    if (criteria.target_sector) filtered = filtered.filter((c) => c.sector === criteria.target_sector);
    if (criteria.min_revenue) filtered = filtered.filter((c) => (c.revenue ?? 0) >= Number(criteria.min_revenue));
    if (criteria.max_revenue) filtered = filtered.filter((c) => (c.revenue ?? Infinity) <= Number(criteria.max_revenue));
    if (criteria.min_ebitda) filtered = filtered.filter((c) => (c.ebitda ?? 0) >= Number(criteria.min_ebitda));
    if (criteria.max_ebitda) filtered = filtered.filter((c) => (c.ebitda ?? Infinity) <= Number(criteria.max_ebitda));
    if (criteria.target_size) filtered = filtered.filter((c) => c.size === criteria.target_size);
    if (criteria.target_state) filtered = filtered.filter((c) => c.state === criteria.target_state);
    if (criteria.risk_level) filtered = filtered.filter((c) => c.risk_level === criteria.risk_level);
    if (!criteria.no_geo_limit && refCityData) {
      filtered = filtered.filter((c) => {
        if (c.latitude == null || c.longitude == null) return true;
        const dist = haversineDistance(refCityData.lat, refCityData.lng, c.latitude, c.longitude);
        return dist <= criteria.geo_radius_km;
      });
    }
    return filtered;
  }, [companies, criteria, refCityData]);

  const geoInfo = useMemo(() => {
    if (criteria.no_geo_limit || !refCityData) return null;
    const withCoords = filteredCompanies.filter((c) => c.latitude != null).length;
    const withoutCoords = filteredCompanies.filter((c) => c.latitude == null).length;
    return { withCoords, withoutCoords };
  }, [filteredCompanies, criteria.no_geo_limit, refCityData]);

  const refCitySuggestions = useMemo(() => {
    return criteria.target_state ? getCitiesByState(criteria.target_state) : BRAZILIAN_CITIES;
  }, [criteria.target_state]);

  const completenessStats = useMemo(() => {
    if (filteredCompanies.length === 0) return null;
    const scores = filteredCompanies.map((c) => calcCompleteness(c));
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const withCnpj = filteredCompanies.filter((c) => c.cnpj).length;
    return { avg, withCnpj, total: filteredCompanies.length };
  }, [filteredCompanies]);

  const runMatchMutation = useMutation({
    mutationFn: async () => {
      setProgressStep(0);
      const advanceProgress = (step: number) => setProgressStep(step);
      let companiesToAnalyze: any[] = [];

      if (searchSource === "nacional") {
        advanceProgress(1);
        const { data: nationalData, error: nationalError } = await supabase.functions.invoke("national-search", {
          body: {
            target_sector: criteria.target_sector || null,
            target_state: criteria.target_state || null,
            target_size: criteria.target_size || null,
            ...(nlExtraParams.cnae_prefixes && nlExtraParams.cnae_prefixes.length > 0 ? { cnae_prefixes: nlExtraParams.cnae_prefixes } : {}),
            ...(nlExtraParams.min_capital_social != null ? { min_capital_social: nlExtraParams.min_capital_social } : {}),
            ...(nlExtraParams.max_capital_social != null ? { max_capital_social: nlExtraParams.max_capital_social } : {}),
            ...(nlExtraParams.buyer_revenue_brl != null ? { buyer_revenue_brl: nlExtraParams.buyer_revenue_brl } : {}),
          },
        });
        if (nationalError) throw new Error(`Erro ao buscar Base Nacional: ${nationalError.message}`);
        if (nationalData?.error) throw new Error(`Erro na Base Nacional: ${nationalData.error}`);
        const rawCompanies: any[] = nationalData?.companies || [];
        // Correção 3: Deduplicação frontend por cnpj_basico (primeiros 8 dígitos)
        // Garante que mesmo se o BD retornar duplicatas, o usuário vê 1 empresa por grupo
        const seenBaseCnpj = new Set<string>();
        companiesToAnalyze = rawCompanies.filter((company: any) => {
          const baseCnpj = String(company.cnpj || "").replace(/\D/g, "").substring(0, 8);
          if (!baseCnpj || seenBaseCnpj.has(baseCnpj)) return false;
          seenBaseCnpj.add(baseCnpj);
          return true;
        });
        setNationalCompanies(companiesToAnalyze);
        setFunnelStats({ db_fetched: rawCompanies.length, pre_filtered: 0, ai_analyzed: 0, final_matches: 0 });
        if (companiesToAnalyze.length === 0) throw new Error("Nenhuma empresa encontrada na Base Nacional com esses critérios. Tente ampliar os filtros.");
      } else {
        if (filteredCompanies.length === 0) throw new Error("Nenhuma empresa corresponde aos seus critérios.");
        companiesToAnalyze = filteredCompanies.map((c) => {
          const dist = refCityData && c.latitude != null && c.longitude != null ? haversineDistance(refCityData.lat, refCityData.lng, c.latitude, c.longitude) : null;
          return { ...c, distance_km: dist ? Math.round(dist) : null };
        });
      }

      advanceProgress(2);
      const saveCriteria = {
        user_id: user!.id,
        target_sector: criteria.target_sector || null,
        target_size: criteria.target_size || null,
        target_location: criteria.target_state || null,
        min_revenue: criteria.min_revenue ? Number(criteria.min_revenue) : null,
        max_revenue: criteria.max_revenue ? Number(criteria.max_revenue) : null,
        min_ebitda: criteria.min_ebitda ? Number(criteria.min_ebitda) : null,
        max_ebitda: criteria.max_ebitda ? Number(criteria.max_ebitda) : null,
        notes: criteria.notes || null,
        geo_reference_city: criteria.geo_reference_city || null,
        geo_radius_km: criteria.no_geo_limit ? null : criteria.geo_radius_km,
        geo_latitude: refCityData?.lat ?? null,
        geo_longitude: refCityData?.lng ?? null,
      };
      await supabase.from("match_criteria").insert(saveCriteria);
      await supabase.from("matches").delete().eq("buyer_id", user!.id).eq("status", "new");

      // ── SCORING DETERMINÍSTICO LOCAL (zero chamadas de IA) ─────────────
      advanceProgress(3);
      const scored = companiesToAnalyze.map((company: any) => {
        const { compatibility_score, dimensions } = scoreCompanyLocal(company);
        return { company, compatibility_score, dimensions };
      });
      scored.sort((a, b) => {
        const scoreDiff = b.compatibility_score - a.compatibility_score;
        // Tier as tiebreaker when scores are within 5 points
        if (Math.abs(scoreDiff) < 5) {
          return (a.dimensions.tier_priority || 6) - (b.dimensions.tier_priority || 6);
        }
        return scoreDiff;
      });
      // Filter by minimum score threshold, then take top 200
      const qualified = scored.filter(s => s.compatibility_score >= 35);
      const top = qualified.slice(0, 200);
      setFunnelStats(prev => prev
        ? { ...prev, pre_filtered: scored.length, ai_analyzed: top.length, final_matches: 0 }
        : { db_fetched: companiesToAnalyze.length, pre_filtered: scored.length, ai_analyzed: top.length, final_matches: 0 }
      );

      // ── WEB VALIDATION: Perplexity + Google em paralelo ──
      advanceProgress(4);
      let webValidatedNames: { original: string; normalized: string; rank: number }[] = [];
      try {
        const sectorLabel = sectors.find(s => s.value === criteria.target_sector)?.label || criteria.target_sector || null;
        const webBody = {
          sector: sectorLabel || nlResult?.target_sector || "serviços",
          state: criteria.target_state || null,
          city: criteria.geo_reference_city || null,
        };
        const perplexityRes = await supabase.functions.invoke("perplexity-validate", { body: webBody }).catch(e => {
          console.warn("Perplexity validation failed:", e);
          return { data: null };
        });
        if (perplexityRes.data?.companies && Array.isArray(perplexityRes.data.companies)) {
          webValidatedNames = perplexityRes.data.companies;
        }
      } catch (e) {
        console.warn("Web validation failed (graceful degradation):", e);
      }

      // ── CROSS-REFERENCE: boost cumulativo DB + Perplexity + Google ──
      advanceProgress(5);
      const SIMILARITY_THRESHOLD = 0.65;
      for (const item of top) {
        const companyName = item.company.name || "";
        const companyRazao = item.company.razao_social || item.company.name || "";
        const normalizedCompany = normalizeNameForMatch(companyName);
        const normalizedRazao = normalizeNameForMatch(companyRazao);

        // Perplexity match (+15)
        for (const webEntry of webValidatedNames) {
          const sim = Math.max(
            bestMatchSimilarity(normalizedCompany, webEntry.normalized),
            bestMatchSimilarity(normalizedRazao, webEntry.normalized)
          );
          if (sim >= SIMILARITY_THRESHOLD) {
            item.dimensions.web_validated = true;
            item.dimensions.web_rank = webEntry.rank;
            item.dimensions.quality_score = Math.min(100, item.dimensions.quality_score + 15);
            break;
          }
        }

        // Recalculate final score if web validation matched
        if (item.dimensions.web_validated) {
          item.compatibility_score = Math.min(100, Math.max(0, Math.round(
            item.compatibility_score * 0.85 + item.dimensions.quality_score * 0.15
          )));
        }
      }
      // Re-sort after web validation boost
      top.sort((a, b) => {
        const scoreDiff = b.compatibility_score - a.compatibility_score;
        if (Math.abs(scoreDiff) < 5) {
          return (a.dimensions.tier_priority || 6) - (b.dimensions.tier_priority || 6);
        }
        return scoreDiff;
      });

      // ── PERSIST RESULTS ────────────────────────────────────────────────
      advanceProgress(6);
      let savedCount = 0;
      for (const { company, compatibility_score, dimensions } of top) {
        if (searchSource === "nacional") {
          const { data: savedCompany } = await supabase.from("companies").insert({
            user_id: user!.id,
            name: company.name,
            cnpj: company.cnpj,
            sector: company.sector,
            state: company.state,
            city: company.city,
            size: company.size,
            revenue: company.revenue,
            description: company.description,
            status: "active",
            risk_level: "medium",
          }).select().single();
          if (savedCompany) {
            await supabase.from("matches").insert({
              buyer_id: user!.id,
              seller_company_id: savedCompany.id,
              compatibility_score,
              ai_analysis: JSON.stringify({ analysis: null, dimensions, dimension_explanations: null, recommendation: null, strengths: [], weaknesses: [], source: "national_db", ai_enriched: false }),
              status: "new",
            });
            savedCount++;
          }
        } else {
          await supabase.from("matches").insert({
            buyer_id: user!.id,
            seller_company_id: company.id,
            compatibility_score,
            ai_analysis: JSON.stringify({ analysis: null, dimensions, dimension_explanations: null, recommendation: null, strengths: [], weaknesses: [], ai_enriched: false }),
            status: "new",
          });
          savedCount++;
        }
      }
      setFunnelStats(prev => prev ? { ...prev, final_matches: savedCount } : null);
      return savedCount;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["match_criteria"] });
      setActiveTab("results");
      setProgressStep(0);
      setVisibleCount(20);
      setWebFilterMode("all");
      const webCount = typeof count === "number" ? 0 : 0; // placeholder
      toast({ title: "Matching completo!", description: `${count} empresas encontradas e salvas. Clique em "Ver análise IA ✦" para enriquecer individualmente.` });
    },
    onError: (e: any) => {
      setProgressStep(0);
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("matches").update({ status }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["matches"] });
  };

  // Record user feedback for future neural model training
  const recordFeedback = async (
    matchId: string,
    companyId: string,
    actionType: "saved" | "ignored" | "contacted" | "rejected" | "clicked",
    rankPosition: number,
    rejectionReason?: string,
  ) => {
    setFeedbackLoading(prev => ({ ...prev, [matchId]: actionType }));
    try {
      await supabase.from("match_feedback").insert({
        user_id: user!.id,
        match_id: matchId,
        company_id: companyId,
        action_type: actionType,
        rank_position: rankPosition,
        rejection_reason: rejectionReason || null,
        criteria_snapshot: null,
      });
      // Also update match status for UI consistency
      if (actionType === "saved") await updateStatus(matchId, "saved");
      if (actionType === "ignored") await updateStatus(matchId, "dismissed");
    } catch (e) {
      console.error("Error recording feedback:", e);
    } finally {
      setFeedbackLoading(prev => {
        const next = { ...prev };
        delete next[matchId];
        return next;
      });
    }
  };

  // Analyze a single company with AI (on demand only)
  const analyzeOneCompany = async (match: MatchResult) => {
    if (!match.companies?.id) return;
    setAiEnrichingMatch(match.id);
    try {
      const currentAnalysis = (() => { try { return JSON.parse(match.ai_analysis || "{}"); } catch { return {}; } })();
      const { data, error } = await supabase.functions.invoke("ai-analyze", {
        body: {
          type: "match-single",
          data: {
            company: match.companies,
            criteria: { ...criteria, cnae_prefixes: nlExtraParams.cnae_prefixes || nlResult?.cnae_prefixes || [] },
            investor_profile: investorProfile,
            pre_score_dimensions: currentAnalysis.dimensions || null,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const result = data?.result || data;
      // Update the match record with AI enrichment
      const enriched = {
        ...currentAnalysis,
        analysis: (() => {
          const raw = result.analysis || result;
          const strip = (s: string) => s.trim().replace(/^```(?:json|javascript|typescript)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
          if (typeof raw === 'string') {
            const cleaned = strip(raw);
            // If after stripping it's JSON with an analysis field, extract just the text
            try {
              const inner = JSON.parse(cleaned);
              if (typeof inner === 'object' && inner !== null && typeof inner.analysis === 'string') return inner.analysis;
            } catch { /* not JSON, use cleaned string */ }
            return cleaned;
          }
          if (typeof raw === 'object' && raw !== null) {
            if (typeof (raw as any).analysis === 'string') return (raw as any).analysis;
            return JSON.stringify(raw);
          }
          return String(raw);
        })(),
        dimensions: result.dimensions || currentAnalysis.dimensions,
        dimension_explanations: result.dimension_explanations || null,
        recommendation: result.recommendation || null,
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || [],
        ai_enriched: true,
      };
      const newScore = result.compatibility_score || match.compatibility_score;
      await supabase.from("matches").update({
        ai_analysis: JSON.stringify(enriched),
        compatibility_score: newScore,
      }).eq("id", match.id);
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast({ title: "Análise IA concluída!", description: `${match.companies?.name} enriquecida com sucesso.` });
    } catch (e: any) {
      toast({ title: "Erro na análise IA", description: e.message, variant: "destructive" });
    } finally {
      setAiEnrichingMatch(null);
    }
  };

  // Enrich a single company with contact data (3 layers: DB + BrasilAPI + Perplexity)
  const enrichOneCompany = async (match: MatchResult) => {
    if (!match.companies) return;
    setEnrichingMatch(match.id);
    try {
      const cnpjRaw = match.companies.cnpj ? String(match.companies.cnpj).replace(/\D/g, "") : null;
      const { data, error } = await supabase.functions.invoke("company-enrich", {
        body: {
          company_name: match.companies.name,
          cnpj: cnpjRaw,
          cnpj_basico: cnpjRaw ? cnpjRaw.substring(0, 8) : null,
          sector: match.companies.sector,
          state: match.companies.state,
          city: match.companies.city,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const currentAnalysis = (() => { try { return JSON.parse(match.ai_analysis || "{}"); } catch { return {}; } })();
      const enriched = { ...currentAnalysis, contact_info: data };
      await supabase.from("matches").update({ ai_analysis: JSON.stringify(enriched) }).eq("id", match.id);
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast({ title: "Enriquecimento concluído!", description: `${data.sources?.length || 0} fontes consultadas · ${data.owners?.length || 0} sócios encontrados` });
    } catch (e: any) {
      toast({ title: "Erro no enriquecimento", description: e.message, variant: "destructive" });
    } finally {
      setEnrichingMatch(null);
    }
  };

  const stripCodeFences = (s: string): string => {
    let t = s.trim();
    t = t.replace(/^```(?:json|javascript|typescript)?\s*\n?/, '');
    t = t.replace(/\n?```\s*$/, '');
    return t.trim();
  };

  const extractAnalysisText = (val: unknown): string => {
    if (!val) return "";
    if (typeof val === "string") {
      // Strip code fences first (AI often wraps in ```json ... ```)
      const trimmed = stripCodeFences(val);
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          const inner = JSON.parse(trimmed);
          if (typeof inner === "object" && inner !== null) {
            if (typeof inner.analysis === "string") return inner.analysis;
            // Build readable text from known fields
            const parts: string[] = [];
            if (inner.recommendation) parts.push(inner.recommendation);
            if (inner.strengths?.length) parts.push("Pontos fortes: " + inner.strengths.join(", "));
            if (inner.weaknesses?.length) parts.push("Pontos fracos: " + inner.weaknesses.join(", "));
            if (parts.length > 0) return parts.join("\n\n");
          }
          return typeof inner === "string" ? inner : "";
        } catch { /* not JSON, return as-is */ }
      }
      return val;
    }
    if (typeof val === "object" && val !== null) {
      const obj = val as Record<string, unknown>;
      if (typeof obj.analysis === "string") return obj.analysis;
      return "";
    }
    return String(val);
  };

  const parseAnalysis = (raw: string | null): { analysis: string; dimensions: MatchDimensions | null; dimension_explanations: DimensionExplanations | null; recommendation: string; strengths: string[]; weaknesses: string[]; ai_enriched: boolean } => {
    if (!raw) return { analysis: "", dimensions: null, dimension_explanations: null, recommendation: "", strengths: [], weaknesses: [], ai_enriched: false };
    try {
      const cleanedRaw = stripCodeFences(raw);
      const parsed = JSON.parse(cleanedRaw);
      return {
        analysis: extractAnalysisText(parsed.analysis),
        dimensions: parsed.dimensions || null,
        dimension_explanations: parsed.dimension_explanations || null,
        recommendation: parsed.recommendation || "",
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        ai_enriched: parsed.ai_enriched === true,
      };
    } catch {
      return { analysis: raw, dimensions: null, dimension_explanations: null, recommendation: "", strengths: [], weaknesses: [], ai_enriched: false };
    }
  };

  const displayMatches = useMemo(() => {
    let result = [...matches];
    if (statusFilter !== "all") result = result.filter((m) => m.status === statusFilter);
    result = result.filter((m) => Number(m.compatibility_score) >= minScoreFilter[0]);
    if (webFilterMode !== "all") {
      result = result.filter((m) => {
        try {
          const parsed = JSON.parse(m.ai_analysis || "{}");
          return parsed.dimensions?.web_validated === true;
        } catch { return false; }
      });
    }
    return result;
  }, [matches, statusFilter, minScoreFilter, webFilterMode]);

  const paginatedMatches = useMemo(() => {
    return displayMatches.slice(0, visibleCount);
  }, [displayMatches, visibleCount]);

  const scoreDistribution = useMemo(() => {
    const buckets = [
      { range: "0-20", count: 0 }, { range: "21-40", count: 0 }, { range: "41-60", count: 0 },
      { range: "61-80", count: 0 }, { range: "81-100", count: 0 },
    ];
    matches.forEach((m) => {
      const s = Number(m.compatibility_score);
      if (s <= 20) buckets[0].count++;
      else if (s <= 40) buckets[1].count++;
      else if (s <= 60) buckets[2].count++;
      else if (s <= 80) buckets[3].count++;
      else buckets[4].count++;
    });
    return buckets;
  }, [matches]);

  const sectorDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    matches.forEach((m) => { const s = sectorLabel(m.companies?.sector || null); map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [matches]);

  const avgScore = useMemo(() => {
    if (matches.length === 0) return 0;
    return Math.round(matches.reduce((sum, m) => sum + Number(m.compatibility_score), 0) / matches.length);
  }, [matches]);

  const highMatches = matches.filter((m) => Number(m.compatibility_score) >= 70).length;
  const medMatches = matches.filter((m) => Number(m.compatibility_score) >= 40 && Number(m.compatibility_score) < 70).length;
  const lowMatches = matches.filter((m) => Number(m.compatibility_score) < 40).length;

  const loadCriteria = (saved: any) => {
    setCriteria({
      target_sector: saved.target_sector || "",
      target_size: saved.target_size || "",
      target_state: saved.target_location || "",
      geo_reference_city: saved.geo_reference_city || "",
      geo_radius_km: saved.geo_radius_km || 500,
      no_geo_limit: !saved.geo_radius_km,
      min_revenue: saved.min_revenue?.toString() || "",
      max_revenue: saved.max_revenue?.toString() || "",
      min_ebitda: saved.min_ebitda?.toString() || "",
      max_ebitda: saved.max_ebitda?.toString() || "",
      risk_level: "",
      notes: saved.notes || "",
    });
    toast({ title: "Critérios carregados" });
  };

  const clearCriteria = () => {
    setCriteria({
      target_sector: "", target_size: "", target_state: "", geo_reference_city: "",
      geo_radius_km: 500, no_geo_limit: true, min_revenue: "", max_revenue: "",
      min_ebitda: "", max_ebitda: "", risk_level: "", notes: "",
    });
    setInvestorProfile("Moderado");
    setWizardStep(1);
  };

  // ── REVERSE MATCHING: Find buyers for a seller ──────────────────────────
  const runBuyerSearch = async () => {
    setBuyerSearchLoading(true);
    setProgressStep(0);
    try {
      // Step 1: AI analysis — parse seller intent to get buyer profiles
      setProgressStep(1);
      const sellerPayload = {
        name: sellerData.name,
        cnpj: sellerData.cnpj,
        cnae: sellerData.cnae,
        sector: sellerData.sector,
        state: sellerData.state,
        city: sellerData.city,
        revenue: sellerData.revenue ? Number(sellerData.revenue) : null,
        ebitda: sellerData.ebitda ? Number(sellerData.ebitda) : null,
        asking_price: sellerData.asking_price ? Number(sellerData.asking_price) : null,
        description: sellerData.description,
      };

      const { data: aiData, error: aiError } = await supabase.functions.invoke("ai-analyze", {
        body: { type: "parse-seller-intent", data: { seller: sellerPayload } },
      });
      if (aiError) throw new Error(`Erro na análise IA: ${aiError.message}`);
      if (aiData?.error) throw new Error(aiData.error);

      const parsed = aiData?.result || aiData;
      const profiles: BuyerProfile[] = parsed.buyer_profiles || [];
      setBuyerProfiles(profiles);
      setInvestmentThesis(parsed.investment_thesis || "");

      if (profiles.length === 0) throw new Error("A IA não encontrou perfis de compradores. Tente adicionar mais detalhes sobre o vendedor.");

      // Step 2: Search national DB for each buyer profile
      setProgressStep(2);
      const allBuyers: any[] = [];
      const askingPrice = Number(sellerData.asking_price) || 0;

      for (const profile of profiles) {
        const { data: searchData, error: searchError } = await supabase.functions.invoke("national-search", {
          body: {
            mode: "find-buyers",
            cnae_prefixes: profile.cnae_prefixes,
            target_state: profile.search_nationwide ? null : (sellerData.state || null),
            min_capital_social: profile.min_capital_social || (askingPrice > 0 ? askingPrice * 0.3 : 100_000),
            seller_asking_price: askingPrice || null,
            limit: 500,
          },
        });
        if (searchError) {
          console.warn(`Search error for profile ${profile.label}:`, searchError);
          continue;
        }
        const companies = searchData?.companies || [];
        // Tag each company with the strategy
        companies.forEach((c: any) => {
          c._buyer_strategy = profile.strategy;
          c._buyer_label = profile.label;
          c._buyer_motivation = profile.motivation;
        });
        allBuyers.push(...companies);
      }

      // Deduplicate by cnpj_basico
      const seenBaseCnpj = new Set<string>();
      const uniqueBuyers = allBuyers.filter((c: any) => {
        const baseCnpj = String(c.cnpj || "").replace(/\D/g, "").substring(0, 8);
        if (!baseCnpj || seenBaseCnpj.has(baseCnpj)) return false;
        seenBaseCnpj.add(baseCnpj);
        return true;
      });

      if (uniqueBuyers.length === 0) throw new Error("Nenhum comprador potencial encontrado. Tente ajustar os dados do vendedor.");

      // Step 3: Score buyers (Buyer Fit Score)
      setProgressStep(3);
      const scored = uniqueBuyers.map((buyer: any) => {
        const capitalSocial = buyer.revenue ? buyer.revenue / 2 : null; // reverse of revenue = capital * 2
        const actualCapital = capitalSocial ? capitalSocial : null;

        // Capacity Fit: can the buyer afford the asking price?
        let capacity_fit = 50;
        if (actualCapital && askingPrice > 0) {
          const ratio = actualCapital / askingPrice;
          if (ratio >= 5) capacity_fit = 95;
          else if (ratio >= 3) capacity_fit = 85;
          else if (ratio >= 1.5) capacity_fit = 70;
          else if (ratio >= 0.5) capacity_fit = 55;
          else capacity_fit = 30;
        }

        // Sector Fit
        const sellerCnae = sellerData.cnae || "";
        const buyerCnae = buyer.description?.match(/CNAE: (\d+)/)?.[1] || "";
        let sector_fit = 40;
        if (sellerCnae && buyerCnae) {
          if (buyerCnae.startsWith(sellerCnae.substring(0, 4))) sector_fit = 95;
          else if (buyerCnae.startsWith(sellerCnae.substring(0, 2))) sector_fit = 80;
          else if (buyer._buyer_strategy === "vertical") sector_fit = 70;
          else if (buyer._buyer_strategy === "diversification") sector_fit = 55;
        } else if (buyer.sector === sellerData.sector) {
          sector_fit = 80;
        }

        // Size Fit: buyer should be >= seller
        const sizeOrder = ["Startup", "Small", "Medium", "Large", "Enterprise"];
        const buyerSizeIdx = sizeOrder.indexOf(buyer.size || "Small");
        const sellerSizeIdx = sizeOrder.indexOf(sellerData.sector ? "Small" : "Small"); // infer from revenue
        let size_fit = 60;
        if (buyerSizeIdx > sellerSizeIdx) size_fit = 90;
        else if (buyerSizeIdx === sellerSizeIdx) size_fit = 70;
        else size_fit = 40;

        // Location Fit
        let location_fit = 50;
        if (sellerData.state && buyer.state === sellerData.state) {
          location_fit = 85;
          if (sellerData.city && buyer.city === sellerData.city) location_fit = 95;
        }

        // Strategic Fit (based on strategy type)
        let strategic_fit = 50;
        if (buyer._buyer_strategy === "horizontal") strategic_fit = 85;
        else if (buyer._buyer_strategy === "vertical") strategic_fit = 75;
        else if (buyer._buyer_strategy === "diversification") strategic_fit = 60;

        // Buyer Fit Score (weighted)
        const buyer_fit = Math.round(
          capacity_fit * 0.30 +
          sector_fit * 0.25 +
          size_fit * 0.15 +
          location_fit * 0.10 +
          strategic_fit * 0.20
        );

        return {
          company: buyer,
          compatibility_score: Math.min(100, buyer_fit),
          dimensions: {
            capacity_fit,
            sector_fit,
            size_fit: size_fit,
            location_fit,
            strategic_fit,
            financial_fit: capacity_fit,
            risk_fit: 55,
            revenue_synergy: strategic_fit,
            cost_synergy: 50,
            vertical_synergy: buyer._buyer_strategy === "vertical" ? 80 : 30,
            consolidation_synergy: buyer._buyer_strategy === "horizontal" ? 80 : 30,
            strategic_synergy: strategic_fit,
            synergy_type: buyer._buyer_strategy === "horizontal" ? "Consolidação" : buyer._buyer_strategy === "vertical" ? "Verticalização" : "Diversificação",
            gain_insights: [buyer._buyer_motivation || "Potencial comprador estratégico"],
            bottleneck_resolution: null,
            consolidator_score: buyer.num_filiais > 3 ? 80 : buyer.num_filiais > 1 ? 50 : 20,
            quality_score: 50,
            tier_priority: buyer._buyer_strategy === "horizontal" ? 1 : buyer._buyer_strategy === "vertical" ? 2 : 3,
            tier_label: buyer._buyer_label || "Comprador",
            web_validated: false,
            web_rank: null,
            google_validated: false,
            google_rank: null,
          },
        };
      });

      scored.sort((a, b) => b.compatibility_score - a.compatibility_score);
      const top = scored.slice(0, 200);

      // Step 4: Save results
      setProgressStep(5);
      await supabase.from("matches").delete().eq("buyer_id", user!.id).eq("status", "new");

      let savedCount = 0;
      for (const { company, compatibility_score, dimensions } of top) {
        const { data: savedCompany } = await supabase.from("companies").insert({
          user_id: user!.id,
          name: company.name,
          cnpj: company.cnpj,
          sector: company.sector,
          state: company.state,
          city: company.city,
          size: company.size,
          revenue: company.revenue,
          description: company.description,
          status: "active",
          risk_level: "medium",
        }).select().single();
        if (savedCompany) {
          await supabase.from("matches").insert({
            buyer_id: user!.id,
            seller_company_id: savedCompany.id,
            compatibility_score,
            ai_analysis: JSON.stringify({
              analysis: `${dimensions.synergy_type}: ${company._buyer_motivation || "Comprador potencial identificado pela busca reversa"}`,
              dimensions,
              dimension_explanations: {
                financial_fit: `Capacidade financeira: capital social ${company.revenue ? `estimado R$${(company.revenue / 2 / 1e6).toFixed(1)}M` : "N/A"} vs asking price R$${(Number(sellerData.asking_price) / 1e6).toFixed(1)}M`,
                sector_fit: `Sinergia setorial: ${dimensions.synergy_type}`,
                size_fit: `Porte: ${company.size || "N/A"}`,
                location_fit: `Localização: ${company.city || ""}, ${company.state || ""}`,
                risk_fit: "Risco padrão",
              },
              recommendation: company._buyer_motivation || "",
              strengths: [dimensions.synergy_type, company._buyer_label || "Comprador potencial"],
              weaknesses: [],
              source: "reverse_matching",
              ai_enriched: false,
              buyer_strategy: company._buyer_strategy,
              buyer_label: company._buyer_label,
            }),
            status: "new",
          });
          savedCount++;
        }
      }

      setFunnelStats({
        db_fetched: allBuyers.length,
        pre_filtered: uniqueBuyers.length,
        ai_analyzed: top.length,
        final_matches: savedCount,
      });

      queryClient.invalidateQueries({ queryKey: ["matches"] });
      setActiveTab("results");
      setProgressStep(0);
      setVisibleCount(20);
      toast({
        title: "Busca de compradores concluída!",
        description: `${savedCount} compradores potenciais encontrados a partir de ${profiles.length} perfis estratégicos.`,
      });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
      setProgressStep(0);
    } finally {
      setBuyerSearchLoading(false);
    }
  };

  const shortlistCount = matches.filter(m => m.status === "saved").length;

  const formatCurrency = (val: number | null) => {
    if (val == null) return "N/A";
    if (val >= 1e9) return `R$${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `R$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `R$${(val / 1e3).toFixed(0)}K`;
    return `R$${val}`;
  };

  function extractCapitalFromDescription(desc: string | null): number | null {
    if (!desc) return null;
    const m = desc.match(/Capital Social:\s*R\$(\d+[\.,]?\d*)(K|M|B)?/i);
    if (!m) return null;
    const val = parseFloat(m[1].replace(",", "."));
    const unit = (m[2] || "").toUpperCase();
    if (unit === "B") return val * 1e9;
    if (unit === "M") return val * 1e6;
    if (unit === "K") return val * 1e3;
    return val;
  }

  function extractCnaeFromDescription(desc: string | null): string | null {
    if (!desc) return null;
    const m = desc.match(/CNAE:\s*([\d\-\/]+)/);
    return m ? m[1] : null;
  }

  // ── LOOKUP LOCAL DE INTENÇÃO (zero IA, zero custo) ──────────────────────
  const KEYWORD_MAP: Array<{ keywords: string[]; cnae_prefixes: string[]; sector: string; subtype: string; default_max_capital?: number }> = [
    { keywords: ["consultoria financeira", "gestão financeira", "assessoria financeira", "bpo financeiro", "cfoaas", "cfo as a service", "cfo ", "outsourcing financeiro", "terceirização financeira", "backoffice financeiro"], cnae_prefixes: ["6920", "70"], sector: "Finance", subtype: "Consulting" },
    { keywords: ["escritório contábil", "contabilidade", "contador", "auditoria"], cnae_prefixes: ["6920"], sector: "Finance", subtype: "Accounting" },
    { keywords: ["advocacia", "advogado", "escritório de advocacia", "jurídico", "direito"], cnae_prefixes: ["6911"], sector: "Other", subtype: "Legal" },
    { keywords: ["banco", "financeira", "crédito", "empréstimo", "fintec", "fintech"], cnae_prefixes: ["64"], sector: "Finance", subtype: "Banking", default_max_capital: 100_000_000 },
    { keywords: ["seguro", "previdência", "seguradora"], cnae_prefixes: ["65"], sector: "Finance", subtype: "Insurance" },
    { keywords: ["corretora", "fundo", "gestora de investimentos", "asset", "mercado financeiro", "investimento"], cnae_prefixes: ["66"], sector: "Finance", subtype: "Investment" },
    { keywords: ["software", "tecnologia", "ti ", " ti,", "sistemas", "saas", "startup de tech", "desenvolvimento", "app", "aplicativo"], cnae_prefixes: ["62", "63"], sector: "Technology", subtype: "Software" },
    { keywords: ["saúde", "clínica", "hospital", "farmácia", "laboratório", "medicina", "odontologia", "dentista"], cnae_prefixes: ["86", "87", "88"], sector: "Healthcare", subtype: "Health" },
    { keywords: ["educação", "escola", "ensino", "cursos", "treinamento", "faculdade", "universidade"], cnae_prefixes: ["85"], sector: "Education", subtype: "Education" },
    { keywords: ["construção", "incorporação", "obra", "imóvel", "imobiliária", "construtora"], cnae_prefixes: ["41", "42", "43"], sector: "Real Estate", subtype: "Construction" },
    { keywords: ["logística", "transporte", "frete", "distribuição", "armazém", "estoque"], cnae_prefixes: ["49", "50", "51", "52"], sector: "Logistics", subtype: "Logistics" },
    { keywords: ["comércio", "varejo", "loja", "venda", "atacado", "distribuidora"], cnae_prefixes: ["45", "46", "47"], sector: "Retail", subtype: "Retail" },
    { keywords: ["agro", "agricultura", "pecuária", "fazenda", "agronegócio", "soja", "milho", "café"], cnae_prefixes: ["01", "02", "03"], sector: "Agribusiness", subtype: "Agro" },
    { keywords: ["energia", "elétrica", "solar", "geração", "eólica", "fotovoltaico"], cnae_prefixes: ["35"], sector: "Energy", subtype: "Energy", default_max_capital: 200_000_000 },
    // ISP first (specific 4-digit CNAEs) — must come before generic Telecom
    { keywords: ["provedor de internet", "isp", "fibra óptica", "internet residencial", "internet empresarial", "provedor regional", "provedora de internet", "link dedicado", "acesso à internet"], cnae_prefixes: ["6110", "6120", "6130", "6141", "6142", "6143", "6190"], sector: "Telecom", subtype: "ISP", default_max_capital: 50_000_000 },
    { keywords: ["telecom", "telecomunicações", "operadora", "telefonia", "fibra", "internet", "provedor"], cnae_prefixes: ["61"], sector: "Telecom", subtype: "Telecom", default_max_capital: 50_000_000 },
    { keywords: ["indústria", "manufatura", "fábrica", "industrial", "produção"], cnae_prefixes: ["10", "11", "12", "13", "14", "15", "16", "17", "18", "20", "22", "23", "24", "25"], sector: "Manufacturing", subtype: "Manufacturing" },
  ];

  const SECTOR_ADJACENCY: Record<string, string[]> = {
    "Finance": ["Technology", "Real Estate", "Other"],
    "Technology": ["Finance", "Telecom", "Education"],
    "Healthcare": ["Technology", "Education", "Other"],
    "Manufacturing": ["Logistics", "Energy", "Retail"],
    "Retail": ["Logistics", "Manufacturing", "Other"],
    "Logistics": ["Manufacturing", "Retail", "Agribusiness"],
    "Real Estate": ["Finance", "Manufacturing", "Other"],
    "Agribusiness": ["Logistics", "Manufacturing", "Energy"],
    "Education": ["Technology", "Healthcare", "Other"],
    "Energy": ["Manufacturing", "Agribusiness", "Other"],
    "Telecom": ["Technology", "Finance", "Other"],
    "Other": [],
  };

  // Matriz CNAE de Cadeia de Valor — Modelo Universal por Setor
  const CNAE_VALUE_CHAIN: Record<string, { upstream: string[]; downstream: string[]; cross_sell: string[] }> = {
    // ── Telecom / ISP ──
    "61":   { upstream: ["4221", "4321", "9512", "26"], downstream: ["6201", "6311", "6190"], cross_sell: ["80", "35"] },
    "6110": { upstream: ["4221", "4321", "9512", "26"], downstream: ["6201", "6311", "6190"], cross_sell: ["80", "35"] },
    "6120": { upstream: ["4221", "4321", "9512", "26"], downstream: ["6201", "6311", "6190"], cross_sell: ["80", "35"] },
    "6130": { upstream: ["4221", "4321", "9512", "26"], downstream: ["6201", "6311", "6190"], cross_sell: ["80", "35"] },
    "6190": { upstream: ["4221", "4321", "9512", "26"], downstream: ["6201", "6311", "6190"], cross_sell: ["80", "35"] },
    "4221": { upstream: ["26", "28"], downstream: ["61"], cross_sell: ["4321", "43"] },           // Infraestrutura telecom
    "9512": { upstream: ["26"], downstream: ["61", "6190"], cross_sell: ["4321", "43"] },         // Manutenção equip. telecom
    // ── Consultoria / BPO ──
    "69":   { upstream: ["6911", "6204"], downstream: ["64", "66", "6499"], cross_sell: ["62", "73", "85"] },
    "6920": { upstream: ["6911", "6204"], downstream: ["64", "66", "6499"], cross_sell: ["62", "73", "85"] },
    "6911": { upstream: ["85"], downstream: ["69", "70"], cross_sell: ["64", "66"] },             // Advocacia societária
    "70":   { upstream: ["69", "6911"], downstream: ["64", "66", "6499"], cross_sell: ["62", "73", "85"] },
    "7020": { upstream: ["69", "6911"], downstream: ["64", "66", "6499"], cross_sell: ["62", "73", "85"] },
    // ── Software / TI ──
    "62":   { upstream: ["85"], downstream: ["63", "61"], cross_sell: ["73", "70"] },
    "63":   { upstream: ["62"], downstream: ["73", "70"], cross_sell: ["61", "64"] },
    "6204": { upstream: ["62"], downstream: ["69", "70"], cross_sell: ["73", "85"] },             // BI financeiro
    // ── Financeiro ──
    "64":   { upstream: ["62", "66"], downstream: ["65"], cross_sell: ["69", "70"] },
    "65":   { upstream: ["64", "66"], downstream: [], cross_sell: ["69", "70"] },
    "66":   { upstream: ["62"], downstream: ["64", "65"], cross_sell: ["69", "70"] },
    "6499": { upstream: ["69", "62"], downstream: ["64"], cross_sell: ["66", "70"] },             // Crédito estruturado
    // ── Saúde ──
    "86":   { upstream: ["21", "32"], downstream: ["65", "87", "88"], cross_sell: ["62", "85"] },
    "87":   { upstream: ["86", "21"], downstream: ["65"], cross_sell: ["88", "85"] },
    "88":   { upstream: ["86"], downstream: ["65"], cross_sell: ["87", "85"] },
    "21":   { upstream: ["20"], downstream: ["86", "47"], cross_sell: ["32", "72"] },             // Farmacêutica
    "32":   { upstream: ["24", "25"], downstream: ["86"], cross_sell: ["21", "71"] },             // Equipamentos médicos
    // ── Educação ──
    "85":   { upstream: ["58", "62"], downstream: ["73"], cross_sell: ["86", "63"] },
    "8511": { upstream: ["58", "62"], downstream: ["73"], cross_sell: ["86", "63"] },
    "8599": { upstream: ["58", "62"], downstream: ["73"], cross_sell: ["86", "63"] },
    // ── Agronegócio ──
    "01":   { upstream: ["20", "28"], downstream: ["10", "46"], cross_sell: ["35", "49"] },
    "02":   { upstream: ["20", "28"], downstream: ["10", "46"], cross_sell: ["35", "49"] },
    "03":   { upstream: ["20", "28"], downstream: ["10", "46"], cross_sell: ["35", "49"] },
    // ── Indústria / Alimentos ──
    "10":   { upstream: ["01", "20"], downstream: ["46", "47"], cross_sell: ["49", "52"] },
    "20":   { upstream: ["07", "08"], downstream: ["01", "10", "21"], cross_sell: ["28", "71"] },
    "22":   { upstream: ["20"], downstream: ["25", "29"], cross_sell: ["24", "28"] },
    "23":   { upstream: ["08"], downstream: ["41", "42"], cross_sell: ["24", "71"] },
    "24":   { upstream: ["07", "08"], downstream: ["25", "29"], cross_sell: ["28", "71"] },
    "25":   { upstream: ["24"], downstream: ["28", "29"], cross_sell: ["33", "71"] },
    "28":   { upstream: ["24", "25"], downstream: ["01", "10", "35"], cross_sell: ["33", "71"] },
    "29":   { upstream: ["24", "25", "22"], downstream: ["45", "49"], cross_sell: ["30", "33"] },
    // ── Construção ──
    "41":   { upstream: ["23", "24", "25"], downstream: ["68"], cross_sell: ["43", "71"] },
    "43":   { upstream: ["23", "25"], downstream: ["41", "61"], cross_sell: ["71", "42"] },
    // ── Energia ──
    "35":   { upstream: ["26", "28"], downstream: ["43"], cross_sell: ["42", "71"] },
    // ── Varejo ──
    "45":   { upstream: ["29", "30"], downstream: [], cross_sell: ["49", "64"] },
    "46":   { upstream: ["10", "20", "22"], downstream: ["47"], cross_sell: ["49", "52"] },
    "47":   { upstream: ["46"], downstream: ["62"], cross_sell: ["49", "73"] },
    // ── Logística ──
    "49":   { upstream: ["29", "30"], downstream: ["52"], cross_sell: ["64", "73"] },
    "52":   { upstream: ["41", "43"], downstream: ["01", "10", "46"], cross_sell: ["49", "62"] }, // Armazenagem
    // ── Marketing / Publicidade ──
    "73":   { upstream: ["62", "63"], downstream: ["47", "85"], cross_sell: ["70", "69"] },
  };

  // ── SECTOR BOTTLENECK MAP ──────────────────────────────────────────────
  const SECTOR_BOTTLENECK_MAP: Record<string, { resolucoes: Record<string, string> }> = {
    "61": {
      resolucoes: {
        "80": "Reduz churn via cross-sell de CFTV/segurança",
        "43": "Reduz custo de instalação internalizando equipe de campo",
        "61": "Elimina concorrente direto na mesma região",
        "35": "Cross-sell de energia solar na base existente",
        "62": "Automatiza gestão de rede e NOC — reduz custo operacional",
      },
    },
    "69": {
      resolucoes: {
        "62": "Automatiza entregas via software próprio — reduz dependência de pessoas",
        "69": "Aumenta base de clientes e dilui concentração",
        "73": "Canal de aquisição próprio via marketing",
        "85": "Gera autoridade e canal via educação corporativa",
      },
    },
    "6920": {
      resolucoes: {
        "62": "Automatiza entregas via software próprio — reduz dependência de pessoas",
        "69": "Aumenta base de clientes e dilui concentração",
        "73": "Canal de aquisição próprio via marketing",
        "85": "Gera autoridade e canal via educação corporativa",
        "70": "Amplia oferta de gestão empresarial — ticket médio maior",
      },
    },
    "62": {
      resolucoes: {
        "73": "Reduz CAC via canal de marketing integrado",
        "85": "Canal de aquisição via educação/treinamento",
        "62": "Consolida base de clientes e reduz concorrência",
        "63": "Monetiza dados como novo produto",
      },
    },
    "64": {
      resolucoes: {
        "62": "Plataforma digital própria — reduz custo de canal",
        "66": "Amplia oferta de produtos financeiros",
        "69": "Internaliza compliance e back-office",
        "73": "Reduz custo de aquisição de clientes",
      },
    },
    "86": {
      resolucoes: {
        "62": "Digitaliza prontuários e agendamento — reduz overhead",
        "85": "Canal de educação continuada para profissionais",
        "21": "Internaliza insumos farmacêuticos — reduz custo",
        "86": "Aumenta capacidade e dilui custos fixos",
      },
    },
    "47": {
      resolucoes: {
        "49": "Internaliza logística — reduz frete e prazo",
        "73": "Marketing integrado — reduz CAC",
        "62": "E-commerce e gestão digital — amplia canal",
        "46": "Verticaliza compras — melhora margem",
      },
    },
    "41": {
      resolucoes: {
        "43": "Internaliza mão de obra de instalação — reduz custo",
        "23": "Verticaliza insumos de construção",
        "71": "Internaliza projetos de engenharia",
        "68": "Captura margem imobiliária downstream",
      },
    },
    "85": {
      resolucoes: {
        "62": "Plataforma EAD própria — escala sem custo linear",
        "73": "Marketing digital integrado — reduz custo de captação",
        "63": "Monetiza dados educacionais",
        "85": "Consolida unidades e dilui overhead",
      },
    },
    "49": {
      resolucoes: {
        "62": "Gestão de frota e roteirização digital",
        "52": "Internaliza armazenagem — reduz dependência",
        "49": "Consolida rotas e reduz ociosidade",
        "64": "Fintech de frete — novo canal de receita",
      },
    },
    // ── Novos setores ──
    "01": {
      resolucoes: {
        "52": "Internaliza armazenagem — reduz perda e custo logístico",
        "49": "Controla logística própria — independência operacional",
        "10": "Captura margem de beneficiamento — verticaliza produção",
        "28": "Reduz custo de maquinário via verticalização",
        "20": "Internaliza insumos agrícolas — reduz dependência",
      },
    },
    "10": {
      resolucoes: {
        "01": "Verticaliza matéria-prima — segurança de suprimento",
        "46": "Canal atacado direto — elimina intermediário",
        "49": "Reduz frete internalizando logística",
        "52": "Internaliza armazenagem — reduz perda",
        "47": "Canal varejo próprio — captura margem final",
      },
    },
    "35": {
      resolucoes: {
        "43": "Internaliza instalação — reduz custo de implantação",
        "26": "Verticaliza equipamentos — reduz dependência de fornecedor",
        "73": "Reduz CAC via marketing integrado",
        "28": "Internaliza produção de equipamentos",
        "62": "Plataforma digital de gestão energética",
      },
    },
    "70": {
      resolucoes: {
        "62": "Plataforma digital própria — escala sem custo linear",
        "69": "Amplia oferta contábil — ticket médio maior",
        "73": "Canal marketing integrado — reduz custo de captação",
        "85": "Canal de autoridade via educação executiva",
        "64": "Amplia oferta com produtos financeiros",
      },
    },
    "66": {
      resolucoes: {
        "62": "Plataforma digital — reduz custo operacional",
        "69": "Back-office integrado — compliance e contabilidade",
        "73": "Canal de captação — reduz custo de aquisição",
        "85": "Educação financeira como canal de aquisição",
        "70": "Gestão integrada — amplia oferta de advisory",
      },
    },
  };

  const SYNERGY_PROFILE_WEIGHTS: Record<string, Record<string, number>> = {
    "Agressivo":    { revenue: 0.30, cost: 0.15, vertical: 0.25, consolidation: 0.20, strategic: 0.10 },
    "Moderado":     { revenue: 0.25, cost: 0.20, vertical: 0.20, consolidation: 0.20, strategic: 0.15 },
    "Conservador":  { revenue: 0.15, cost: 0.30, vertical: 0.15, consolidation: 0.15, strategic: 0.25 },
  };

  // Ajuste de pesos baseado nos gargalos do comprador
  const BOTTLENECK_ADJUSTMENTS: Record<string, Record<string, number>> = {
    "revenue":  { revenue: 0.15, cost: -0.05, vertical: -0.03, consolidation: -0.03, strategic: -0.04 },
    "cost":     { revenue: -0.05, cost: 0.15, vertical: -0.03, consolidation: -0.03, strategic: -0.04 },
    "supplier": { revenue: -0.03, cost: -0.03, vertical: 0.15, consolidation: -0.04, strategic: -0.05 },
    "geo":      { revenue: -0.04, cost: -0.04, vertical: -0.04, consolidation: -0.03, strategic: 0.15 },
    "value":    { revenue: -0.03, cost: -0.03, vertical: -0.02, consolidation: 0.10, strategic: 0.08 },
  };

  // Legacy weights kept for backward compatibility
  const PROFILE_WEIGHTS: Record<string, Record<string, number>> = {
    "Agressivo": { sector: 0.30, size: 0.25, financial: 0.20, location: 0.15, risk: 0.10 },
    "Moderado":  { sector: 0.20, size: 0.20, financial: 0.25, location: 0.20, risk: 0.15 },
    "Conservador": { sector: 0.15, size: 0.15, financial: 0.30, location: 0.10, risk: 0.30 },
  };

  function parseIntentLocal(text: string) {
    const lower = text.toLowerCase();
    const revenueMatch = lower.match(/r?\$?\s*(\d+[\.,]?\d*)\s*(m|mi|milhão|milhões|k|mil|b|bi|bilh)/i);
    let buyerRevenueBrl: number | null = null;
    if (revenueMatch) {
      const val = parseFloat(revenueMatch[1].replace(",", "."));
      const unit = revenueMatch[2].toLowerCase();
      if (unit.startsWith("b")) buyerRevenueBrl = val * 1e9;
      else if (unit.startsWith("m")) buyerRevenueBrl = val * 1e6;
      else if (unit.startsWith("k") || unit === "mil") buyerRevenueBrl = val * 1e3;
    }
    const matched = KEYWORD_MAP.find(entry => entry.keywords.some(kw => lower.includes(kw)));
    const maxCapital = buyerRevenueBrl ? buyerRevenueBrl * 0.5 : (matched?.default_max_capital ?? null);
    const target_size = lower.includes("startup") ? "Startup" : lower.includes("pequen") ? "Small" : lower.includes("médi") ? "Medium" : lower.includes("grande") ? "Large" : "Small";
    return {
      target_sector: matched?.sector || null,
      cnae_prefixes: matched?.cnae_prefixes || [],
      cnae_subtype: matched?.subtype || null,
      target_size,
      buyer_revenue_brl: buyerRevenueBrl,
      max_capital_social_brl: maxCapital,
      min_capital_social_brl: 10_000,
      intent: lower.includes("adquir") || lower.includes("comprar") ? "acquisition" : lower.includes("parceri") ? "partnership" : "acquisition",
      suggested_notes: matched ? `${matched.subtype || matched.sector} (CNAE ${matched.cnae_prefixes.map(p => `${p}xx`).join("/")})` : "",
      human_readable_summary: `${matched?.subtype || matched?.sector || "Empresa"} (CNAE ${matched?.cnae_prefixes?.map(p => `${p}xx`).join("/") || "N/A"}) · ${buyerRevenueBrl ? `Capital até R$${((maxCapital || 0) / 1e6).toFixed(1)}M` : ""}`,
    };
  }

  function scoreCompanyLocal(company: any) {
    const targetSector = criteria.target_sector || nlResult?.target_sector || null;
    const targetSize = criteria.target_size || nlResult?.target_size || null;
    const targetState = criteria.target_state || null;
    const cnaePrefixes: string[] = (nlExtraParams.cnae_prefixes || nlResult?.cnae_prefixes || []) as string[];
    const companyCnae = String(company.cnae_fiscal_principal || company.description?.match(/CNAE: (\d+)/)?.[1] || "");
    const buyerCnaePrefix = buyerCnae || (cnaePrefixes.length > 0 ? cnaePrefixes[0] : "");

    // ── Legacy dimensions (mantidos para compatibilidade) ──
    const sectorExact = targetSector && company.sector === targetSector;
    const sectorAdjacent = targetSector && SECTOR_ADJACENCY[targetSector]?.includes(company.sector);
    const cnaeBonus = cnaePrefixes.length > 0 && cnaePrefixes.some((p: string) => companyCnae.startsWith(p));
    const sector_fit = sectorExact ? 90 : cnaeBonus ? 75 : sectorAdjacent ? 65 : targetSector ? 30 : 60;

    const sizeOrder = ["Startup", "Small", "Medium", "Large", "Enterprise"];
    const sizeDiff = targetSize ? Math.abs(sizeOrder.indexOf(company.size || "") - sizeOrder.indexOf(targetSize)) : 0;
    const size_fit = !targetSize ? 60 : sizeDiff === 0 ? 95 : sizeDiff === 1 ? 75 : sizeDiff === 2 ? 50 : 25;
    const location_fit = !targetState ? 60 : company.state === targetState ? 90 : 45;
    const financial_fit = company.revenue && company.ebitda ? 70 : company.revenue ? 60 : 50;
    const risk_fit = 55;

    // ── SYNERGY SCORE: 5 pilares ──────────────────────────────────────────
    // Helpers
    const sameState = targetState ? company.state === targetState : false;
    const sameCity = criteria.geo_reference_city ? company.city === criteria.geo_reference_city : false;
    const sameCnae4 = buyerCnaePrefix && companyCnae.startsWith(buyerCnaePrefix.substring(0, 4));
    const sameCnae2 = buyerCnaePrefix && companyCnae.startsWith(buyerCnaePrefix.substring(0, 2));
    const buyerSizeIdx = sizeOrder.indexOf(targetSize || "Medium");
    const targetSizeIdx = sizeOrder.indexOf(company.size || "Small");

    // Lookup na cadeia de valor
    const findChain = (prefix: string) => {
      if (CNAE_VALUE_CHAIN[prefix]) return CNAE_VALUE_CHAIN[prefix];
      const short = prefix.substring(0, 2);
      return CNAE_VALUE_CHAIN[short] || null;
    };
    const buyerChain = buyerCnaePrefix ? findChain(buyerCnaePrefix) : null;
    const companyCnae2 = companyCnae.substring(0, 2);

    const isUpstream = buyerChain?.upstream?.some(u => companyCnae.startsWith(u)) || false;
    const isDownstream = buyerChain?.downstream?.some(d => companyCnae.startsWith(d)) || false;
    const isCrossSell = buyerChain?.cross_sell?.some(cs => companyCnae.startsWith(cs)) || false;

    // Capital social do target
    const targetCapital = extractCapitalFromDescription(company.description);
    const buyerRevNum = Number(buyerRevenueBrl) || 0;
    const capitalRatio = (targetCapital && buyerRevNum > 0) ? buyerRevNum / targetCapital : null;

    // 1. Revenue Synergy (0-100)
    let revenue_synergy = 0;
    if (isCrossSell) revenue_synergy += 40;
    if (sameState) revenue_synergy += 20;
    if (sizeDiff <= 1) revenue_synergy += 20;
    if (isDownstream) revenue_synergy += 20;

    // 2. Cost Synergy (0-100)
    let cost_synergy = 0;
    if (sameCnae2) cost_synergy += 40;
    if (sameCity) cost_synergy += 30;
    else if (sameState) cost_synergy += 15;
    if (sizeDiff === 0) cost_synergy += 20;
    if (capitalRatio && capitalRatio < 3) cost_synergy += 10;

    // 3. Vertical Integration (0-100)
    let vertical_synergy = 0;
    if (isUpstream) vertical_synergy += 50;
    if (isDownstream) vertical_synergy += 40;
    if (sameState) vertical_synergy += 10;

    // 4. Consolidation (0-100)
    let consolidation_synergy = 0;
    if (sameCnae4) consolidation_synergy += 40;
    if (targetSizeIdx < buyerSizeIdx) consolidation_synergy += 25;
    if (targetCapital && targetCapital < 500_000) consolidation_synergy += 20;
    if (sameState) consolidation_synergy += 15;

    // 5. Strategic (0-100)
    let strategic_synergy = 0;
    if (targetState && company.state && company.state !== targetState) strategic_synergy += 30;
    if (sectorAdjacent) strategic_synergy += 25;
    if (targetCapital && targetCapital > 100_000 && targetCapital < 5_000_000) strategic_synergy += 25;
    if (!sameCnae2 && !sectorExact) strategic_synergy += 20;

    // Cap all at 100
    revenue_synergy = Math.min(100, revenue_synergy);
    cost_synergy = Math.min(100, cost_synergy);
    vertical_synergy = Math.min(100, vertical_synergy);
    consolidation_synergy = Math.min(100, consolidation_synergy);
    strategic_synergy = Math.min(100, strategic_synergy);

    // Pesos baseados em perfil + gargalos
    const baseWeights = { ...(SYNERGY_PROFILE_WEIGHTS[investorProfile] || SYNERGY_PROFILE_WEIGHTS["Moderado"]) };
    for (const bn of buyerBottlenecks) {
      const adj = BOTTLENECK_ADJUSTMENTS[bn];
      if (adj) {
        for (const key of Object.keys(baseWeights)) {
          baseWeights[key] = Math.max(0.05, (baseWeights[key] || 0) + (adj[key] || 0));
        }
      }
    }
    // Normalize weights to sum to 1
    const wSum = Object.values(baseWeights).reduce((a, b) => a + b, 0);
    for (const key of Object.keys(baseWeights)) baseWeights[key] /= wSum;

    let synergy_score = Math.round(
      revenue_synergy * baseWeights.revenue +
      cost_synergy * baseWeights.cost +
      vertical_synergy * baseWeights.vertical +
      consolidation_synergy * baseWeights.consolidation +
      strategic_synergy * baseWeights.strategic
    );

    // Label = pilar dominante
    const pillars = [
      { key: "Sinergia de Receita", val: revenue_synergy },
      { key: "Redução de Custo", val: cost_synergy },
      { key: "Verticalização", val: vertical_synergy },
      { key: "Consolidação", val: consolidation_synergy },
      { key: "Estratégica", val: strategic_synergy },
    ];
    const synergy_type = pillars.reduce((a, b) => b.val > a.val ? b : a).key;

    const compatibility_score_legacy = Math.min(100, Math.max(0, synergy_score)); // kept for reference only

    // ── GPI: Gain Potential Index — frases de valor ──
    const gain_insights: string[] = [];
    if (revenue_synergy > 60 && isCrossSell) gain_insights.push("Cross-sell direto na base de clientes existente");
    if (revenue_synergy > 60 && isDownstream) gain_insights.push("Captura margem do canal de distribuição");
    if (cost_synergy > 60 && sameCity) gain_insights.push("Redução de estrutura duplicada na mesma praça");
    if (cost_synergy > 60 && sameCnae2 && !sameCity) gain_insights.push("Diluição de overhead operacional — mesmo setor");
    if (vertical_synergy > 60 && isUpstream) gain_insights.push("Internaliza fornecedor crítico — reduz dependência operacional");
    if (vertical_synergy > 60 && isDownstream) gain_insights.push("Captura margem do canal de distribuição");
    if (consolidation_synergy > 60 && sameCnae4) gain_insights.push("Consolidação horizontal — dilui overhead e aumenta market share");
    if (strategic_synergy > 60 && targetState && company.state && company.state !== targetState) gain_insights.push("Diversificação geográfica — reduz concentração de receita");
    if (consolidation_synergy > 50 && targetSizeIdx < buyerSizeIdx) gain_insights.push("Alvo menor — integração operacional simplificada");
    // Deduplicate
    const uniqueInsights = [...new Set(gain_insights)].slice(0, 3);

    // ── BOTTLENECK RESOLUTION — cruza gargalo do buyer com CNAE do seller ──
    let bottleneck_resolution: string | null = null;
    if (buyerCnaePrefix && buyerBottlenecks.length > 0) {
      const sectorMap = SECTOR_BOTTLENECK_MAP[buyerCnaePrefix] || SECTOR_BOTTLENECK_MAP[buyerCnaePrefix.substring(0, 2)];
      if (sectorMap) {
        // Try matching seller CNAE against resolutions
        const sellerCnae2 = companyCnae.substring(0, 2);
        const sellerCnae4 = companyCnae.substring(0, 4);
        const resolution = sectorMap.resolucoes[sellerCnae4] || sectorMap.resolucoes[sellerCnae2];
        if (resolution) {
          bottleneck_resolution = resolution;
        }
      }
    }

    // ── CONSOLIDATOR LIKELIHOOD SCORE (Phase 2) ──
    let consolidator_score = 0;
    // Porte "05" (Demais) = empresa maior
    const porte = company.porte || company.porte_empresa || null;
    if (porte === "05" || porte === "DEMAIS") consolidator_score += 20;
    // Capital social alto
    if (targetCapital && targetCapital > 1_000_000) consolidator_score += 10;
    // Capital > 2x average (proxy: > 500K for small sectors)
    if (targetCapital && targetCapital > 500_000) consolidator_score += 10;
    // Nome fantasia presente = mais estruturada
    const nomeFantasia = company.nome_fantasia || company.trade_name || null;
    if (nomeFantasia && nomeFantasia.trim() !== "" && nomeFantasia !== "0" && nomeFantasia !== company.name) consolidator_score += 5;
    // Mesmo CNAE do buyer
    if (sameCnae4 || sameCnae2) consolidator_score += 10;
    // Phase 2: filiais e presença multi-UF (dados reais do banco nacional)
    const numFiliais = (company as any).num_filiais ?? 1;
    const numUfs = (company as any).num_ufs ?? 1;
    if (numFiliais > 3) consolidator_score += 25;
    else if (numFiliais > 1) consolidator_score += 10;
    if (numUfs > 1) consolidator_score += 20;
    consolidator_score = Math.min(100, consolidator_score);

    // ── CONSOLIDATOR BOOST — bonus universal no synergy_score ──
    if (consolidator_score > 85) synergy_score = Math.min(100, synergy_score + 10);
    else if (consolidator_score > 70) synergy_score = Math.min(100, synergy_score + 5);

    // ── QUALITY SCORE — qualidade empresarial (0-100) ──
    let quality_score = 0;
    if (targetCapital && targetCapital > 2_000_000) quality_score += 25;
    else if (targetCapital && targetCapital > 500_000) quality_score += 15;
    else if (targetCapital && targetCapital > 100_000) quality_score += 8;
    if (targetCapital && targetCapital >= 100_000 && targetCapital <= 50_000_000) quality_score += 15;
    const porteQ = company.porte || company.porte_empresa || company.size || null;
    const porteStr = String(porteQ || "").trim();
    if (porteStr === "05" || porteStr === "DEMAIS" || porteStr === "Medium" || porteStr === "Large" || porteStr === "Enterprise") quality_score += 15;
    const nomeFantasiaQ = company.nome_fantasia || company.trade_name || null;
    const razaoSocial = company.razao_social || company.name || "";
    if (nomeFantasiaQ && nomeFantasiaQ.trim() !== "" && nomeFantasiaQ !== "0" && nomeFantasiaQ.toLowerCase() !== razaoSocial.toLowerCase()) quality_score += 10;
    if (numFiliais > 5) quality_score += 25;
    else if (numFiliais > 1) quality_score += 15;
    if (numUfs > 1) quality_score += 10;
    quality_score = Math.min(100, quality_score);
    if ((!nomeFantasiaQ || nomeFantasiaQ.trim() === "" || nomeFantasiaQ === "0") && numFiliais <= 1) {
      quality_score = Math.min(30, quality_score);
    }
    if (targetCapital && targetCapital < 10_000) {
      quality_score = Math.min(10, quality_score);
    }

    // ── FINAL SCORE — sinergia (70%) + qualidade (30%) ──
    const compatibility_score = Math.min(100, Math.max(0, Math.round(synergy_score * 0.7 + quality_score * 0.3)));

    // ── TIER PRIORITY SYSTEM ──
    let tier_priority = 6;
    let tier_label = "Expansão Geográfica";
    if (sameCnae4 && sameCity) { tier_priority = 1; tier_label = "Consolidação Local"; }
    else if (sameCnae4 && sameState) { tier_priority = 2; tier_label = "Consolidação Regional"; }
    else if (sameCnae2 && sameState) { tier_priority = 2; tier_label = "Consolidação Regional"; }
    else if (isUpstream && sameState) { tier_priority = 3; tier_label = "Verticalização"; }
    else if (isUpstream) { tier_priority = 3; tier_label = "Verticalização"; }
    else if (isDownstream) { tier_priority = 4; tier_label = "Captura de Canal"; }
    else if (isCrossSell) { tier_priority = 5; tier_label = "Cross-sell"; }
    else if (targetState && company.state && company.state !== targetState) { tier_priority = 6; tier_label = "Expansão Geográfica"; }

    return {
      compatibility_score,
      dimensions: {
        sector_fit, size_fit, location_fit, financial_fit, risk_fit,
        revenue_synergy, cost_synergy, vertical_synergy, consolidation_synergy, strategic_synergy,
        synergy_type,
        gain_insights: uniqueInsights,
        bottleneck_resolution,
        consolidator_score,
        quality_score,
        tier_priority,
        tier_label,
        web_validated: false,
        web_rank: null,
        google_validated: false,
        google_rank: null,
      },
    };
  }
  // ── FIM DO SCORING DETERMINÍSTICO ────────────────────────────────────────

  const parseIntent = () => {
    if (!nlText.trim()) return;
    setNlParsing(true);
    try {
      const parsed = parseIntentLocal(nlText);
      setNlResult(parsed);
      setNlExtraParams({
        cnae_prefixes: parsed.cnae_prefixes,
        min_capital_social: parsed.min_capital_social_brl,
        max_capital_social: parsed.max_capital_social_brl,
        buyer_revenue_brl: parsed.buyer_revenue_brl,
      });
      if (parsed.target_sector) setCriteria((prev) => ({ ...prev, target_sector: parsed.target_sector! }));
      if (parsed.target_size) setCriteria((prev) => ({ ...prev, target_size: parsed.target_size }));
      if (parsed.suggested_notes) setCriteria((prev) => ({ ...prev, notes: parsed.suggested_notes! }));
      toast({ title: "Busca parametrizada!", description: parsed.human_readable_summary || "Campos preenchidos." });
    } catch (e: any) {
      toast({ title: "Erro ao analisar", description: e.message, variant: "destructive" });
    } finally {
      setNlParsing(false);
    }
  };

  const clearNlResult = () => {
    setNlResult(null);
    setNlExtraParams({});
    setNlText("");
  };

  const dimLabels: Record<string, string> = {
    financial_fit: "Financeiro",
    sector_fit: "Setor",
    size_fit: "Tamanho",
    location_fit: "Localização",
    risk_fit: "Risco",
    revenue_synergy: "Receita",
    cost_synergy: "Custo",
    vertical_synergy: "Verticalização",
    consolidation_synergy: "Consolidação",
    strategic_synergy: "Estratégica",
  };

  const CNAE_OPTIONS = [
    { value: "61", label: "61 — Telecom / ISP" },
    { value: "6920", label: "6920 — Consultoria Financeira" },
    { value: "70", label: "70 — Gestão Empresarial" },
    { value: "62", label: "62 — Software / TI" },
    { value: "63", label: "63 — Dados / Internet" },
    { value: "64", label: "64 — Banking / Fintech" },
    { value: "66", label: "66 — Investimentos" },
    { value: "86", label: "86 — Saúde" },
    { value: "85", label: "85 — Educação" },
    { value: "41", label: "41 — Construção" },
    { value: "43", label: "43 — Instalações" },
    { value: "35", label: "35 — Energia" },
    { value: "47", label: "47 — Varejo" },
    { value: "46", label: "46 — Atacado" },
    { value: "49", label: "49 — Transporte / Logística" },
    { value: "01", label: "01 — Agricultura / Agro" },
    { value: "10", label: "10 — Indústria Alimentícia" },
    { value: "25", label: "25 — Manufatura / Metalurgia" },
    { value: "73", label: "73 — Marketing / Publicidade" },
    { value: "69", label: "69 — Contabilidade / Jurídico" },
  ];

  const BOTTLENECK_OPTIONS = [
    { value: "revenue", label: "Preciso de mais clientes / receita", icon: TrendingUp },
    { value: "cost", label: "Preciso reduzir custos operacionais", icon: DollarSign },
    { value: "supplier", label: "Dependo de fornecedores críticos", icon: Link2 },
    { value: "geo", label: "Quero crescer em novas regiões", icon: Globe },
    { value: "value", label: "Quero aumentar o valor da minha empresa", icon: Trophy },
  ];

  const toggleBottleneck = (val: string) => {
    setBuyerBottlenecks(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  const synergyBarColor = (val: number) =>
    val >= 70 ? "bg-success" : val >= 40 ? "bg-warning" : "bg-muted-foreground/30";

  const scoreColor = (score: number) =>
    score >= 70 ? "text-success" : score >= 40 ? "text-warning" : "text-destructive";
  const scoreBg = (score: number) =>
    score >= 70 ? "bg-success/15 text-success border-success/30" : score >= 40 ? "bg-warning/15 text-warning border-warning/30" : "bg-destructive/15 text-destructive border-destructive/30";

  // Active filter count for collapsible headers
  const financialFilterCount = [criteria.min_revenue, criteria.max_revenue, criteria.min_ebitda, criteria.max_ebitda].filter(Boolean).length;
  const geoFilterCount = [criteria.target_state, criteria.geo_reference_city, !criteria.no_geo_limit ? "1" : ""].filter(Boolean).length;

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Matching Comprador-Vendedor</h1>
        <p className="text-muted-foreground mt-1 text-sm">Motor de matching com IA e análise multidimensional</p>
      </div>

      {/* ── MODE TOGGLE: Find Targets vs Find Buyers ── */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted w-full sm:w-fit">
        <button
          onClick={() => setMatchMode("find-targets")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all flex-1 sm:flex-initial justify-center ${
            matchMode === "find-targets"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Target className="w-4 h-4" />
          Buscar Alvos
        </button>
        <button
          onClick={() => setMatchMode("find-buyers")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all flex-1 sm:flex-initial justify-center ${
            matchMode === "find-buyers"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          Buscar Compradores
          <Badge className="text-[10px] bg-accent/15 text-accent border-accent/30 border ml-1">Novo</Badge>
        </button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="criteria" className="gap-1 text-xs md:text-sm"><Target className="w-4 h-4" /><span className="hidden sm:inline">Critérios</span><span className="sm:hidden">Perfil</span></TabsTrigger>
          <TabsTrigger value="results" className="gap-1 text-xs md:text-sm">
            <Search className="w-4 h-4" /><span className="hidden sm:inline">Resultados</span><span className="sm:hidden">Match</span>
            {matches.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px]">{matches.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1 text-xs md:text-sm"><BarChart3 className="w-4 h-4" /><span className="hidden sm:inline">Analytics</span><span className="sm:hidden">Stats</span></TabsTrigger>
        </TabsList>

        {/* ========== TAB 1: CRITERIA ========== */}
        <TabsContent value="criteria" className="space-y-6 mt-6">

          {/* ── FIND BUYERS MODE ── */}
          {matchMode === "find-buyers" ? (
            <div className="space-y-6">
              <Card className="border-2 border-accent/30 bg-accent/5">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2 text-base">
                    <ArrowLeftRight className="w-5 h-5 text-accent" />
                    Dados do Vendedor
                  </CardTitle>
                  <CardDescription>
                    Preencha os dados da empresa à venda. A IA analisará o mercado e buscará compradores potenciais na base nacional.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome da empresa</Label>
                      <Input value={sellerData.name} onChange={(e) => setSellerData(prev => ({ ...prev, name: e.target.value }))} placeholder="Ex: Arrozeira Gaúcha Ltda" />
                    </div>
                    <div className="space-y-2">
                      <Label>CNPJ</Label>
                      <Input value={sellerData.cnpj} onChange={(e) => setSellerData(prev => ({ ...prev, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Setor / CNAE</Label>
                      <Select value={sellerData.cnae} onValueChange={(v) => {
                        const cnaeToSector: Record<string, string> = { "61": "Telecom", "62": "Technology", "63": "Technology", "64": "Finance", "65": "Finance", "66": "Finance", "69": "Finance", "6920": "Finance", "70": "Finance", "86": "Healthcare", "85": "Education", "41": "Real Estate", "43": "Real Estate", "35": "Energy", "47": "Retail", "46": "Retail", "45": "Retail", "49": "Logistics", "52": "Logistics", "01": "Agribusiness", "10": "Manufacturing", "25": "Manufacturing", "73": "Technology" };
                        const sectorVal = cnaeToSector[v] || cnaeToSector[v.substring(0, 2)] || "Other";
                        setSellerData(prev => ({ ...prev, cnae: v, sector: sectorVal }));
                      }}>
                        <SelectTrigger><SelectValue placeholder="Selecione o CNAE" /></SelectTrigger>
                        <SelectContent>
                          {CNAE_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Select value={sellerData.state} onValueChange={(v) => setSellerData(prev => ({ ...prev, state: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {BRAZILIAN_STATES.map(s => <SelectItem key={s.uf} value={s.uf}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input value={sellerData.city} onChange={(e) => setSellerData(prev => ({ ...prev, city: e.target.value }))} placeholder="Ex: Gravataí" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-muted-foreground" />Faturamento anual (R$)</Label>
                      <Input type="number" value={sellerData.revenue} onChange={(e) => setSellerData(prev => ({ ...prev, revenue: e.target.value }))} placeholder="Ex: 5000000" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />Lucro / EBITDA (R$)</Label>
                      <Input type="number" value={sellerData.ebitda} onChange={(e) => setSellerData(prev => ({ ...prev, ebitda: e.target.value }))} placeholder="Ex: 1800000" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5 text-muted-foreground" />Asking Price (R$)</Label>
                      <Input type="number" value={sellerData.asking_price} onChange={(e) => setSellerData(prev => ({ ...prev, asking_price: e.target.value }))} placeholder="Ex: 3000000" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição do negócio</Label>
                    <Textarea value={sellerData.description} onChange={(e) => setSellerData(prev => ({ ...prev, description: e.target.value }))} placeholder="Ex: Empresa de beneficiamento de arroz e venda de cestas básicas. Atua há 15 anos na região metropolitana de Porto Alegre..." rows={3} className="resize-none" />
                  </div>
                </CardContent>
              </Card>

              {/* Investment thesis from AI */}
              {investmentThesis && (
                <Card className="border-success/30 bg-success/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><BrainCircuit className="w-4 h-4 text-success" />Tese de Investimento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground">{investmentThesis}</p>
                  </CardContent>
                </Card>
              )}

              {/* Buyer profiles from AI */}
              {buyerProfiles.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Perfis de Compradores Identificados pela IA</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {buyerProfiles.map((p, i) => (
                        <div key={i} className="rounded-lg border p-3 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[10px] ${
                              p.strategy === "horizontal" ? "bg-primary/15 text-primary border-primary/30" :
                              p.strategy === "vertical" ? "bg-accent/15 text-accent border-accent/30" :
                              "bg-warning/15 text-warning border-warning/30"
                            } border`}>
                              {p.strategy === "horizontal" ? "Consolidação" : p.strategy === "vertical" ? "Verticalização" : "Diversificação"}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">{p.label}</p>
                          <p className="text-xs text-muted-foreground">{p.motivation}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">CNAE: {p.cnae_prefixes.map(c => `${c}xx`).join(", ")}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Progress bar */}
              {buyerSearchLoading && progressStep > 0 && (
                <Card className="border-primary/30">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        {progressStep === 1 ? "IA analisando perfil do vendedor..." :
                         progressStep === 2 ? "Buscando compradores na Base Nacional..." :
                         progressStep === 3 ? "Calculando Buyer Fit Score..." :
                         "Salvando resultados..."}
                      </span>
                    </div>
                    <Progress value={progressStep * 20} className="h-2" />
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={runBuyerSearch}
                disabled={buyerSearchLoading || (!sellerData.cnae && !sellerData.description)}
                size="lg"
                className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {buyerSearchLoading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />Buscando compradores...</>
                ) : (
                  <><Search className="w-5 h-5" />Buscar Compradores Potenciais</>
                )}
              </Button>
            </div>
          ) : (
          /* ── FIND TARGETS MODE (existing wizard) ── */
          <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center gap-2 flex-wrap">
            {[1, 2, 3].map((step) => (
              <button
                key={step}
                onClick={() => setWizardStep(step)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  wizardStep === step
                    ? "bg-primary text-primary-foreground"
                    : wizardStep > step
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {wizardStep > step ? <CheckCircle2 className="w-4 h-4" /> : <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs">{step}</span>}
                {step === 1 ? "Perfil" : step === 2 ? "Filtros" : "Confirmar"}
              </button>
            ))}
            <div className="ml-auto">
              <Button variant="ghost" size="sm" onClick={clearCriteria} className="text-xs gap-1">
                <RotateCcw className="w-3 h-3" />Limpar tudo
              </Button>
            </div>
          </div>

          {/* Criteria History */}
          {criteriaHistory.length > 0 && wizardStep === 1 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center">Anteriores:</span>
              {criteriaHistory.map((c: any) => (
                <Button key={c.id} variant="outline" size="sm" onClick={() => { loadCriteria(c); setWizardStep(3); }} className="text-xs h-7">
                  {sectorLabel(c.target_sector) || "Todos"} · {c.target_location || "BR"} · {new Date(c.created_at).toLocaleDateString()}
                </Button>
              ))}
            </div>
          )}

          {/* === SOURCE TOGGLE === */}
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-muted w-full sm:w-fit">
                <button
                  onClick={() => setSearchSource("carteira")}
                  className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all flex-1 sm:flex-initial justify-center ${
                    searchSource === "carteira"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Minha Carteira
                  {searchSource === "carteira" && (
                    <Badge variant="secondary" className="text-xs ml-1">{companies.length}</Badge>
                  )}
                </button>
                <button
                  onClick={() => setSearchSource("nacional")}
                  className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all flex-1 sm:flex-initial justify-center ${
                    searchSource === "nacional"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Database className="w-4 h-4" />
                  Base Nacional
                  <Badge className="text-xs ml-1 bg-primary/15 text-primary border-primary/30">5M+</Badge>
                </button>
              </div>
              {searchSource === "nacional" && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  A IA irá buscar candidatos da base nacional da Receita Federal e ranquear os melhores.
                </p>
              )}
            </CardContent>
          </Card>

          {/* === STEP 1: Perfil === */}
          {wizardStep === 1 && (
            <div className="space-y-6">
              {/* === NATURAL LANGUAGE CARD === */}
              <Card className="border-2 border-accent/30 bg-accent/5">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display flex items-center gap-2 text-base">
                    <BrainCircuit className="w-5 h-5 text-accent" />
                    Descreva o que você procura
                    <Badge variant="outline" className="text-xs ml-1 border-accent/40 text-accent">IA</Badge>
                  </CardTitle>
                  <CardDescription>
                    Escreva em linguagem natural — a IA parametriza os filtros automaticamente e exclui gigantes irrelevantes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!nlResult ? (
                    <>
                      <Textarea
                        value={nlText}
                        onChange={(e) => setNlText(e.target.value)}
                        placeholder={'Ex: "Tenho uma consultoria financeira que fatura R$5M/ano e quero empresas similares menores para adquirir ou fazer parceria. Não quero bancos nem seguradoras."'}
                        rows={3}
                        className="resize-none"
                      />
                      <Button
                        onClick={parseIntent}
                        disabled={nlParsing || !nlText.trim()}
                        className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                      >
                        {nlParsing ? (
                          <><Loader2 className="w-4 h-4 animate-spin" />Analisando...</>
                        ) : (
                          <><Sparkles className="w-4 h-4" />Deixar IA parametrizar</>
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-success/30 bg-success/5 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-success flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />IA parametrizou
                          </span>
                          <button onClick={clearNlResult} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                            <X className="w-3 h-3" />Limpar
                          </button>
                        </div>
                        {nlResult.human_readable_summary && (
                          <p className="text-sm font-medium text-foreground">{nlResult.human_readable_summary}</p>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                          {nlResult.cnae_prefixes && (
                            <div className="flex items-start gap-1">
                              <span className="text-muted-foreground min-w-[80px]">CNAE:</span>
                              <span className="font-mono font-medium">{nlResult.cnae_prefixes.map(p => `${p}xx`).join(", ")}</span>
                            </div>
                          )}
                          {nlResult.target_size && (
                            <div className="flex items-start gap-1">
                              <span className="text-muted-foreground min-w-[80px]">Porte:</span>
                              <span className="font-medium">{nlResult.target_size}</span>
                            </div>
                          )}
                          {nlResult.max_capital_social_brl && (
                            <div className="flex items-start gap-1">
                              <span className="text-muted-foreground min-w-[80px]">Capital máx:</span>
                              <span className="font-medium">R${(nlResult.max_capital_social_brl / 1e6).toFixed(1)}M</span>
                            </div>
                          )}
                          {nlResult.intent && (
                            <div className="flex items-start gap-1">
                              <span className="text-muted-foreground min-w-[80px]">Intenção:</span>
                              <span className="font-medium capitalize">{nlResult.intent}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => { setNlResult(null); }}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <PencilLine className="w-3 h-3" />Editar descrição
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display flex items-center gap-2 text-base"><UserCheck className="w-5 h-5 text-primary" />Perfil do Investidor</CardTitle>
                  <CardDescription>Define como o motor prioriza os pilares de sinergia</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {investorProfiles.map((p) => {
                      const Icon = p.icon;
                      return (
                        <button
                          key={p.value}
                          onClick={() => setInvestorProfile(p.value)}
                          className={`rounded-lg border p-4 text-left transition-all ${investorProfile === p.value ? "border-primary bg-primary/10 ring-2 ring-primary/50" : "border-border hover:border-primary/40"}`}
                        >
                          <Icon className={`w-5 h-5 mb-2 ${investorProfile === p.value ? "text-primary" : "text-muted-foreground"}`} />
                          <p className="font-semibold text-sm">{p.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Buyer CNAE + Bottleneck */}
              <Card className="border-accent/20 bg-accent/5">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display flex items-center gap-2 text-base"><Link2 className="w-5 h-5 text-accent" />Meu CNAE & Gargalos</CardTitle>
                  <CardDescription>Permite calcular sinergias de cadeia de valor e ajustar pesos automaticamente</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Meu CNAE principal</Label>
                    <Select value={buyerCnae} onValueChange={setBuyerCnae}>
                      <SelectTrigger><SelectValue placeholder="Selecione seu CNAE" /></SelectTrigger>
                      <SelectContent>
                        {CNAE_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">Usado para identificar sinergias de verticalização (upstream/downstream) e cross-sell.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Qual é seu principal gargalo hoje?</Label>
                    <div className="space-y-2">
                      {BOTTLENECK_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const checked = buyerBottlenecks.includes(opt.value);
                        return (
                          <label
                            key={opt.value}
                            className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${checked ? "border-accent bg-accent/10" : "border-border hover:border-accent/40"}`}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleBottleneck(opt.value)}
                            />
                            <Icon className={`w-4 h-4 ${checked ? "text-accent" : "text-muted-foreground"}`} />
                            <span className="text-sm">{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-muted-foreground">Os gargalos selecionados ajustam automaticamente os pesos dos 5 pilares de sinergia.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2 text-base"><Target className="w-5 h-5 text-accent" />Alvo Principal</CardTitle>
                  <CardDescription>Setor e tamanho desejado (essencial)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Setor Alvo</Label>
                      <Select value={criteria.target_sector} onValueChange={(v) => setCriteria({ ...criteria, target_sector: v })}>
                        <SelectTrigger><SelectValue placeholder="Qualquer setor" /></SelectTrigger>
                        <SelectContent>{sectors.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tamanho</Label>
                      <Select value={criteria.target_size} onValueChange={(v) => setCriteria({ ...criteria, target_size: v })}>
                        <SelectTrigger><SelectValue placeholder="Qualquer tamanho" /></SelectTrigger>
                        <SelectContent>{companySizes.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                      Meu faturamento anual (R$)
                    </Label>
                    <Input
                      type="number"
                      placeholder="Ex: 5000000"
                      value={buyerRevenueBrl}
                      onChange={(e) => handleBuyerRevenueChange(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Usado para filtrar alvos com capital social até 50% do seu faturamento. Sem isso, o filtro usa caps genéricos por setor.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={() => setWizardStep(2)} className="gap-2">
                  Próximo: Filtros <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* === STEP 2: Filtros Avançados === */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="font-display flex items-center gap-2 text-base">
                          <DollarSign className="w-5 h-5 text-accent" />Filtros Financeiros
                          {financialFilterCount > 0 && <Badge variant="secondary" className="text-xs">{financialFilterCount} ativo(s)</Badge>}
                        </CardTitle>
                        {filtersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Receita Mín. (R$)</Label>
                          <Input type="number" value={criteria.min_revenue} onChange={(e) => setCriteria({ ...criteria, min_revenue: e.target.value })} placeholder="0" />
                        </div>
                        <div className="space-y-2">
                          <Label>Receita Máx. (R$)</Label>
                          <Input type="number" value={criteria.max_revenue} onChange={(e) => setCriteria({ ...criteria, max_revenue: e.target.value })} placeholder="Sem limite" />
                        </div>
                        <div className="space-y-2">
                          <Label>EBITDA Mín. (R$)</Label>
                          <Input type="number" value={criteria.min_ebitda} onChange={(e) => setCriteria({ ...criteria, min_ebitda: e.target.value })} placeholder="0" />
                        </div>
                        <div className="space-y-2">
                          <Label>EBITDA Máx. (R$)</Label>
                          <Input type="number" value={criteria.max_ebitda} onChange={(e) => setCriteria({ ...criteria, max_ebitda: e.target.value })} placeholder="Sem limite" />
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              <Collapsible open={geoOpen} onOpenChange={setGeoOpen}>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="font-display flex items-center gap-2 text-base">
                          <MapPin className="w-5 h-5 text-accent" />Filtro Geográfico
                          {geoFilterCount > 0 && <Badge variant="secondary" className="text-xs">{geoFilterCount} ativo(s)</Badge>}
                        </CardTitle>
                        {geoOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Estado</Label>
                        <Select value={criteria.target_state} onValueChange={(v) => setCriteria({ ...criteria, target_state: v, geo_reference_city: "" })}>
                          <SelectTrigger><SelectValue placeholder="Qualquer estado" /></SelectTrigger>
                          <SelectContent>{BRAZILIAN_STATES.map((s) => <SelectItem key={s.uf} value={s.uf}>{s.uf} — {s.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Cidade de Referência</Label>
                        <Select value={criteria.geo_reference_city} onValueChange={(v) => setCriteria({ ...criteria, geo_reference_city: v })}>
                          <SelectTrigger><SelectValue placeholder="Selecionar cidade" /></SelectTrigger>
                          <SelectContent>{refCitySuggestions.map((c) => <SelectItem key={c.name + c.state} value={c.name}>{c.name} ({c.state})</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" id="no_geo_limit" checked={criteria.no_geo_limit} onChange={(e) => setCriteria({ ...criteria, no_geo_limit: e.target.checked })} className="rounded" />
                        <Label htmlFor="no_geo_limit" className="text-sm cursor-pointer">Sem limite geográfico</Label>
                      </div>
                      {!criteria.no_geo_limit && (
                        <div className="space-y-2">
                          <Label>Raio: {criteria.geo_radius_km} km</Label>
                          <Slider value={[criteria.geo_radius_km]} onValueChange={([v]) => setCriteria({ ...criteria, geo_radius_km: v })} min={10} max={3000} step={10} />
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              <Card>
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2 text-base"><Shield className="w-5 h-5 text-accent" />Risco & Notas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tolerância ao Risco</Label>
                    <Select value={criteria.risk_level} onValueChange={(v) => setCriteria({ ...criteria, risk_level: v })}>
                      <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                      <SelectContent>{riskLevels.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notas Estratégicas</Label>
                    <Textarea
                      value={criteria.notes}
                      onChange={(e) => setCriteria({ ...criteria, notes: e.target.value })}
                      placeholder="Contexto adicional para a IA (ex.: prefiro empresas com marca forte...)"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setWizardStep(1)} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />Voltar
                </Button>
                <Button onClick={() => setWizardStep(3)} className="gap-2">
                  Confirmar <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* === STEP 3: Confirm & Run === */}
          {wizardStep === 3 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-base">Resumo dos Critérios</CardTitle>
                  <CardDescription>Confira antes de executar o matching</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Perfil</p>
                      <p className="font-semibold text-sm">{investorProfile}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Setor</p>
                      <p className="font-semibold text-sm">{sectorLabel(criteria.target_sector) || "Qualquer"}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Tamanho</p>
                      <p className="font-semibold text-sm">{companySizes.find((s) => s.value === criteria.target_size)?.label || "Qualquer"}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Estado</p>
                      <p className="font-semibold text-sm">{criteria.target_state || "Todos"}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">CNAE Buyer</p>
                      <p className="font-semibold text-sm">{buyerCnae ? CNAE_OPTIONS.find(c => c.value === buyerCnae)?.label || buyerCnae : "Não informado"}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Empresas</p>
                      <p className="font-semibold text-sm">{filteredCompanies.length} de {companies.length}</p>
                    </div>
                  </div>
                  {buyerBottlenecks.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="text-xs text-muted-foreground self-center">Gargalos:</span>
                      {buyerBottlenecks.map(bn => (
                        <Badge key={bn} variant="outline" className="text-xs border-accent/40 text-accent">
                          {BOTTLENECK_OPTIONS.find(o => o.value === bn)?.label || bn}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {/* Synergy weights preview */}
                  {(() => {
                    const baseW = { ...(SYNERGY_PROFILE_WEIGHTS[investorProfile] || SYNERGY_PROFILE_WEIGHTS["Moderado"]) };
                    for (const bn of buyerBottlenecks) {
                      const adj = BOTTLENECK_ADJUSTMENTS[bn];
                      if (adj) { for (const k of Object.keys(baseW)) baseW[k] = Math.max(0.05, (baseW[k] || 0) + (adj[k] || 0)); }
                    }
                    const wS = Object.values(baseW).reduce((a, b) => a + b, 0);
                    for (const k of Object.keys(baseW)) baseW[k] /= wS;
                    const labels: Record<string, string> = { revenue: "Receita", cost: "Custo", vertical: "Vertical", consolidation: "Consolidação", strategic: "Estratégica" };
                    return (
                      <div className="mt-3 rounded-lg border p-3 bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-2 font-medium">Pesos de Sinergia Configurados</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(baseW).map(([key, weight]) => (
                            <div key={key} className="flex items-center gap-1">
                              <span className="text-xs font-medium">{labels[key] || key}</span>
                              <Badge variant="secondary" className="text-[10px]">{Math.round((weight as number) * 100)}%</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  {criteria.notes && (
                    <div className="mt-3 rounded-lg border p-3 bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Notas Estratégicas</p>
                      <p className="text-sm">{criteria.notes}</p>
                    </div>
                  )}
                  {buyerRevenueBrl && Number(buyerRevenueBrl) > 0 && (
                    <div className="mt-3 rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Faturamento do Comprador</p>
                      <p className="font-semibold text-sm">{formatCurrency(Number(buyerRevenueBrl))} <span className="text-xs font-normal text-muted-foreground">→ Capital máx: {formatCurrency(Number(buyerRevenueBrl) * 0.5)}</span></p>
                    </div>
                  )}
                  {completenessStats && (
                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                      <Badge variant={completenessStats.avg >= 60 ? "default" : "secondary"} className="text-xs">
                        Dados: {completenessStats.avg}% completo
                      </Badge>
                      <Badge variant="outline" className="text-xs">{completenessStats.withCnpj}/{completenessStats.total} com CNPJ</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Progress feedback during analysis */}
              {runMatchMutation.isPending && progressStep > 0 && (
                <Card className="border-primary/30">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                      <p className="font-medium text-sm">{PROGRESS_STEPS[Math.min(progressStep - 1, PROGRESS_STEPS.length - 1)].label}</p>
                    </div>
                    <Progress value={PROGRESS_STEPS[Math.min(progressStep - 1, PROGRESS_STEPS.length - 1)].pct} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Perfil: {investorProfile}
                      {searchSource === "nacional" && funnelStats && funnelStats.db_fetched > 0 && (
                        <> · <span className="text-primary font-medium">{funnelStats.db_fetched} do BD</span>{funnelStats.pre_filtered > 0 && <> → <span className="text-warning font-medium">{funnelStats.pre_filtered} para IA</span></>}</>
                      )}
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setWizardStep(2)} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />Voltar
                </Button>
                <Button
                  onClick={() => runMatchMutation.mutate()}
                  disabled={runMatchMutation.isPending || (searchSource === "carteira" && filteredCompanies.length === 0)}
                  className="h-12 px-8 text-base font-semibold gap-2"
                  size="lg"
                >
                  {searchSource === "nacional" ? <Database className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                  {runMatchMutation.isPending
                    ? "Analisando..."
                    : searchSource === "nacional"
                    ? "Buscar na Base Nacional"
                    : `Executar Matching (${filteredCompanies.length})`}
                </Button>
              </div>
            </div>
          )}
          </div>
          )}
        </TabsContent>

        {/* ========== TAB 2: RESULTS - CARDS ========== */}
        <TabsContent value="results" className="space-y-6 mt-6">
          {matchesLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
            </div>
          ) : matches.length === 0 ? (
            <Card className="py-16 flex flex-col items-center justify-center text-center">
              <Search className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-display font-semibold">Nenhum match ainda</h3>
              <p className="text-muted-foreground mt-1 max-w-sm">Defina seus critérios e execute o matching IA.</p>
              <Button className="mt-4" onClick={() => setActiveTab("criteria")}><Target className="w-4 h-4 mr-2" />Ir para Critérios</Button>
            </Card>
          ) : (
            <>
              {/* Summary row */}
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-bold">{matches.length}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Score Médio</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-bold">{avgScore}%</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Alta Compatibilidade</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-bold text-success">{highMatches}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Distribuição</CardTitle></CardHeader>
                  <CardContent className="flex items-center gap-2">
                    <Badge className="bg-success/15 text-success border-0">{highMatches} Alto</Badge>
                    <Badge className="bg-warning/15 text-warning border-0">{medMatches} Méd</Badge>
                    <Badge className="bg-destructive/15 text-destructive border-0">{lowMatches} Baixo</Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Funnel card - shown after national search */}
              {funnelStats && searchSource === "nacional" && (
                <FunnelCard stats={funnelStats} open={funnelOpen} onToggle={() => setFunnelOpen(o => !o)} />
              )}

              {/* Actions bar */}
              <div className="flex flex-wrap items-center gap-2 md:gap-4">
                <Button onClick={() => setDeepDiveOpen(true)} variant="outline" className="border-primary/30 hover:bg-primary/5 gap-1 text-xs md:text-sm md:gap-2">
                  <Microscope className="w-4 h-4" /><span className="hidden sm:inline">Aprofundar Top 10</span><span className="sm:hidden">Top 10</span>
                </Button>
                <DeepDiveDialog
                  companies={displayMatches.slice(0, 10).map((m) => ({
                    id: m.companies?.id, name: m.companies?.name, cnpj: m.companies?.cnpj,
                    sector: m.companies?.sector, revenue: m.companies?.revenue, ebitda: m.companies?.ebitda, location: m.companies?.location,
                  }))}
                  open={deepDiveOpen}
                  onOpenChange={setDeepDiveOpen}
                />
                <div className="flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">Status:</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="new">Novos</SelectItem>
                      <SelectItem value="saved">Salvos</SelectItem>
                      <SelectItem value="dismissed">Dispensados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-[140px] max-w-xs">
                  <Label className="text-sm whitespace-nowrap">Min: {minScoreFilter[0]}%</Label>
                  <Slider value={minScoreFilter} onValueChange={setMinScoreFilter} max={100} step={5} className="flex-1" />
                </div>
                <div className="flex items-center gap-1 p-0.5 rounded-md bg-muted">
                  <button onClick={() => setWebFilterMode("all")} className={`px-2 py-1 rounded text-xs font-medium transition-all ${webFilterMode === "all" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>Todas</button>
                  <button onClick={() => setWebFilterMode("any")} className={`px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${webFilterMode === "any" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}><Globe className="w-3 h-3" />Validadas</button>
                </div>
                <p className="text-sm text-muted-foreground ml-auto">
                  {paginatedMatches.length} de {displayMatches.length} resultados
                </p>
              </div>

              {/* Cards grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {paginatedMatches.map((m, idx) => {
                   const parsedData = parseAnalysis(m.ai_analysis);
                   const { analysis, dimensions, dimension_explanations, recommendation, strengths, weaknesses, ai_enriched } = parsedData;
                   const isFromNational = (() => { try { return JSON.parse(m.ai_analysis || "{}").source === "national_db"; } catch { return false; } })();
                   const isExpanded = expandedMatch === m.id;
                   const score = Number(m.compatibility_score);
                   const completeness = m.companies ? calcCompleteness(m.companies) : 0;
                   const isTop3 = idx < 3 && score >= 60;
                   const isFeedbackLoading = (action: string) => feedbackLoading[m.id] === action;
                   const isAiEnriching = aiEnrichingMatch === m.id;
                   const isEnriching = enrichingMatch === m.id;
                   const contactInfo = (() => { try { const p = JSON.parse(m.ai_analysis || "{}"); return p.contact_info || null; } catch { return null; } })();

                  return (
                     <Card
                       key={m.id}
                       className={`transition-all hover:shadow-md ${
                         isTop3 ? "ring-2 ring-warning/50 border-warning/30" : ""
                       } ${m.status === "dismissed" ? "opacity-50" : ""} ${isExpanded ? "md:col-span-2 lg:col-span-3" : ""}`}
                     >
                       <CardContent className="pt-5">
                         <div
                           className="cursor-pointer"
                           onClick={() => {
                             setExpandedMatch(isExpanded ? null : m.id);
                             if (!isExpanded && m.companies?.id) {
                               recordFeedback(m.id, m.companies.id, "clicked", idx + 1);
                             }
                           }}
                         >
                         <div className="flex items-start justify-between mb-3">
                           <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2 mb-1">
                               {isTop3 && <Trophy className="w-4 h-4 text-warning flex-shrink-0" />}
                               <h3 className="font-display font-semibold text-sm truncate">{m.companies?.name || "Desconhecido"}</h3>
                             </div>
                              <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">{sectorLabel(m.companies?.sector || null)}</Badge>
                                {m.companies?.state && <span className="text-xs text-muted-foreground">{m.companies.city ? `${m.companies.city}, ` : ""}{m.companies.state}</span>}
                                  {/* Synergy type badge */}
                                  {dimensions?.synergy_type && (
                                    <Badge className="text-[10px] bg-accent/15 text-accent border-accent/30 border">
                                      {dimensions.synergy_type}
                                    </Badge>
                                   )}
                                   {/* Tier badge */}
                                   {dimensions?.tier_priority != null && dimensions.tier_priority <= 5 && (
                                     <Badge variant="outline" className={`text-[10px] ${
                                       dimensions.tier_priority <= 2 ? "border-success/40 text-success" :
                                       dimensions.tier_priority <= 4 ? "border-primary/40 text-primary" :
                                       "border-muted-foreground/40 text-muted-foreground"
                                     }`}>
                                       T{dimensions.tier_priority} · {dimensions.tier_label}
                                      </Badge>
                                   )}
                                   {/* Quality badge */}
                                   {dimensions?.quality_score != null && dimensions.quality_score > 65 && (
                                     <Badge className="text-[10px] bg-success/15 text-success border-success/30 border">
                                       <Star className="w-2.5 h-2.5 mr-0.5" />Empresa Estruturada
                                     </Badge>
                                   )}
                                   {/* Consolidator badge */}
                                  {dimensions?.consolidator_score != null && dimensions.consolidator_score > 60 && (
                                     <Badge className="text-[10px] bg-warning/15 text-warning border-warning/30 border">
                                       <Building2 className="w-2.5 h-2.5 mr-0.5" />Potencial Consolidador
                                     </Badge>
                                   )}
                                   {/* Web Validation badge */}
                                   {dimensions?.web_validated && (
                                      <Badge className="text-[10px] bg-success/15 text-success border-success/30 border">
                                        <Globe className="w-2.5 h-2.5 mr-0.5" />Validada Web{dimensions.web_rank ? ` #${dimensions.web_rank}` : ""}
                                      </Badge>
                                    )}
                                  {(() => {
                                    const capital = extractCapitalFromDescription(m.companies?.description ?? null);
                                    return capital ? (
                                      <Badge variant="outline" className="text-[10px] border-accent/40 text-accent">
                                        <DollarSign className="w-2.5 h-2.5 mr-0.5" />Capital: {formatCurrency(capital)}
                                      </Badge>
                                    ) : null;
                                  })()}
                                  {isFromNational && (
                                    <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground">
                                      <AlertCircle className="w-2.5 h-2.5 mr-0.5" />Dados estimados
                                    </Badge>
                                  )}
                                  {contactInfo && (
                                    <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30 border">
                                      <UserCheck className="w-2.5 h-2.5 mr-0.5" />Enriquecida
                                    </Badge>
                                  )}
                                </div>
                           </div>
                           {/* Score gauge */}
                           <div className={`flex flex-col items-center justify-center rounded-lg border px-3 py-2 ${scoreBg(score)}`}>
                             <span className="text-2xl font-bold">{score}</span>
                             <span className="text-[10px] uppercase font-medium">Score</span>
                           </div>
                         </div>

                         {/* Mini stats row */}
                         <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 flex-wrap">
                           {(() => {
                             const capital = extractCapitalFromDescription(m.companies?.description ?? null);
                             const cnae = extractCnaeFromDescription(m.companies?.description ?? null);
                             if (capital || cnae) {
                               return (
                                 <>
                                   {capital && <span>Capital Social: {formatCurrency(capital)}</span>}
                                   {capital && cnae && <span>·</span>}
                                   {cnae && <span className="font-mono">CNAE: {cnae}</span>}
                                   <span>·</span>
                                 </>
                               );
                             }
                             return (
                               <>
                                 <span>Receita: {formatCurrency(m.companies?.revenue ?? null)}</span>
                                 <span>·</span>
                                 <span>EBITDA: {formatCurrency(m.companies?.ebitda ?? null)}</span>
                                 <span>·</span>
                               </>
                             );
                           })()}
                           <Badge variant={completeness >= 60 ? "secondary" : "outline"} className={`text-[10px] ${completeness < 40 ? "text-warning" : ""}`}>
                             {completeness}% dados
                           </Badge>
                         </div>

                         {/* Synergy mini-bars */}
                         {dimensions && !isExpanded && (
                            <div className="space-y-1.5 mt-1">
                              {[
                                { label: "Receita", val: dimensions.revenue_synergy },
                                { label: "Custo", val: dimensions.cost_synergy },
                                { label: "Vertical", val: dimensions.vertical_synergy },
                                { label: "Consolid.", val: dimensions.consolidation_synergy },
                                { label: "Estratég.", val: dimensions.strategic_synergy },
                              ].map(({ label, val }) => (
                                <div key={label} className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground w-14 text-right truncate">{label}</span>
                                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${synergyBarColor(val)}`} style={{ width: `${val}%` }} />
                                  </div>
                                  <span className="text-[10px] font-mono font-medium w-6 text-right">{val}</span>
                                </div>
                              ))}
                            </div>
                           )}

                          {/* GPI Insights + Bottleneck Resolution (collapsed view) */}
                          {dimensions && !isExpanded && (
                            <>
                              {dimensions.gain_insights && dimensions.gain_insights.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {dimensions.gain_insights.map((insight, i) => (
                                    <div key={i} className="flex items-start gap-1.5">
                                      <TrendingUp className="w-3 h-3 text-success mt-0.5 flex-shrink-0" />
                                      <span className="text-[11px] text-muted-foreground leading-tight">{insight}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {dimensions.bottleneck_resolution && (
                                <div className="mt-2 flex items-start gap-1.5 rounded-md border border-accent/20 bg-accent/5 px-2 py-1.5">
                                  <Target className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
                                  <span className="text-[11px] text-accent leading-tight font-medium">{dimensions.bottleneck_resolution}</span>
                                </div>
                              )}
                            </>
                          )}

                          {/* Actions — feedback buttons */}
                         <div className="flex items-center justify-between mt-2">
                           <div className="flex gap-1 flex-wrap">
                             <Button
                               variant={m.status === "saved" ? "default" : "outline"}
                               size="sm"
                               className={`h-7 text-xs gap-1 ${m.status === "saved" ? "bg-success text-success-foreground hover:bg-success/90" : ""}`}
                               disabled={isFeedbackLoading("saved")}
                               onClick={(e) => {
                                 e.stopPropagation();
                                 if (m.companies?.id) recordFeedback(m.id, m.companies.id, "saved", idx + 1);
                               }}
                             >
                               {isFeedbackLoading("saved") ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bookmark className="w-3 h-3" />}
                               {m.status === "saved" ? "Shortlist ✓" : "Shortlist"}
                             </Button>
                             <Button
                               variant="outline"
                               size="sm"
                               className="h-7 text-xs gap-1 border-primary/30 hover:bg-primary/5"
                               disabled={isFeedbackLoading("contacted")}
                               onClick={(e) => {
                                 e.stopPropagation();
                                 if (m.companies?.id) recordFeedback(m.id, m.companies.id, "contacted", idx + 1);
                                 toast({ title: "Marcado como contatado", description: "Registrado para análise do modelo." });
                               }}
                             >
                               {isFeedbackLoading("contacted") ? <Loader2 className="w-3 h-3 animate-spin" /> : <Phone className="w-3 h-3" />}
                               Contatado
                             </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1 text-muted-foreground"
                                disabled={isFeedbackLoading("ignored")}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (m.companies?.id) recordFeedback(m.id, m.companies.id, "ignored", idx + 1);
                                }}
                              >
                                {isFeedbackLoading("ignored") ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                Ignorar
                              </Button>
                            </div>
                            <div className="flex items-center gap-1">
                              {ai_enriched && (
                                <Badge variant="outline" className="text-[10px] border-accent/40 text-accent gap-0.5 px-1.5">
                                  <Sparkles className="w-2.5 h-2.5" />IA
                                </Badge>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className={`h-7 text-xs gap-1 ${ai_enriched ? "border-accent/40 text-accent hover:bg-accent/10" : "border-primary/40 text-primary hover:bg-primary/10"}`}
                                disabled={isAiEnriching || !!aiEnrichingMatch}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  analyzeOneCompany(m);
                                }}
                              >
                                {isAiEnriching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                {ai_enriched ? "Re-analisar IA" : "Ver análise IA ✦"}
                               </Button>
                               <Button
                                 variant="outline"
                                 size="sm"
                                 className={`h-7 text-xs gap-1 ${contactInfo ? "border-success/40 text-success hover:bg-success/10" : "border-warning/40 text-warning hover:bg-warning/10"}`}
                                 disabled={isEnriching || !!enrichingMatch}
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   enrichOneCompany(m);
                                 }}
                               >
                                 {isEnriching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Users className="w-3 h-3" />}
                                 {contactInfo ? "Re-enriquecer" : "Enriquecer"}
                               </Button>
                               {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            </div>
                          </div>

                         </div>{/* end clickable header zone */}

                         {/* Expanded detail */}
                         {isExpanded && (
                           <div className="mt-4 pt-4 border-t space-y-4" onClick={(e) => e.stopPropagation()}>
                             {/* Data confidence notice */}
                             {isFromNational && (
                               <div className="rounded-lg border border-muted-foreground/20 bg-muted/30 px-3 py-2 flex items-center gap-2">
                                 <AlertCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                 <p className="text-xs text-muted-foreground">
                                   <span className="font-medium">Dados estimados — capital social proxy.</span> Receita e EBITDA são estimativas baseadas em capital social. Financial_fit calculado com peso reduzido.
                                 </p>
                               </div>
                              )}
                              {/* Contact Info Section (from enrichment) */}
                              {contactInfo && (
                                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-display font-semibold text-sm flex items-center gap-2">
                                      <Users className="w-4 h-4 text-primary" />Sócios e Contato
                                    </h4>
                                    <div className="flex gap-1">
                                      {contactInfo.sources?.map((src: string) => (
                                        <Badge key={src} variant="outline" className="text-[10px]">
                                          {src === "banco_nacional" ? "BD Nacional" : src === "brasilapi" ? "BrasilAPI" : src === "perplexity" ? "Web" : src}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                  {/* Owners list */}
                                  {contactInfo.owners && contactInfo.owners.length > 0 && (
                                    <div className="space-y-2">
                                      {contactInfo.owners.map((owner: any, oi: number) => (
                                        <div key={oi} className="rounded-md border bg-background px-3 py-2">
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <span className="text-sm font-medium">{owner.name}</span>
                                              <span className="text-xs text-muted-foreground ml-2">{owner.role}</span>
                                            </div>
                                            <div className="flex gap-1.5">
                                              {owner.linkedin && (
                                                <a href={owner.linkedin} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:text-primary/80">
                                                  <Linkedin className="w-4 h-4" />
                                                </a>
                                              )}
                                              {owner.instagram && (
                                                <a href={owner.instagram.startsWith("http") ? owner.instagram : `https://instagram.com/${owner.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-pink-500 hover:text-pink-400">
                                                  <Instagram className="w-4 h-4" />
                                                </a>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {/* Contact details */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                    {contactInfo.contact?.phones?.length > 0 && (
                                      <div className="flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                        <span className="text-muted-foreground">{contactInfo.contact.phones.join(" · ")}</span>
                                      </div>
                                    )}
                                    {contactInfo.contact?.email && (
                                      <div className="flex items-center gap-2">
                                        <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                        <a href={`mailto:${contactInfo.contact.email}`} onClick={(e) => e.stopPropagation()} className="text-primary hover:underline text-sm">{contactInfo.contact.email}</a>
                                      </div>
                                    )}
                                    {contactInfo.contact?.website && (
                                      <div className="flex items-center gap-2">
                                        <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                        <a href={contactInfo.contact.website.startsWith("http") ? contactInfo.contact.website : `https://${contactInfo.contact.website}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline text-sm truncate">{contactInfo.contact.website}</a>
                                      </div>
                                    )}
                                    {contactInfo.contact?.instagram && (
                                      <div className="flex items-center gap-2">
                                        <Instagram className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
                                        <a href={`https://instagram.com/${contactInfo.contact.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline text-sm">{contactInfo.contact.instagram}</a>
                                      </div>
                                    )}
                                    {contactInfo.contact?.linkedin_company && (
                                      <div className="flex items-center gap-2">
                                        <Linkedin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                        <a href={contactInfo.contact.linkedin_company} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline text-sm truncate">LinkedIn da Empresa</a>
                                      </div>
                                    )}
                                    {contactInfo.contact?.address && (
                                      <div className="flex items-start gap-2 sm:col-span-2">
                                        <MapPinned className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                        <span className="text-muted-foreground text-sm">{contactInfo.contact.address}</span>
                                      </div>
                                    )}
                                  </div>
                                  {/* Citations */}
                                  {contactInfo.citations && contactInfo.citations.length > 0 && (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="text-[10px] text-muted-foreground">Fontes:</span>
                                      {contactInfo.citations.slice(0, 3).map((c: string, ci: number) => (
                                        <a key={ci} href={c} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] text-primary hover:underline truncate max-w-[150px]">
                                          [{ci + 1}]
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="grid gap-6 lg:grid-cols-2">
                               <div className="space-y-4">
                                 <div>
                                  <h4 className="font-display font-semibold text-sm mb-2">Análise da IA</h4>
                                  {analysis ? (
                                    <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                                      {analysis.split('\n').map((line, i) => {
                                        // Basic markdown: **bold**, ## headers, - lists
                                        let rendered = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                                        if (line.startsWith('## ')) return <h5 key={i} className="font-semibold text-foreground mt-2 mb-1">{line.slice(3)}</h5>;
                                        if (line.startsWith('# ')) return <h4 key={i} className="font-semibold text-foreground mt-2 mb-1">{line.slice(2)}</h4>;
                                        if (line.startsWith('- ') || line.startsWith('• ')) return <li key={i} className="ml-4 list-disc">{line.slice(2)}</li>;
                                        return <span key={i} dangerouslySetInnerHTML={{ __html: rendered }} />;
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground italic">Clique em "Ver análise IA ✦" para gerar a análise.</p>
                                  )}
                                </div>
                                {recommendation && (
                                  <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
                                    <h4 className="font-display font-semibold text-sm mb-1 text-accent">Recomendação</h4>
                                    <p className="text-sm text-muted-foreground">{recommendation}</p>
                                  </div>
                                )}
                                {/* Strengths & Weaknesses */}
                                <div className="grid grid-cols-2 gap-3">
                                  {strengths.length > 0 && (
                                    <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                                      <h4 className="font-semibold text-xs mb-2 text-success flex items-center gap-1"><ThumbsUp className="w-3 h-3" />Pontos Fortes</h4>
                                      <ul className="space-y-1">
                                        {strengths.map((s, i) => <li key={i} className="text-xs text-muted-foreground">• {s}</li>)}
                                      </ul>
                                    </div>
                                  )}
                                  {weaknesses.length > 0 && (
                                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                                      <h4 className="font-semibold text-xs mb-2 text-destructive flex items-center gap-1"><ThumbsDown className="w-3 h-3" />Pontos Fracos</h4>
                                      <ul className="space-y-1">
                                        {weaknesses.map((w, i) => <li key={i} className="text-xs text-muted-foreground">• {w}</li>)}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                                {/* Company details */}
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div className="rounded-lg border p-3"><p className="text-muted-foreground">Receita</p><p className="font-semibold">{formatCurrency(m.companies?.revenue ?? null)}</p></div>
                                  <div className="rounded-lg border p-3"><p className="text-muted-foreground">EBITDA</p><p className="font-semibold">{formatCurrency(m.companies?.ebitda ?? null)}</p></div>
                                  <div className="rounded-lg border p-3"><p className="text-muted-foreground">Tamanho</p><p className="font-semibold">{m.companies?.size || "N/A"}</p></div>
                                  <div className="rounded-lg border p-3"><p className="text-muted-foreground">Risco</p><p className="font-semibold">{m.companies?.risk_level || "N/A"}</p></div>
                                </div>
                                {/* Dimension explanations */}
                                {dimension_explanations && (
                                  <div className="space-y-2">
                                    <h4 className="font-display font-semibold text-sm flex items-center gap-1"><Info className="w-4 h-4 text-primary" />Por que cada nota?</h4>
                                    <div className="space-y-1.5">
                                      {Object.entries(dimension_explanations).map(([key, explanation]) => (
                                        <div key={key} className="text-xs rounded border px-3 py-2 bg-background">
                                          <span className="font-semibold text-foreground">{dimLabels[key] || key}:</span>{" "}
                                          <span className="text-muted-foreground">{explanation}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              {dimensions && (
                                 <div>
                                   <h4 className="font-display font-semibold text-sm mb-3 text-center">Sinergias Identificadas</h4>
                                   <div className="space-y-2.5">
                                     {[
                                       { label: "Sinergia de Receita", val: dimensions.revenue_synergy },
                                       { label: "Redução de Custo", val: dimensions.cost_synergy },
                                       { label: "Verticalização", val: dimensions.vertical_synergy },
                                       { label: "Consolidação", val: dimensions.consolidation_synergy },
                                       { label: "Estratégica", val: dimensions.strategic_synergy },
                                     ].map(({ label, val }) => {
                                       const isPrimary = dimensions.synergy_type === label;
                                       return (
                                         <div key={label} className="flex items-center gap-3">
                                           <span className={`text-xs w-32 text-right truncate ${isPrimary ? "font-semibold text-accent" : "text-muted-foreground"}`}>
                                             {label} {isPrimary && "←"}
                                           </span>
                                           <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                                             <div className={`h-full rounded-full transition-all ${isPrimary ? "bg-accent" : synergyBarColor(val)}`} style={{ width: `${val}%` }} />
                                           </div>
                                           <span className={`text-xs font-mono font-medium w-8 text-right ${isPrimary ? "text-accent font-bold" : ""}`}>{val}</span>
                                         </div>
                                       );
                                     })}
                                    </div>

                                    {/* GPI — Potencial de Geração de Valor */}
                                    {dimensions.gain_insights && dimensions.gain_insights.length > 0 && (
                                      <div className="mt-4 rounded-lg border border-success/20 bg-success/5 p-3">
                                        <h4 className="font-semibold text-xs mb-2 text-success flex items-center gap-1">
                                          <TrendingUp className="w-3.5 h-3.5" />Potencial de Geração de Valor
                                        </h4>
                                        <ul className="space-y-1.5">
                                          {dimensions.gain_insights.map((insight, i) => (
                                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                              <span className="text-success mt-0.5">•</span>{insight}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Bottleneck Resolution */}
                                    {dimensions.bottleneck_resolution && (
                                      <div className="mt-3 rounded-lg border border-accent/20 bg-accent/5 p-3">
                                        <h4 className="font-semibold text-xs mb-1.5 text-accent flex items-center gap-1">
                                          <Target className="w-3.5 h-3.5" />Resolve seu Gargalo
                                        </h4>
                                        <p className="text-xs text-muted-foreground">{dimensions.bottleneck_resolution}</p>
                                      </div>
                                    )}

                                    {/* Consolidator Score */}
                                    {dimensions.consolidator_score != null && dimensions.consolidator_score > 0 && (
                                      <div className="mt-3">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Building2 className="w-3 h-3" />Consolidator Score
                                          </span>
                                          <span className={`text-xs font-mono font-bold ${dimensions.consolidator_score > 60 ? "text-warning" : "text-muted-foreground"}`}>
                                            {dimensions.consolidator_score}/100
                                          </span>
                                        </div>
                                        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all ${dimensions.consolidator_score > 60 ? "bg-warning" : "bg-muted-foreground/40"}`}
                                            style={{ width: `${dimensions.consolidator_score}%` }}
                                          />
                                        </div>
                                        {dimensions.consolidator_score > 60 && (
                                          <p className="text-[10px] text-warning mt-1">Empresa estruturada para consolidação — alto potencial de plataforma</p>
                                        )}
                                      </div>
                                    )}

                                    <div className="mt-4">
                                      <h4 className="font-display font-semibold text-sm mb-2 text-center">Radar de Compatibilidade</h4>
                                      <ResponsiveContainer width="100%" height={220}>
                                        <RadarChart data={[
                                          { dim: "Receita", value: dimensions.revenue_synergy },
                                          { dim: "Custo", value: dimensions.cost_synergy },
                                          { dim: "Vertical", value: dimensions.vertical_synergy },
                                          { dim: "Consolid.", value: dimensions.consolidation_synergy },
                                          { dim: "Estratég.", value: dimensions.strategic_synergy },
                                        ]}>
                                          <PolarGrid stroke="hsl(var(--border))" />
                                          <PolarAngleAxis dataKey="dim" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                                          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                                          <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                                        </RadarChart>
                                      </ResponsiveContainer>
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Ver mais / pagination */}
              {visibleCount < displayMatches.length && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount(prev => Math.min(prev + 20, displayMatches.length))}
                    className="gap-2"
                  >
                    Ver mais ({displayMatches.length - visibleCount} restantes)
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ========== TAB 3: ANALYTICS ========== */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          {matches.length === 0 ? (
            <Card className="py-16 flex flex-col items-center justify-center text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-display font-semibold">Sem dados ainda</h3>
              <p className="text-muted-foreground mt-1">Execute o matching primeiro para ver as análises.</p>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="font-display text-base">Distribuição de Scores</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={scoreDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="range" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} allowDecimals={false} />
                      <RechartsTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="font-display text-base">Matches por Setor</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={sectorDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {sectorDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="font-display text-base">Atividade Recente</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {criteriaHistory.map((c: any) => (
                      <div key={c.id} className="flex items-center gap-4 rounded-lg border p-3">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{sectorLabel(c.target_sector) || "Todos"} · {c.target_location || "Brasil"}</p>
                          <p className="text-xs text-muted-foreground">Receita: {c.min_revenue ? formatCurrency(c.min_revenue) : "Qualquer"} – {c.max_revenue ? formatCurrency(c.max_revenue) : "Qualquer"}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
