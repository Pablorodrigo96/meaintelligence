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
import { Search, Zap, Star, X, ChevronDown, ChevronUp, BarChart3, Target, TrendingUp, Globe, Building2, DollarSign, Shield, Filter, MapPin, Microscope, Info, UserCheck, CheckCircle2, ArrowRight, ArrowLeft, RotateCcw, ThumbsUp, ThumbsDown, Trophy, Database, Sparkles, Loader2, BrainCircuit, PencilLine, Bookmark, Phone, AlertCircle } from "lucide-react";
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
  { label: "Buscando no banco nacional...", pct: 15 },
  { label: "Aplicando filtros determinísticos...", pct: 40 },
  { label: "Calculando scores de compatibilidade...", pct: 70 },
  { label: "Salvando resultados...", pct: 90 },
];

type SearchSource = "carteira" | "nacional";

interface FunnelStats {
  db_fetched: number;
  pre_filtered: number;
  ai_analyzed: number;
  final_matches: number;
}

function FunnelCard({ stats, open, onToggle }: { stats: FunnelStats; open: boolean; onToggle: () => void }) {
  const steps = [
    { label: "Base Nacional", icon: Database, value: stats.db_fetched, color: "text-primary", bg: "bg-primary/10" },
    { label: "Filtro BD", icon: Filter, value: stats.db_fetched, color: "text-accent", bg: "bg-accent/10" },
    { label: "Pré-score", icon: Zap, value: stats.pre_filtered, color: "text-warning", bg: "bg-warning/10" },
    { label: "Analisados", icon: Search, value: stats.ai_analyzed, color: "text-success", bg: "bg-success/10" },
    { label: "Matches", icon: Star, value: stats.final_matches, color: "text-primary", bg: "bg-primary/10" },
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
  const [wizardStep, setWizardStep] = useState(1);
  const [progressStep, setProgressStep] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [geoOpen, setGeoOpen] = useState(false);
  const [searchSource, setSearchSource] = useState<SearchSource>("carteira");
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
        companiesToAnalyze = nationalData?.companies || [];
        setNationalCompanies(companiesToAnalyze);
        setFunnelStats({ db_fetched: nationalData?.db_count || companiesToAnalyze.length, pre_filtered: 0, ai_analyzed: 0, final_matches: 0 });
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
      const top25 = scored.sort((a, b) => b.compatibility_score - a.compatibility_score).slice(0, 25);
      setFunnelStats(prev => prev
        ? { ...prev, pre_filtered: top25.length, ai_analyzed: 0, final_matches: 0 }
        : { db_fetched: companiesToAnalyze.length, pre_filtered: top25.length, ai_analyzed: 0, final_matches: 0 }
      );

      // ── PERSIST RESULTS ────────────────────────────────────────────────
      advanceProgress(4);
      let savedCount = 0;
      for (const { company, compatibility_score, dimensions } of top25) {
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
      toast({ title: "Matching completo!", description: `${count} empresas encontradas. Clique em "Ver análise IA ✦" para enriquecer individualmente.` });
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
        analysis: result.analysis || result,
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

  const parseAnalysis = (raw: string | null): { analysis: string; dimensions: MatchDimensions | null; dimension_explanations: DimensionExplanations | null; recommendation: string; strengths: string[]; weaknesses: string[]; ai_enriched: boolean } => {
    if (!raw) return { analysis: "", dimensions: null, dimension_explanations: null, recommendation: "", strengths: [], weaknesses: [], ai_enriched: false };
    try {
      const parsed = JSON.parse(raw);
      return {
        analysis: parsed.analysis || "",
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
    return result;
  }, [matches, statusFilter, minScoreFilter]);

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

  const shortlistCount = matches.filter(m => m.status === "saved").length;

  const formatCurrency = (val: number | null) => {
    if (val == null) return "N/A";
    if (val >= 1e9) return `R$${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `R$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `R$${(val / 1e3).toFixed(0)}K`;
    return `R$${val}`;
  };

  // ── LOOKUP LOCAL DE INTENÇÃO (zero IA, zero custo) ──────────────────────
  const KEYWORD_MAP = [
    { keywords: ["consultoria financeira", "gestão financeira", "assessoria financeira", "bpo financeiro", "escritório contábil", "contabilidade"], cnae_prefixes: ["69", "70"], sector: "Finance", subtype: "Consulting" },
    { keywords: ["banco", "financeira", "crédito", "empréstimo", "fintec"], cnae_prefixes: ["64"], sector: "Finance", subtype: "Banking" },
    { keywords: ["seguro", "previdência", "seguradora"], cnae_prefixes: ["65"], sector: "Finance", subtype: "Insurance" },
    { keywords: ["software", "tecnologia", "ti ", " ti,", "sistemas", "saas", "startup de tech", "desenvolvimento", "app", "aplicativo"], cnae_prefixes: ["62", "63"], sector: "Technology", subtype: "Software" },
    { keywords: ["saúde", "clínica", "hospital", "farmácia", "laboratório", "medicina", "odontologia", "dentista"], cnae_prefixes: ["86", "87", "88"], sector: "Healthcare", subtype: "Health" },
    { keywords: ["educação", "escola", "ensino", "cursos", "treinamento", "faculdade", "universidade"], cnae_prefixes: ["85"], sector: "Education", subtype: "Education" },
    { keywords: ["construção", "incorporação", "obra", "imóvel", "imobiliária", "construtora"], cnae_prefixes: ["41", "42", "43"], sector: "Real Estate", subtype: "Construction" },
    { keywords: ["logística", "transporte", "frete", "distribuição", "armazém", "estoque"], cnae_prefixes: ["49", "50", "51", "52"], sector: "Logistics", subtype: "Logistics" },
    { keywords: ["comércio", "varejo", "loja", "venda", "atacado", "distribuidora"], cnae_prefixes: ["45", "46", "47"], sector: "Retail", subtype: "Retail" },
    { keywords: ["agro", "agricultura", "pecuária", "fazenda", "agronegócio", "soja", "milho", "café"], cnae_prefixes: ["01", "02", "03"], sector: "Agribusiness", subtype: "Agro" },
    { keywords: ["energia", "elétrica", "solar", "geração", "eólica", "fotovoltaico"], cnae_prefixes: ["35"], sector: "Energy", subtype: "Energy" },
    { keywords: ["telecom", "telecomunicações", "internet", "fibra", "provedor"], cnae_prefixes: ["61"], sector: "Telecom", subtype: "Telecom" },
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
    const maxCapital = buyerRevenueBrl ? buyerRevenueBrl * 0.5 : null;
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

    // sector_fit
    const sectorExact = targetSector && company.sector === targetSector;
    const sectorAdjacent = targetSector && SECTOR_ADJACENCY[targetSector]?.includes(company.sector);
    const companyCnae = company.cnae_fiscal_principal || company.description?.match(/CNAE: (\d+)/)?.[1] || "";
    const cnaeBonus = cnaePrefixes.length > 0 && cnaePrefixes.some((p: string) => String(companyCnae).startsWith(p));
    const sector_fit = sectorExact ? 90 : cnaeBonus ? 75 : sectorAdjacent ? 65 : targetSector ? 30 : 60;

    // size_fit
    const sizeOrder = ["Startup", "Small", "Medium", "Large", "Enterprise"];
    const diff = targetSize ? Math.abs(sizeOrder.indexOf(company.size || "") - sizeOrder.indexOf(targetSize)) : 0;
    const size_fit = !targetSize ? 60 : diff === 0 ? 95 : diff === 1 ? 75 : diff === 2 ? 50 : 25;

    // location_fit
    const location_fit = !targetState ? 60 : company.state === targetState ? 90 : 45;

    // financial_fit (sem dados reais = neutro)
    const financial_fit = company.revenue && company.ebitda ? 70 : company.revenue ? 60 : 50;

    // risk_fit (neutro sem dados reais)
    const risk_fit = 55;

    // Pesos ajustados para dados ausentes
    const hasRealFinancials = !!(company.revenue && company.ebitda);
    const weights = { ...(PROFILE_WEIGHTS[investorProfile] || PROFILE_WEIGHTS["Moderado"]) };
    if (!hasRealFinancials) {
      const reduction = weights.financial * 0.4;
      weights.financial -= reduction;
      weights.sector += reduction / 2;
      weights.size += reduction / 2;
    }

    const compatibility_score = Math.round(
      sector_fit * weights.sector +
      size_fit * weights.size +
      financial_fit * weights.financial +
      location_fit * weights.location +
      risk_fit * weights.risk
    );

    return {
      compatibility_score: Math.min(100, Math.max(0, compatibility_score)),
      dimensions: { sector_fit, size_fit, location_fit, financial_fit, risk_fit },
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
  };

  const scoreColor = (score: number) =>
    score >= 70 ? "text-success" : score >= 40 ? "text-warning" : "text-destructive";
  const scoreBg = (score: number) =>
    score >= 70 ? "bg-success/15 text-success border-success/30" : score >= 40 ? "bg-warning/15 text-warning border-warning/30" : "bg-destructive/15 text-destructive border-destructive/30";

  // Active filter count for collapsible headers
  const financialFilterCount = [criteria.min_revenue, criteria.max_revenue, criteria.min_ebitda, criteria.max_ebitda].filter(Boolean).length;
  const geoFilterCount = [criteria.target_state, criteria.geo_reference_city, !criteria.no_geo_limit ? "1" : ""].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Matching Comprador-Vendedor</h1>
        <p className="text-muted-foreground mt-1">Motor de matching com IA e análise multidimensional</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="criteria" className="gap-2"><Target className="w-4 h-4" />Critérios</TabsTrigger>
          <TabsTrigger value="results" className="gap-2">
            <Search className="w-4 h-4" />Resultados
            {matches.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{matches.length}</Badge>}
            {shortlistCount > 0 && <Badge className="ml-1 text-xs bg-success/20 text-success border-success/30">{shortlistCount} ★</Badge>}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2"><BarChart3 className="w-4 h-4" />Analytics</TabsTrigger>
        </TabsList>

        {/* ========== TAB 1: CRITERIA - WIZARD ========== */}
        <TabsContent value="criteria" className="space-y-6 mt-6">
          {/* Progress indicator */}
          <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-1 p-1 rounded-lg bg-muted w-fit">
                <button
                  onClick={() => setSearchSource("carteira")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
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
                  <CardDescription>Define como a IA prioriza as dimensões de compatibilidade</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
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

              <Card>
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2 text-base"><Target className="w-5 h-5 text-accent" />Alvo Principal</CardTitle>
                  <CardDescription>Setor e tamanho desejado (essencial)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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
                      <p className="text-xs text-muted-foreground">Risco</p>
                      <p className="font-semibold text-sm">{riskLevels.find((r) => r.value === criteria.risk_level)?.label || "Qualquer"}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Empresas</p>
                      <p className="font-semibold text-sm">{filteredCompanies.length} de {companies.length}</p>
                    </div>
                  </div>
                  {criteria.notes && (
                    <div className="mt-3 rounded-lg border p-3 bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Notas Estratégicas</p>
                      <p className="text-sm">{criteria.notes}</p>
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
              <div className="grid gap-4 md:grid-cols-4">
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
              <div className="flex flex-wrap items-center gap-4">
                <Button onClick={() => setDeepDiveOpen(true)} variant="outline" className="border-primary/30 hover:bg-primary/5 gap-2">
                  <Microscope className="w-4 h-4" />Aprofundar Top 10
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
                <div className="flex items-center gap-2 flex-1 max-w-xs">
                  <Label className="text-sm whitespace-nowrap">Min: {minScoreFilter[0]}%</Label>
                  <Slider value={minScoreFilter} onValueChange={setMinScoreFilter} max={100} step={5} className="flex-1" />
                </div>
                <p className="text-sm text-muted-foreground ml-auto">{displayMatches.length} resultados</p>
              </div>

              {/* Cards grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {displayMatches.map((m, idx) => {
                   const parsedData = parseAnalysis(m.ai_analysis);
                   const { analysis, dimensions, dimension_explanations, recommendation, strengths, weaknesses, ai_enriched } = parsedData;
                   const isFromNational = (() => { try { return JSON.parse(m.ai_analysis || "{}").source === "national_db"; } catch { return false; } })();
                   const isExpanded = expandedMatch === m.id;
                   const score = Number(m.compatibility_score);
                   const completeness = m.companies ? calcCompleteness(m.companies) : 0;
                   const isTop3 = idx < 3 && score >= 60;
                   const isFeedbackLoading = (action: string) => feedbackLoading[m.id] === action;
                   const isAiEnriching = aiEnrichingMatch === m.id;

                  return (
                     <Card
                       key={m.id}
                       className={`cursor-pointer transition-all hover:shadow-md ${
                         isTop3 ? "ring-2 ring-warning/50 border-warning/30" : ""
                       } ${m.status === "dismissed" ? "opacity-50" : ""} ${isExpanded ? "md:col-span-2 lg:col-span-3" : ""}`}
                       onClick={() => {
                         setExpandedMatch(isExpanded ? null : m.id);
                         if (!isExpanded && m.companies?.id) {
                           recordFeedback(m.id, m.companies.id, "clicked", idx + 1);
                         }
                       }}
                     >
                       <CardContent className="pt-5">
                         <div className="flex items-start justify-between mb-3">
                           <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2 mb-1">
                               {isTop3 && <Trophy className="w-4 h-4 text-warning flex-shrink-0" />}
                               <h3 className="font-display font-semibold text-sm truncate">{m.companies?.name || "Desconhecido"}</h3>
                             </div>
                             <div className="flex items-center gap-2 flex-wrap">
                               <Badge variant="outline" className="text-xs">{sectorLabel(m.companies?.sector || null)}</Badge>
                               {m.companies?.state && <span className="text-xs text-muted-foreground">{m.companies.city ? `${m.companies.city}, ` : ""}{m.companies.state}</span>}
                               {/* Data source badge */}
                               {isFromNational && (
                                 <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground">
                                   <AlertCircle className="w-2.5 h-2.5 mr-0.5" />Dados estimados
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
                         <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                           <span>Receita: {formatCurrency(m.companies?.revenue ?? null)}</span>
                           <span>·</span>
                           <span>EBITDA: {formatCurrency(m.companies?.ebitda ?? null)}</span>
                           <span>·</span>
                           <Badge variant={completeness >= 60 ? "secondary" : "outline"} className={`text-[10px] ${completeness < 40 ? "text-warning" : ""}`}>
                             {completeness}% dados
                           </Badge>
                         </div>

                         {/* Mini radar chart */}
                         {dimensions && !isExpanded && (
                           <div className="flex justify-center">
                             <ResponsiveContainer width={130} height={100}>
                               <RadarChart data={[
                                 { dim: "Fin", value: dimensions.financial_fit },
                                 { dim: "Set", value: dimensions.sector_fit },
                                 { dim: "Tam", value: dimensions.size_fit },
                                 { dim: "Loc", value: dimensions.location_fit },
                                 { dim: "Ris", value: dimensions.risk_fit },
                               ]}>
                                 <PolarGrid stroke="hsl(var(--border))" />
                                 <PolarAngleAxis dataKey="dim" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
                                 <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                                 <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={1.5} />
                               </RadarChart>
                             </ResponsiveContainer>
                           </div>
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
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            </div>
                          </div>

                         {/* Expanded detail */}
                         {isExpanded && (
                           <div className="mt-4 pt-4 border-t space-y-4">
                             {/* Data confidence notice */}
                             {isFromNational && (
                               <div className="rounded-lg border border-muted-foreground/20 bg-muted/30 px-3 py-2 flex items-center gap-2">
                                 <AlertCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                 <p className="text-xs text-muted-foreground">
                                   <span className="font-medium">Dados estimados — capital social proxy.</span> Receita e EBITDA são estimativas baseadas em capital social. Financial_fit calculado com peso reduzido.
                                 </p>
                               </div>
                             )}
                             <div className="grid gap-6 lg:grid-cols-2">
                               <div className="space-y-4">
                                 <div>
                                  <h4 className="font-display font-semibold text-sm mb-2">Análise da IA</h4>
                                  <p className="text-sm text-muted-foreground leading-relaxed">{analysis}</p>
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
                                  <h4 className="font-display font-semibold text-sm mb-2 text-center">Dimensões de Compatibilidade</h4>
                                  <ResponsiveContainer width="100%" height={280}>
                                    <RadarChart data={[
                                      { dim: "Financeiro", value: dimensions.financial_fit },
                                      { dim: "Setor", value: dimensions.sector_fit },
                                      { dim: "Tamanho", value: dimensions.size_fit },
                                      { dim: "Localização", value: dimensions.location_fit },
                                      { dim: "Risco", value: dimensions.risk_fit },
                                    ]}>
                                      <PolarGrid stroke="hsl(var(--border))" />
                                      <PolarAngleAxis dataKey="dim" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                                      <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                                    </RadarChart>
                                  </ResponsiveContainer>
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
