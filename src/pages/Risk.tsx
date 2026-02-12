import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Shield, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function Risk() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCompany, setSelectedCompany] = useState("");

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: assessments = [] } = useQuery({
    queryKey: ["risk-assessments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("risk_assessments").select("*, companies:company_id(name)").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const company = companies.find((c) => c.id === selectedCompany);
      if (!company) throw new Error("Selecione uma empresa");
      const { data, error } = await supabase.functions.invoke("ai-analyze", { body: { type: "risk", data: { company } } });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      const r = data.result;
      await supabase.from("risk_assessments").insert({
        company_id: selectedCompany, user_id: user!.id,
        financial_score: r.financial_score, legal_score: r.legal_score,
        operational_score: r.operational_score, overall_score: r.overall_score,
        details: r.details || {} as any, ai_recommendations: r.recommendations,
      });
      queryClient.invalidateQueries({ queryKey: ["risk-assessments"] });
    },
    onSuccess: () => toast({ title: "Análise de risco concluída" }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const scatterData = assessments.map((a: any) => ({
    x: a.financial_score || 50, y: a.operational_score || 50, name: a.companies?.name, overall: a.overall_score || 50,
  }));

  const getColor = (score: number) => score >= 70 ? "hsl(0, 72%, 51%)" : score >= 40 ? "hsl(38, 92%, 50%)" : "hsl(152, 60%, 40%)";

  const scoreLabel = (score: number | null) => {
    if (score == null) return "—";
    if (score >= 70) return "Risco Alto";
    if (score >= 40) return "Risco Médio";
    return "Risco Baixo";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Análise de Risco</h1>
        <p className="text-muted-foreground mt-1">Painel consolidado de risco nas dimensões financeira, legal e operacional</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" />Executar Análise de Risco</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Selecionar Empresa</Label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger><SelectValue placeholder="Escolha uma empresa" /></SelectTrigger>
              <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={() => analyzeMutation.mutate()} disabled={!selectedCompany || analyzeMutation.isPending}>
            {analyzeMutation.isPending ? "Analisando..." : "Analisar Risco"}
          </Button>
        </CardContent>
      </Card>

      {scatterData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base font-display">Matriz de Risco</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" name="Risco Financeiro" type="number" domain={[0, 100]} label={{ value: "Risco Financeiro", position: "bottom" }} />
                <YAxis dataKey="y" name="Risco Operacional" type="number" domain={[0, 100]} label={{ value: "Risco Operacional", angle: -90, position: "left" }} />
                <Tooltip formatter={(v: number) => `${v}/100`} labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""} />
                <Scatter data={scatterData}>
                  {scatterData.map((d, i) => <Cell key={i} fill={getColor(d.overall)} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {assessments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-display font-semibold">Resultados das Avaliações</h2>
          {assessments.map((a: any) => (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <Shield className="w-4 h-4" />{a.companies?.name}
                  <span className="ml-auto text-sm font-normal text-muted-foreground">{scoreLabel(a.overall_score)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="text-center p-2 bg-muted rounded-lg">
                    <div className="text-lg font-bold">{a.financial_score ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">Financeiro</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded-lg">
                    <div className="text-lg font-bold">{a.legal_score ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">Legal</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded-lg">
                    <div className="text-lg font-bold">{a.operational_score ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">Operacional</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded-lg">
                    <div className="text-lg font-bold">{a.overall_score ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">Geral</div>
                  </div>
                </div>
                {a.ai_recommendations && (
                  <div>
                    <p className="text-sm font-medium mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3" />Recomendações</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.ai_recommendations}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
