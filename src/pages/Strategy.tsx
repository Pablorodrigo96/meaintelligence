import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

export default function Strategy() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [buyerCompany, setBuyerCompany] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [result, setResult] = useState<any>(null);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*");
      if (error) throw error;
      return data;
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const buyer = companies.find((c) => c.id === buyerCompany);
      const target = companies.find((c) => c.id === targetCompany);
      if (!buyer || !target) throw new Error("Selecione ambas as empresas");
      const { data, error } = await supabase.functions.invoke("ai-analyze", { body: { type: "strategy", data: { transaction: { buyer_name: buyer.name, target_name: target.name }, buyer, target } } });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setResult(data.result);
    },
    onSuccess: () => toast({ title: "Análise estratégica concluída" }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const priorityColor: Record<string, string> = { high: "bg-destructive/10 text-destructive", medium: "bg-warning/10 text-warning", low: "bg-success/10 text-success" };
  const priorityLabels: Record<string, string> = { high: "Alta", medium: "Média", low: "Baixa" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Estratégia de Transação</h1>
        <p className="text-muted-foreground mt-1">Previsões e recomendações estratégicas com IA para o sucesso em M&A</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><TrendingUp className="w-5 h-5 text-success" />Análise Estratégica</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Empresa Compradora</Label>
              <Select value={buyerCompany} onValueChange={setBuyerCompany}>
                <SelectTrigger><SelectValue placeholder="Selecionar compradora" /></SelectTrigger>
                <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Empresa Alvo</Label>
              <Select value={targetCompany} onValueChange={setTargetCompany}>
                <SelectTrigger><SelectValue placeholder="Selecionar alvo" /></SelectTrigger>
                <SelectContent>{companies.filter((c) => c.id !== buyerCompany).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => analyzeMutation.mutate()} disabled={!buyerCompany || !targetCompany || analyzeMutation.isPending}>
            {analyzeMutation.isPending ? "Analisando..." : "Analisar Estratégia"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          {result.success_probability != null && (
            <Card>
              <CardHeader><CardTitle className="text-base font-display flex items-center gap-2"><Target className="w-4 h-4" />Probabilidade de Sucesso</CardTitle></CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-primary mb-2">{result.success_probability}%</div>
                <Progress value={result.success_probability} className="h-3" />
              </CardContent>
            </Card>
          )}

          {Array.isArray(result.recommendations) && result.recommendations.length > 0 && (
            <div>
              <h2 className="text-xl font-display font-semibold mb-3">Recomendações Estratégicas</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {result.recommendations.map((rec: any, i: number) => (
                  <Card key={i}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{rec.title}</h3>
                        <Badge className={priorityColor[rec.priority] || priorityColor.medium}>{priorityLabels[rec.priority] || rec.priority}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(result.integration_timeline) && result.integration_timeline.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base font-display flex items-center gap-2"><Clock className="w-4 h-4" />Cronograma de Integração</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.integration_timeline.map((phase: any, i: number) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</div>
                      <div>
                        <h4 className="font-medium">{phase.phase} <span className="text-sm text-muted-foreground">({phase.duration})</span></h4>
                        {Array.isArray(phase.tasks) && <ul className="mt-1 text-sm text-muted-foreground list-disc list-inside">{phase.tasks.map((t: string, j: number) => <li key={j}>{t}</li>)}</ul>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
