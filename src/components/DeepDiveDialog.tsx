import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Microscope, Building2, Users, MapPin, Calendar, TrendingUp,
  AlertTriangle, CheckCircle, XCircle, Zap, BarChart3, DollarSign,
  Activity, ShieldAlert, ShieldCheck, TrendingDown, Flame,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { logApiUsage } from "@/lib/logApiUsage";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Intelligence {
  capital_cluster: { label: string; tier: number };
  employee_cluster: string;
  estimated_employees: number;
  avg_salary_brl: number;
  monthly_payroll_brl: number;
  annual_payroll_brl: number;
  maturity_signal: { signal: string; label: string; insight: string };
  business_model: { model_label: string; margin_profile: string; payroll_pct: number; rev_per_employee: number };
  revenue_method1_brl: number;
  revenue_method2_brl: number;
  convergence_pct: number;
  confidence_score: number;
  alerts: { severity: "high" | "medium" | "low"; message: string }[];
}

interface DeepDiveResult {
  company_id: string;
  company_name: string;
  has_cnpj: boolean;
  cnpj_formatted?: string;
  error: string | null;
  public_data: {
    razao_social: string;
    nome_fantasia: string;
    capital_social: number;
    porte: string;
    natureza_juridica: string;
    cnae_fiscal: number;
    cnae_descricao: string;
    sector_mapped: string;
    municipio: string;
    uf: string;
    situacao_cadastral: string;
    situacao_ativa: boolean;
    data_abertura: string;
    years_active: number | null;
    qsa: { nome: string; qualificacao: string }[];
  } | null;
  revenue_estimate: {
    estimated_revenue_brl: number;
    benchmark_sector: number;
    sector: string;
    regime: string;
    regime_factor: number;
    capital_ratio: number;
    location_factor: number;
    location_label: string;
    confidence_score: number;
    formula: string;
  } | null;
  intelligence: Intelligence | null;
}

interface DeepDiveDialogProps {
  companies: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatBRL(val: number): string {
  if (val >= 1_000_000) return `R$ ${(val / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (val >= 1_000) return `R$ ${(val / 1_000).toFixed(0).replace(".", ",")}k`;
  return `R$ ${val.toLocaleString("pt-BR")}`;
}

function formatBRLFull(val: number): string {
  return `R$ ${val.toLocaleString("pt-BR")}`;
}

// Tier → color classes (using semantic tokens)
function tierColor(tier: number): string {
  const map: Record<number, string> = {
    1: "bg-muted text-muted-foreground border-border",
    2: "bg-muted text-muted-foreground border-border",
    3: "bg-primary/10 text-primary border-primary/20",
    4: "bg-primary/20 text-primary border-primary/30",
    5: "bg-chart-2/20 text-chart-2 border-chart-2/30",
    6: "bg-chart-1/20 text-chart-1 border-chart-1/30",
  };
  return map[tier] || "bg-muted text-muted-foreground";
}

function maturityColor(signal: string): string {
  const map: Record<string, string> = {
    crescimento_acelerado: "bg-chart-2/15 text-chart-2 border-chart-2/25",
    maturidade_consolidada: "bg-primary/15 text-primary border-primary/25",
    estagnacao_estrutural: "bg-destructive/15 text-destructive border-destructive/25",
    startup_nascente: "bg-warning/15 text-warning border-warning/25",
  };
  return map[signal] || "bg-muted text-muted-foreground";
}

function maturityIcon(signal: string) {
  if (signal === "crescimento_acelerado") return <Flame className="w-3 h-3" />;
  if (signal === "maturidade_consolidada") return <ShieldCheck className="w-3 h-3" />;
  if (signal === "estagnacao_estrutural") return <TrendingDown className="w-3 h-3" />;
  return <Activity className="w-3 h-3" />;
}

function alertColor(severity: "high" | "medium" | "low"): string {
  if (severity === "high") return "border-destructive/30 bg-destructive/5 text-destructive";
  if (severity === "medium") return "border-warning/30 bg-warning/5 text-warning";
  return "border-border bg-muted/30 text-muted-foreground";
}

function convergenceLabel(pct: number): { label: string; color: string } {
  if (pct >= 70) return { label: "Alta confiança", color: "text-primary" };
  if (pct >= 50) return { label: "Confiança moderada", color: "text-warning" };
  return { label: "Baixa confiança", color: "text-destructive" };
}

// ─── Component ────────────────────────────────────────────────────────────────
export function DeepDiveDialog({ companies, open, onOpenChange }: DeepDiveDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [results, setResults] = useState<DeepDiveResult[] | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const companiesWithCnpj = companies.filter((c) => c.cnpj);
  const noCnpjAvailable = companiesWithCnpj.length === 0;

  const runDeepDive = async () => {
    setLoading(true);
    setResults(null);
    setAiAnalysis(null);
    setProgressMsg("Preparando análise...");
    try {
      const top10 = companies.slice(0, 10);
      setProgressMsg(`Processando ${top10.length} empresas (${companiesWithCnpj.length > 10 ? 10 : companiesWithCnpj.length} com CNPJ)...`);
      const { data, error } = await supabase.functions.invoke("company-deep-dive", {
        body: { companies: top10 },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setResults(data.results || []);
      setAiAnalysis(data.ai_analysis || null);
      setProgressMsg("");
      if (user?.id) logApiUsage(user.id, "deep-dive", "company-deep-dive");
    } catch (e: any) {
      toast({ title: "Erro no aprofundamento", description: e.message, variant: "destructive" });
      setProgressMsg("");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen && !results && !loading) {
      runDeepDive();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Microscope className="w-5 h-5 text-primary" />
            Aprofundamento Top 10 — Motor de Inteligência
          </DialogTitle>
        </DialogHeader>

        {/* No CNPJ warning */}
        {!loading && !results && noCnpjAvailable && (
          <div className="py-8 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-warning mx-auto" />
            <p className="text-sm font-medium">Nenhuma empresa do Top 10 possui CNPJ cadastrado.</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Adicione CNPJs na página de <span className="font-semibold">Empresas</span> para ativar o Motor de Inteligência com dados públicos reais (Capital Social, CNAE, QSA, etc.).
            </p>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4 py-8">
            <div className="text-center space-y-3">
              <Microscope className="w-10 h-10 text-primary mx-auto animate-pulse" />
              <p className="text-sm font-medium">{progressMsg || "Processando 5 layers de inteligência..."}</p>
              <p className="text-xs text-muted-foreground">CNPJ → Capital → CNAE → Maturidade → Massa Salarial → IA</p>
              <Progress value={undefined} className="h-1 animate-pulse max-w-xs mx-auto" />
            </div>
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-5">

            {/* AI Consolidated Analysis */}
            {aiAnalysis && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Análise Consolidada IA — M&A
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {aiAnalysis.split('\n').map((line, i) => {
                      let rendered = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>');
                      if (line.startsWith('## ')) return <h5 key={i} className="font-semibold text-foreground mt-3 mb-1">{line.slice(3)}</h5>;
                      if (line.startsWith('# ')) return <h4 key={i} className="font-bold text-foreground mt-3 mb-1 text-base">{line.slice(2)}</h4>;
                      if (line.startsWith('- ') || line.startsWith('• ')) return <li key={i} className="ml-4 list-disc">{line.slice(2)}</li>;
                      if (!line.trim()) return <br key={i} />;
                      return <span key={i} dangerouslySetInnerHTML={{ __html: rendered }} />;
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Company Cards */}
            {results.map((r) => (
              <Card key={r.company_id} className={`overflow-hidden ${r.error ? "border-destructive/30" : ""}`}>

                {/* Header */}
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-display leading-tight">{r.company_name}</CardTitle>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {r.cnpj_formatted && (
                            <span className="text-xs text-muted-foreground font-mono">{r.cnpj_formatted}</span>
                          )}
                          {r.public_data?.municipio && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5" />
                              {r.public_data.municipio}/{r.public_data.uf}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {r.public_data && (
                        <Badge className={`text-xs ${r.public_data.situacao_ativa ? "bg-primary/15 text-primary border-0" : "bg-destructive/15 text-destructive border-0"}`}>
                          {r.public_data.situacao_ativa
                            ? <CheckCircle className="w-3 h-3 mr-1" />
                            : <XCircle className="w-3 h-3 mr-1" />
                          }
                          {r.public_data.situacao_cadastral}
                        </Badge>
                      )}
                      {r.public_data?.years_active != null && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Calendar className="w-3 h-3" />
                          {r.public_data.years_active} anos
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* No CNPJ warning */}
                  {!r.has_cnpj && (
                    <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
                      <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        CNPJ não cadastrado. Adicione o CNPJ na página de Empresas para dados completos.
                      </p>
                    </div>
                  )}

                  {/* Error */}
                  {r.error && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                      <XCircle className="w-4 h-4 text-destructive shrink-0" />
                      <p className="text-sm text-muted-foreground">{r.error}</p>
                    </div>
                  )}

                  {r.intelligence && r.public_data && (
                    <>
                      {/* ── RADIOGRAFIA ─────────────────────────────────────── */}
                      <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5" /> Radiografia da Empresa
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {/* Capital cluster badge */}
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tierColor(r.intelligence.capital_cluster.tier)}`}>
                            <BarChart3 className="w-3 h-3" />
                            {r.intelligence.capital_cluster.label}
                          </span>
                          {/* Maturity badge */}
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${maturityColor(r.intelligence.maturity_signal.signal)}`}>
                            {maturityIcon(r.intelligence.maturity_signal.signal)}
                            {r.intelligence.maturity_signal.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Modelo: </span>
                            <span className="font-medium">{r.intelligence.business_model.model_label}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Margem: </span>
                            <span className="font-medium">{r.intelligence.business_model.margin_profile}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Capital Social: </span>
                            <span className="font-medium">{formatBRLFull(r.public_data.capital_social)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">CNAE: </span>
                            <span className="font-medium">{r.public_data.cnae_fiscal} — {r.public_data.sector_mapped}</span>
                          </div>
                        </div>
                        {/* Maturity insight */}
                        <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
                          {r.intelligence.maturity_signal.insight}
                        </p>
                      </div>

                      {/* ── ESTIMATIVA DE EQUIPE ────────────────────────────── */}
                      <div className="rounded-xl border p-4 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" /> Estimativa de Equipe
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-primary">{r.intelligence.employee_cluster}</p>
                            <p className="text-xs text-muted-foreground">funcionários (faixa)</p>
                          </div>
                          <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg bg-muted/50 p-2.5">
                              <p className="text-muted-foreground">Salário médio setor</p>
                              <p className="font-semibold mt-0.5">{formatBRLFull(r.intelligence.avg_salary_brl)}/mês</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-2.5">
                              <p className="text-muted-foreground">Massa salarial est.</p>
                              <p className="font-semibold mt-0.5">{formatBRL(r.intelligence.monthly_payroll_brl)}/mês</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-2.5 col-span-2">
                              <p className="text-muted-foreground">Folha anual estimada</p>
                              <p className="font-semibold mt-0.5">{formatBRL(r.intelligence.annual_payroll_brl)}/ano</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── FATURAMENTO — 2 MÉTODOS ─────────────────────────── */}
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5" /> Faturamento Estimado (2 Métodos)
                          </p>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${r.intelligence.convergence_pct >= 70 ? "bg-primary" : r.intelligence.convergence_pct >= 50 ? "bg-warning" : "bg-destructive"}`} />
                            <span className={`text-xs font-medium ${convergenceLabel(r.intelligence.convergence_pct).color}`}>
                              {r.intelligence.convergence_pct}% convergência · {convergenceLabel(r.intelligence.convergence_pct).label}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg border bg-card p-3">
                            <p className="text-xs text-muted-foreground mb-1">Método 1 — Benchmark Setorial</p>
                            <p className="text-xl font-bold text-primary">{formatBRL(r.intelligence.revenue_method1_brl)}</p>
                            <p className="text-xs text-muted-foreground mt-1">benchmark × regime × capital × localização</p>
                          </div>
                          <div className="rounded-lg border bg-card p-3">
                            <p className="text-xs text-muted-foreground mb-1">Método 2 — Inversão Massa Salarial</p>
                            <p className="text-xl font-bold text-primary">{formatBRL(r.intelligence.revenue_method2_brl)}</p>
                            <p className="text-xs text-muted-foreground mt-1">folha ÷ {Math.round(r.intelligence.business_model.payroll_pct * 100)}% (% folha/receita setor)</p>
                          </div>
                        </div>
                        {/* Confidence bar */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground shrink-0">Confiança geral:</span>
                          <Progress value={r.intelligence.confidence_score} className="h-1.5 flex-1" />
                          <span className="text-xs font-medium shrink-0">{r.intelligence.confidence_score}%</span>
                        </div>
                      </div>

                      {/* ── SINAIS DE ALERTA ────────────────────────────────── */}
                      {r.intelligence.alerts.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5" /> Sinais de Alerta
                          </p>
                          {r.intelligence.alerts.map((alert, i) => (
                            <div key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${alertColor(alert.severity)}`}>
                              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <p className="text-xs">{alert.message}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* QSA */}
                      {r.public_data.qsa.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" /> Quadro Societário ({r.public_data.qsa.length})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {r.public_data.qsa.map((s, i) => (
                              <Badge key={i} variant="outline" className="text-xs font-normal">
                                {s.nome}
                                {s.qualificacao && <span className="text-muted-foreground ml-1">· {s.qualificacao}</span>}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Legacy: companies with revenue_estimate but no intelligence */}
                  {!r.intelligence && r.revenue_estimate && r.public_data && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Capital Social</p>
                        <p className="font-semibold mt-1">{formatBRLFull(r.public_data.capital_social)}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Faturamento Est.</p>
                        <p className="font-semibold mt-1">{formatBRL(r.revenue_estimate.estimated_revenue_brl)}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" onClick={runDeepDive} disabled={loading} className="w-full">
              <Microscope className="w-4 h-4 mr-2" />
              Reexecutar Aprofundamento
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
