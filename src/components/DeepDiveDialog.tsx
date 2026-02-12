import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Microscope, Building2, Users, MapPin, Calendar, DollarSign, AlertTriangle, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
}

interface DeepDiveDialogProps {
  companies: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatBRL(val: number): string {
  return `R$ ${val.toLocaleString("pt-BR")}`;
}

export function DeepDiveDialog({ companies, open, onOpenChange }: DeepDiveDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DeepDiveResult[] | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const runDeepDive = async () => {
    setLoading(true);
    setResults(null);
    setAiAnalysis(null);
    try {
      const top10 = companies.slice(0, 10);
      const { data, error } = await supabase.functions.invoke("company-deep-dive", {
        body: { companies: top10 },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setResults(data.results || []);
      setAiAnalysis(data.ai_analysis || null);
    } catch (e: any) {
      toast({ title: "Erro no aprofundamento", description: e.message, variant: "destructive" });
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
            Aprofundamento Top 10 — Dados Públicos
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="space-y-4 py-8">
            <div className="text-center space-y-3">
              <Microscope className="w-10 h-10 text-primary mx-auto animate-pulse" />
              <p className="text-sm text-muted-foreground">Consultando dados públicos via CNPJ...</p>
              <Progress value={undefined} className="h-1 animate-pulse max-w-xs mx-auto" />
            </div>
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </div>
        )}

        {results && (
          <div className="space-y-6">
            {/* AI Consolidated Analysis */}
            {aiAnalysis && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Análise Consolidada da IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{aiAnalysis}</p>
                </CardContent>
              </Card>
            )}

            {/* Company Cards */}
            {results.map((r) => (
              <Card key={r.company_id} className={r.error ? "border-destructive/30" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-display">{r.company_name}</CardTitle>
                        {r.cnpj_formatted && (
                          <p className="text-xs text-muted-foreground font-mono">{r.cnpj_formatted}</p>
                        )}
                      </div>
                    </div>
                    {r.public_data && (
                      <Badge className={r.public_data.situacao_ativa ? "bg-success/15 text-success border-0" : "bg-destructive/15 text-destructive border-0"}>
                        {r.public_data.situacao_ativa ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        {r.public_data.situacao_cadastral}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!r.has_cnpj && (
                    <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
                      <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        CNPJ não cadastrado. Adicione o CNPJ na página de Empresas para dados completos.
                      </p>
                    </div>
                  )}

                  {r.error && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                      <XCircle className="w-4 h-4 text-destructive shrink-0" />
                      <p className="text-sm text-muted-foreground">{r.error}</p>
                    </div>
                  )}

                  {r.public_data && (
                    <>
                      {/* Official Data */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Razão Social</p>
                          <p className="font-medium text-xs mt-1">{r.public_data.razao_social}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Capital Social</p>
                          <p className="font-semibold mt-1">{formatBRL(r.public_data.capital_social)}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Porte</p>
                          <p className="font-medium mt-1">{r.public_data.porte || "N/A"}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />Localização</p>
                          <p className="font-medium mt-1">{r.public_data.municipio}/{r.public_data.uf}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">CNAE</p>
                          <p className="font-medium mt-1 text-xs">{r.public_data.cnae_fiscal} — {r.public_data.cnae_descricao}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />Abertura</p>
                          <p className="font-medium mt-1">
                            {r.public_data.data_abertura ? new Date(r.public_data.data_abertura).toLocaleDateString("pt-BR") : "N/A"}
                            {r.public_data.years_active != null && <span className="text-muted-foreground"> ({r.public_data.years_active} anos)</span>}
                          </p>
                        </div>
                      </div>

                      {/* QSA - Partners */}
                      {r.public_data.qsa.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                            <Users className="w-3 h-3" /> Quadro Societário ({r.public_data.qsa.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
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

                  {/* Revenue Estimate */}
                  {r.revenue_estimate && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-primary" />
                          Faturamento Estimado
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Confiança:</span>
                          <Progress value={r.revenue_estimate.confidence_score} className="h-2 w-16" />
                          <span className="text-xs font-medium">{r.revenue_estimate.confidence_score}%</span>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        {formatBRL(r.revenue_estimate.estimated_revenue_brl)}
                        <span className="text-xs font-normal text-muted-foreground ml-2">/ ano</span>
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div className="rounded border p-2">
                          <p className="text-muted-foreground">Benchmark Setor</p>
                          <p className="font-medium">{formatBRL(r.revenue_estimate.benchmark_sector)}</p>
                        </div>
                        <div className="rounded border p-2">
                          <p className="text-muted-foreground">Regime</p>
                          <p className="font-medium">{r.revenue_estimate.regime} ({r.revenue_estimate.regime_factor}x)</p>
                        </div>
                        <div className="rounded border p-2">
                          <p className="text-muted-foreground">Fator Capital</p>
                          <p className="font-medium">{r.revenue_estimate.capital_ratio}x</p>
                        </div>
                        <div className="rounded border p-2">
                          <p className="text-muted-foreground">Localização</p>
                          <p className="font-medium">{r.revenue_estimate.location_label}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono bg-muted/50 rounded p-2">
                        {r.revenue_estimate.formula}
                      </p>
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
