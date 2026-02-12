import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, FileText, AlertTriangle, CheckCircle2, XCircle, HelpCircle } from "lucide-react";

interface Props {
  reports: any[];
  onRunFullAnalysis: () => void;
  analyzing: boolean;
  checklistItems: any[];
}

export default function DDReports({ reports, onRunFullAnalysis, analyzing, checklistItems }: Props) {
  const verdictIcon = (v: string) => {
    if (v === "go") return <CheckCircle2 className="w-5 h-5 text-success" />;
    if (v === "no-go") return <XCircle className="w-5 h-5 text-destructive" />;
    return <HelpCircle className="w-5 h-5 text-warning" />;
  };

  const verdictLabel = (v: string) => {
    if (v === "go") return "Go";
    if (v === "no-go") return "No-Go";
    return "Condicional";
  };

  const severityColor: Record<string, string> = {
    high: "text-destructive", medium: "text-warning", low: "text-success", critical: "text-destructive",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />Análise Completa por IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Executa uma análise inteligente considerando todos os itens do checklist ({checklistItems.length} itens) e documentos coletados, gerando um relatório estruturado com red flags e parecer final.
          </p>
          <Button onClick={onRunFullAnalysis} disabled={analyzing || checklistItems.length === 0}>
            {analyzing ? "Analisando..." : "Executar Análise Completa"}
          </Button>
        </CardContent>
      </Card>

      {reports.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-display font-semibold">Relatórios Anteriores</h3>
          {reports.map((r: any) => {
            let parsed: any = null;
            try { parsed = typeof r.ai_report === "string" ? JSON.parse(r.ai_report) : r.ai_report; } catch {}

            return (
              <Card key={r.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-display flex items-center gap-2">
                    <FileText className="w-4 h-4" />{r.companies?.name || "Empresa"}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {parsed?.verdict && (
                      <Badge className={parsed.verdict === "go" ? "bg-success/10 text-success" : parsed.verdict === "no-go" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}>
                        {verdictIcon(parsed.verdict)} <span className="ml-1">{verdictLabel(parsed.verdict)}</span>
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {parsed?.summary && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{parsed.summary}</p>}
                  {!parsed?.summary && r.ai_report && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{typeof r.ai_report === "string" ? r.ai_report : JSON.stringify(r.ai_report)}</p>}

                  {Array.isArray(r.risk_items) && r.risk_items.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Red Flags:</p>
                      {r.risk_items.map((item: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${severityColor[item.severity] || "text-warning"}`} />
                          <div><span className="font-medium">{item.category}:</span> {item.description}{item.recommendation && <span className="text-muted-foreground"> — {item.recommendation}</span>}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {parsed?.justification && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-sm font-medium mb-1">Justificativa do Parecer</p>
                      <p className="text-sm text-muted-foreground">{parsed.justification}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
