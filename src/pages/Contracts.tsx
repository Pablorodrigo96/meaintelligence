import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Download, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logApiUsage } from "@/lib/logApiUsage";

const contractTypes = [
  { value: "nda", label: "Acordo de Não-Divulgação (NDA)" },
  { value: "purchase_agreement", label: "Acordo de Compra" },
  { value: "shareholder_agreement", label: "Acordo de Acionistas" },
];

export default function Contracts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [contractType, setContractType] = useState("");
  const [params, setParams] = useState({ party_a: "", party_b: "", deal_value: "", terms: "", effective_date: "" });
  const [preview, setPreview] = useState("");

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contracts").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!contractType) throw new Error("Selecione um tipo de contrato");
      const { data, error } = await supabase.functions.invoke("ai-analyze", { body: { type: "contract", data: { contractType: contractTypes.find((t) => t.value === contractType)?.label, parameters: params } } });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      if (user?.id) logApiUsage(user.id, "ai-analyze", "contract");
      const content = data.content;
      setPreview(content);
      await supabase.from("contracts").insert({ user_id: user!.id, contract_type: contractType, content, parameters: params as any });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
    onSuccess: () => toast({ title: "Contrato gerado" }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const downloadContract = (content: string, type: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${type}_contrato.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Geração de Contratos</h1>
        <p className="text-muted-foreground mt-1">Documentos legais gerados por IA e modelos de contrato</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><Plus className="w-5 h-5 text-accent" />Gerar Contrato</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Contrato</Label>
            <Select value={contractType} onValueChange={setContractType}>
              <SelectTrigger><SelectValue placeholder="Selecionar tipo" /></SelectTrigger>
              <SelectContent>{contractTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Parte A</Label><Input value={params.party_a} onChange={(e) => setParams({ ...params, party_a: e.target.value })} placeholder="Nome da empresa A" /></div>
            <div className="space-y-2"><Label>Parte B</Label><Input value={params.party_b} onChange={(e) => setParams({ ...params, party_b: e.target.value })} placeholder="Nome da empresa B" /></div>
            <div className="space-y-2"><Label>Valor do Acordo ($)</Label><Input type="number" value={params.deal_value} onChange={(e) => setParams({ ...params, deal_value: e.target.value })} /></div>
            <div className="space-y-2"><Label>Data de Início</Label><Input type="date" value={params.effective_date} onChange={(e) => setParams({ ...params, effective_date: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Termos Adicionais</Label><Textarea value={params.terms} onChange={(e) => setParams({ ...params, terms: e.target.value })} placeholder="Termos ou cláusulas específicas..." /></div>
          <Button onClick={() => generateMutation.mutate()} disabled={!contractType || generateMutation.isPending}>
            <FileText className="w-4 h-4 mr-2" />{generateMutation.isPending ? "Gerando..." : "Gerar Contrato"}
          </Button>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-display">Pré-visualização do Contrato</CardTitle>
            <Button variant="outline" size="sm" onClick={() => downloadContract(preview, contractType)}><Download className="w-3 h-3 mr-1" />Baixar</Button>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg max-h-96 overflow-y-auto font-mono">{preview}</pre>
          </CardContent>
        </Card>
      )}

      {contracts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-display font-semibold">Contratos Anteriores</h2>
          {contracts.map((c: any) => (
            <Card key={c.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <FileText className="w-4 h-4" />{contractTypes.find((t) => t.value === c.contract_type)?.label || c.contract_type}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => downloadContract(c.content, c.contract_type)}><Download className="w-3 h-3 mr-1" />Baixar</Button>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
