import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function Valuation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCompany, setSelectedCompany] = useState("");
  const [growthRate, setGrowthRate] = useState(5);
  const [discountRate, setDiscountRate] = useState(10);
  const [ebitdaMultiple, setEbitdaMultiple] = useState(8);
  const [result, setResult] = useState<any>(null);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: valuations = [] } = useQuery({
    queryKey: ["valuations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("valuations").select("*, companies:company_id(name)").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const company = companies.find((c) => c.id === selectedCompany);

  const valuateMutation = useMutation({
    mutationFn: async () => {
      if (!company) throw new Error("Selecione uma empresa");
      const financials = { revenue: company.revenue, ebitda: company.ebitda, cash_flow: company.cash_flow, debt: company.debt };
      const { data, error } = await supabase.functions.invoke("ai-analyze", { body: { type: "valuation", data: { financials, growthRate, discountRate, ebitdaMultiple } } });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setResult(data.result);
      await supabase.from("valuations").insert({ company_id: selectedCompany, user_id: user!.id, method: "dcf", inputs: { growthRate, discountRate, ebitdaMultiple } as any, result: data.result as any });
      queryClient.invalidateQueries({ queryKey: ["valuations"] });
    },
    onSuccess: () => toast({ title: "Valuation concluído" }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const formatVal = (v: number) => v >= 1e9 ? `R$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `R$${(v / 1e6).toFixed(1)}M` : `R$${v?.toLocaleString("pt-BR")}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Valuation de Empresa</h1>
        <p className="text-muted-foreground mt-1">Modelos de valuation baseados em DCF e EBITDA com análise de sensibilidade</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><Calculator className="w-5 h-5 text-primary" />Parâmetros de Valuation</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Selecionar Empresa</Label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger><SelectValue placeholder="Escolha uma empresa" /></SelectTrigger>
              <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {company && (
            <div className="grid grid-cols-4 gap-4 p-3 bg-muted rounded-lg text-sm">
              <div><span className="text-muted-foreground">Receita:</span> {formatVal(company.revenue || 0)}</div>
              <div><span className="text-muted-foreground">EBITDA:</span> {formatVal(company.ebitda || 0)}</div>
              <div><span className="text-muted-foreground">Fluxo de Caixa:</span> {formatVal(company.cash_flow || 0)}</div>
              <div><span className="text-muted-foreground">Dívida:</span> {formatVal(company.debt || 0)}</div>
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Taxa de Crescimento: {growthRate}%</Label>
              <Slider value={[growthRate]} onValueChange={([v]) => setGrowthRate(v)} min={0} max={30} step={0.5} />
            </div>
            <div className="space-y-2">
              <Label>Taxa de Desconto: {discountRate}%</Label>
              <Slider value={[discountRate]} onValueChange={([v]) => setDiscountRate(v)} min={1} max={25} step={0.5} />
            </div>
            <div className="space-y-2">
              <Label>Múltiplo de EBITDA: {ebitdaMultiple}x</Label>
              <Slider value={[ebitdaMultiple]} onValueChange={([v]) => setEbitdaMultiple(v)} min={1} max={30} step={0.5} />
            </div>
          </div>
          <Button onClick={() => valuateMutation.mutate()} disabled={!selectedCompany || valuateMutation.isPending}>
            {valuateMutation.isPending ? "Calculando..." : "Calcular Valuation"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base font-display">Resultados do Valuation</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {result.dcf_value && <div className="text-2xl font-bold text-primary">DCF: {formatVal(result.dcf_value)}</div>}
              {result.ebitda_value && <div className="text-2xl font-bold text-accent">Múltiplo EBITDA: {formatVal(result.ebitda_value)}</div>}
              {result.analysis && <p className="text-sm text-muted-foreground mt-2">{result.analysis}</p>}
            </CardContent>
          </Card>
          {Array.isArray(result.sensitivity_data) && result.sensitivity_data.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base font-display">Análise de Sensibilidade</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={result.sensitivity_data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="growth_rate" label={{ value: "Taxa de Crescimento %", position: "bottom" }} />
                    <YAxis tickFormatter={(v) => `R$${(v / 1e6).toFixed(0)}M`} />
                    <Tooltip formatter={(v: number) => formatVal(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="hsl(217, 72%, 45%)" strokeWidth={2} name="Valuation" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Ferramenta Adicional de Valuation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <iframe
            src="https://vcedealflow.lovable.app/valuation"
            title="Valuation Tool"
            width="100%"
            height="800"
            frameBorder="0"
            className="rounded-lg border border-border"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </CardContent>
      </Card>
    </div>
  );
}
