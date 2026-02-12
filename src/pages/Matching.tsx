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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Search, Zap, Star, X, ChevronDown, ChevronUp, BarChart3, Target, TrendingUp, Globe, Building2, DollarSign, Shield, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";

const sectors = ["Technology", "Healthcare", "Finance", "Manufacturing", "Energy", "Retail", "Real Estate", "Agribusiness", "Logistics", "Telecom", "Education", "Other"];
const regions = ["Brazil", "Latin America", "North America", "Europe", "Asia-Pacific", "Middle East & Africa", "Global"];
const companySizes = ["Startup", "Small", "Medium", "Large", "Enterprise"];
const riskLevels = ["Low", "Medium", "High"];

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
  } | null;
}

export default function Matching() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("criteria");
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [minScoreFilter, setMinScoreFilter] = useState([0]);

  const [criteria, setCriteria] = useState({
    target_sector: "",
    target_size: "",
    target_location: "",
    min_revenue: "",
    max_revenue: "",
    min_ebitda: "",
    max_ebitda: "",
    risk_level: "",
    notes: "",
  });

  // Fetch companies
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch matches with company details
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

  // Fetch saved criteria history
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

  // Pre-filter companies based on criteria
  const filteredCompanies = useMemo(() => {
    let filtered = [...companies];
    if (criteria.target_sector) filtered = filtered.filter((c) => c.sector === criteria.target_sector);
    if (criteria.min_revenue) filtered = filtered.filter((c) => (c.revenue ?? 0) >= Number(criteria.min_revenue));
    if (criteria.max_revenue) filtered = filtered.filter((c) => (c.revenue ?? Infinity) <= Number(criteria.max_revenue));
    if (criteria.min_ebitda) filtered = filtered.filter((c) => (c.ebitda ?? 0) >= Number(criteria.min_ebitda));
    if (criteria.max_ebitda) filtered = filtered.filter((c) => (c.ebitda ?? Infinity) <= Number(criteria.max_ebitda));
    if (criteria.target_size) filtered = filtered.filter((c) => c.size === criteria.target_size);
    return filtered;
  }, [companies, criteria]);

  // Run matching mutation with dedup
  const runMatchMutation = useMutation({
    mutationFn: async () => {
      if (filteredCompanies.length === 0) throw new Error("No companies match your criteria. Add companies or broaden your filters.");

      // Save criteria
      await supabase.from("match_criteria").insert({
        user_id: user!.id,
        target_sector: criteria.target_sector || null,
        target_size: criteria.target_size || null,
        target_location: criteria.target_location || null,
        min_revenue: criteria.min_revenue ? Number(criteria.min_revenue) : null,
        max_revenue: criteria.max_revenue ? Number(criteria.max_revenue) : null,
        min_ebitda: criteria.min_ebitda ? Number(criteria.min_ebitda) : null,
        max_ebitda: criteria.max_ebitda ? Number(criteria.max_ebitda) : null,
        notes: criteria.notes || null,
      });

      // Dedup: delete old "new" matches
      await supabase.from("matches").delete().eq("buyer_id", user!.id).eq("status", "new");

      // Call AI
      const { data, error } = await supabase.functions.invoke("ai-analyze", {
        body: { type: "match", data: { criteria, companies: filteredCompanies } },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const results = Array.isArray(data.result) ? data.result : [];
      for (const match of results) {
        const company = filteredCompanies.find((c) => c.id === match.company_id);
        if (company) {
          await supabase.from("matches").insert({
            buyer_id: user!.id,
            seller_company_id: company.id,
            compatibility_score: match.compatibility_score,
            ai_analysis: JSON.stringify({
              analysis: match.analysis,
              dimensions: match.dimensions,
              recommendation: match.recommendation,
            }),
            status: "new",
          });
        }
      }
      return results.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["match_criteria"] });
      setActiveTab("results");
      toast({ title: "Matching completo!", description: `${count} empresas analisadas pela IA.` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("matches").update({ status }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["matches"] });
  };

  // Parse AI analysis JSON safely
  const parseAnalysis = (raw: string | null): { analysis: string; dimensions: MatchDimensions | null; recommendation: string } => {
    if (!raw) return { analysis: "", dimensions: null, recommendation: "" };
    try {
      const parsed = JSON.parse(raw);
      return {
        analysis: parsed.analysis || raw,
        dimensions: parsed.dimensions || null,
        recommendation: parsed.recommendation || "",
      };
    } catch {
      return { analysis: raw, dimensions: null, recommendation: "" };
    }
  };

  // Filtered matches for results tab
  const displayMatches = useMemo(() => {
    let result = [...matches];
    if (statusFilter !== "all") result = result.filter((m) => m.status === statusFilter);
    result = result.filter((m) => Number(m.compatibility_score) >= minScoreFilter[0]);
    return result;
  }, [matches, statusFilter, minScoreFilter]);

  // Analytics data
  const scoreDistribution = useMemo(() => {
    const buckets = [
      { range: "0-20", count: 0 },
      { range: "21-40", count: 0 },
      { range: "41-60", count: 0 },
      { range: "61-80", count: 0 },
      { range: "81-100", count: 0 },
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
    matches.forEach((m) => {
      const sector = m.companies?.sector || "Unknown";
      map[sector] = (map[sector] || 0) + 1;
    });
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
      target_location: saved.target_location || "",
      min_revenue: saved.min_revenue?.toString() || "",
      max_revenue: saved.max_revenue?.toString() || "",
      min_ebitda: saved.min_ebitda?.toString() || "",
      max_ebitda: saved.max_ebitda?.toString() || "",
      risk_level: "",
      notes: saved.notes || "",
    });
    toast({ title: "Critérios carregados", description: "Critérios anteriores foram restaurados." });
  };

  const formatCurrency = (val: number | null) => {
    if (val == null) return "N/A";
    if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
    return `$${val}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Matching Comprador-Vendedor</h1>
        <p className="text-muted-foreground mt-1">Motor de matching de aquisições com inteligência artificial e análise multidimensional</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="criteria" className="gap-2"><Target className="w-4 h-4" />Critérios & Busca</TabsTrigger>
          <TabsTrigger value="results" className="gap-2">
            <Search className="w-4 h-4" />Resultados
            {matches.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{matches.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2"><BarChart3 className="w-4 h-4" />Analytics</TabsTrigger>
        </TabsList>

        {/* ========== TAB 1: CRITERIA ========== */}
        <TabsContent value="criteria" className="space-y-6 mt-6">
          {/* Saved criteria history */}
          {criteriaHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-display">Critérios Anteriores</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {criteriaHistory.map((c: any) => (
                  <Button key={c.id} variant="outline" size="sm" onClick={() => loadCriteria(c)} className="text-xs">
                    {c.target_sector || "Any"} · {c.target_location || "Global"} · {new Date(c.created_at).toLocaleDateString()}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left column: strategic criteria */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2"><Globe className="w-5 h-5 text-accent" />Critérios Estratégicos</CardTitle>
                <CardDescription>Defina o perfil do seu alvo de aquisição ideal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Setor Alvo</Label>
                    <Select value={criteria.target_sector} onValueChange={(v) => setCriteria({ ...criteria, target_sector: v })}>
                      <SelectTrigger><SelectValue placeholder="Qualquer setor" /></SelectTrigger>
                      <SelectContent>{sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Região</Label>
                    <Select value={criteria.target_location} onValueChange={(v) => setCriteria({ ...criteria, target_location: v })}>
                      <SelectTrigger><SelectValue placeholder="Global" /></SelectTrigger>
                      <SelectContent>{regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tamanho da Empresa</Label>
                    <Select value={criteria.target_size} onValueChange={(v) => setCriteria({ ...criteria, target_size: v })}>
                      <SelectTrigger><SelectValue placeholder="Qualquer tamanho" /></SelectTrigger>
                      <SelectContent>{companySizes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tolerância ao Risco</Label>
                    <Select value={criteria.risk_level} onValueChange={(v) => setCriteria({ ...criteria, risk_level: v })}>
                      <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>{riskLevels.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                    <Label>Notas Estratégicas</Label>
                  <Textarea
                    value={criteria.notes}
                    onChange={(e) => setCriteria({ ...criteria, notes: e.target.value })}
                    placeholder="Ex.: Buscando empresas com receita recorrente forte, idealmente SaaS, com equipe de gestão comprovada..."
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Right column: financial criteria */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2"><DollarSign className="w-5 h-5 text-primary" />Parâmetros Financeiros</CardTitle>
                <CardDescription>Defina limites de receita e lucratividade</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Receita Mín. ($)</Label>
                    <Input type="number" value={criteria.min_revenue} onChange={(e) => setCriteria({ ...criteria, min_revenue: e.target.value })} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Receita Máx. ($)</Label>
                    <Input type="number" value={criteria.max_revenue} onChange={(e) => setCriteria({ ...criteria, max_revenue: e.target.value })} placeholder="Sem limite" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>EBITDA Mín. ($)</Label>
                    <Input type="number" value={criteria.min_ebitda} onChange={(e) => setCriteria({ ...criteria, min_ebitda: e.target.value })} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>EBITDA Máx. ($)</Label>
                    <Input type="number" value={criteria.max_ebitda} onChange={(e) => setCriteria({ ...criteria, max_ebitda: e.target.value })} placeholder="Sem limite" />
                  </div>
                </div>

                {/* Pre-filter preview */}
                <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    Pré-visualização de Filtro
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{filteredCompanies.length}</span> de {companies.length} empresas correspondem aos seus critérios
                  </p>
                  <Progress value={companies.length > 0 ? (filteredCompanies.length / companies.length) * 100 : 0} className="h-2" />
                </div>

                <Button
                  onClick={() => runMatchMutation.mutate()}
                  disabled={runMatchMutation.isPending || filteredCompanies.length === 0}
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  {runMatchMutation.isPending ? "Analisando com IA..." : `Executar Matching IA (${filteredCompanies.length} empresas)`}
                </Button>
                {runMatchMutation.isPending && (
                  <div className="space-y-2">
                    <Progress value={undefined} className="h-1 animate-pulse" />
                    <p className="text-xs text-center text-muted-foreground">A IA está avaliando cada empresa em 5 dimensões...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ========== TAB 2: RESULTS ========== */}
        <TabsContent value="results" className="space-y-6 mt-6">
          {matchesLoading ? (
            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : matches.length === 0 ? (
            <Card className="py-16 flex flex-col items-center justify-center text-center">
              <Search className="w-12 h-12 text-muted-foreground mb-4" />
               <h3 className="text-lg font-display font-semibold">Nenhum match ainda</h3>
              <p className="text-muted-foreground mt-1 max-w-sm">Defina seus critérios e execute o matching IA para descobrir alvos de aquisição compatíveis.</p>
              <Button className="mt-4" onClick={() => setActiveTab("criteria")}>
                <Target className="w-4 h-4 mr-2" />Ir para Critérios
              </Button>
            </Card>
          ) : (
            <>
              {/* Stats row */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total de Matches</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-bold">{matches.length}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Score Médio</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-bold">{avgScore}%</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Alta Compatibilidade</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-success">{highMatches}</p>
                    <p className="text-xs text-muted-foreground">Score ≥ 70%</p>
                  </CardContent>
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

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">Status:</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="new">Novos</SelectItem>
                      <SelectItem value="saved">Salvos</SelectItem>
                      <SelectItem value="dismissed">Dispensados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 flex-1 max-w-xs">
                  <Label className="text-sm whitespace-nowrap">Score Mín.: {minScoreFilter[0]}%</Label>
                  <Slider value={minScoreFilter} onValueChange={setMinScoreFilter} max={100} step={5} className="flex-1" />
                </div>
                <p className="text-sm text-muted-foreground ml-auto">{displayMatches.length} resultados</p>
              </div>

              {/* Results table */}
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">EBITDA</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayMatches.map((m) => {
                      const { analysis, dimensions, recommendation } = parseAnalysis(m.ai_analysis);
                      const isExpanded = expandedMatch === m.id;
                      const score = Number(m.compatibility_score);

                      return (
                        <>
                          <TableRow
                            key={m.id}
                            className={`cursor-pointer hover:bg-muted/50 transition-colors ${m.status === "dismissed" ? "opacity-40" : ""}`}
                            onClick={() => setExpandedMatch(isExpanded ? null : m.id)}
                          >
                            <TableCell className="font-medium">{m.companies?.name || "Desconhecido"}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{m.companies?.sector || "—"}</Badge></TableCell>
                            <TableCell className="text-sm text-muted-foreground">{m.companies?.location || "—"}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(m.companies?.revenue ?? null)}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(m.companies?.ebitda ?? null)}</TableCell>
                            <TableCell className="text-center">
                              <Badge className={score >= 70 ? "bg-success/15 text-success border-0" : score >= 40 ? "bg-warning/15 text-warning border-0" : "bg-destructive/15 text-destructive border-0"}>
                                {score}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={m.status === "saved" ? "default" : "secondary"} className="text-xs capitalize">{m.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); updateStatus(m.id, "saved"); }} disabled={m.status === "saved"} className="h-8 w-8">
                                  <Star className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); updateStatus(m.id, "dismissed"); }} className="h-8 w-8">
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${m.id}-detail`}>
                              <TableCell colSpan={8} className="bg-muted/30 p-6">
                                <div className="grid gap-6 lg:grid-cols-2">
                                  {/* Left: Analysis text */}
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
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div className="rounded-lg border p-3">
                                        <p className="text-muted-foreground">Receita</p>
                                        <p className="font-semibold">{formatCurrency(m.companies?.revenue ?? null)}</p>
                                      </div>
                                      <div className="rounded-lg border p-3">
                                        <p className="text-muted-foreground">EBITDA</p>
                                        <p className="font-semibold">{formatCurrency(m.companies?.ebitda ?? null)}</p>
                                      </div>
                                      <div className="rounded-lg border p-3">
                                        <p className="text-muted-foreground">Tamanho</p>
                                        <p className="font-semibold">{m.companies?.size || "N/A"}</p>
                                      </div>
                                      <div className="rounded-lg border p-3">
                                        <p className="text-muted-foreground">Nível de Risco</p>
                                        <p className="font-semibold">{m.companies?.risk_level || "N/A"}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right: Radar chart */}
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
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
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
              {/* Score distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-base">Distribuição de Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={scoreDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="range" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Sector breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-base">Matches por Setor</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={sectorDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {sectorDistribution.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Match history timeline */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="font-display text-base">Atividade Recente de Matching</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {criteriaHistory.map((c: any) => (
                      <div key={c.id} className="flex items-center gap-4 rounded-lg border p-3">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{c.target_sector || "Todos os setores"} · {c.target_location || "Global"}</p>
                          <p className="text-xs text-muted-foreground">
                            Revenue: {c.min_revenue ? formatCurrency(c.min_revenue) : "Any"} – {c.max_revenue ? formatCurrency(c.max_revenue) : "Any"}
                          </p>
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
