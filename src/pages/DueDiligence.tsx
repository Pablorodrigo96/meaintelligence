import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, LayoutDashboard, CheckSquare, FolderOpen, FileBarChart, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DD_PLAYBOOK } from "@/data/dd-checklist-playbook";
import DDDashboard from "@/components/dd/DDDashboard";
import DDChecklist from "@/components/dd/DDChecklist";
import DDDataRoom from "@/components/dd/DDDataRoom";
import DDReports from "@/components/dd/DDReports";

export default function DueDiligence() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCompany, setSelectedCompany] = useState("");
  const [uploading, setUploading] = useState(false);
  const [analyzingDoc, setAnalyzingDoc] = useState<string | null>(null);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name");
      if (error) throw error;
      return data;
    },
  });

  const { data: checklistItems = [], isLoading: loadingChecklist } = useQuery({
    queryKey: ["dd-checklist", selectedCompany],
    enabled: !!selectedCompany,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dd_checklist_items" as any)
        .select("*")
        .eq("company_id", selectedCompany)
        .eq("user_id", user!.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["dd-documents", selectedCompany],
    enabled: !!selectedCompany,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dd_documents" as any)
        .select("*")
        .eq("company_id", selectedCompany)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["dd-reports", selectedCompany],
    enabled: !!selectedCompany,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("due_diligence_reports")
        .select("*, companies:company_id(name)")
        .eq("company_id", selectedCompany)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Initialize playbook
  const initPlaybook = async () => {
    if (!selectedCompany || !user) return;
    const items = DD_PLAYBOOK.map((p, i) => ({
      company_id: selectedCompany,
      user_id: user.id,
      category: p.category,
      item_name: p.item_name,
      description: p.description,
      severity: p.severity,
      status: "pending",
      sort_order: i,
    }));
    const { error } = await supabase.from("dd_checklist_items" as any).insert(items);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["dd-checklist", selectedCompany] });
    toast({ title: "Checklist inicializado", description: `${items.length} itens carregados` });
  };

  // Checklist CRUD
  const addItem = async (data: any) => {
    const { error } = await supabase.from("dd_checklist_items" as any).insert({
      ...data, company_id: selectedCompany, user_id: user!.id, sort_order: checklistItems.length,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["dd-checklist", selectedCompany] });
    toast({ title: "Item adicionado" });
  };

  const editItem = async (id: string, data: any) => {
    const { error } = await supabase.from("dd_checklist_items" as any).update(data).eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["dd-checklist", selectedCompany] });
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("dd_checklist_items" as any).delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["dd-checklist", selectedCompany] });
    toast({ title: "Item excluído" });
  };

  const changeStatus = async (id: string, status: string) => {
    await supabase.from("dd_checklist_items" as any).update({ status }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["dd-checklist", selectedCompany] });
  };

  // Data Room
  const uploadDocument = async (file: File, category: string) => {
    if (!selectedCompany || !user) return;
    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("documents").upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(path);
      const { error } = await supabase.from("dd_documents" as any).insert({
        company_id: selectedCompany, user_id: user.id, file_name: file.name,
        file_url: publicUrl, file_size: file.size, category, status: "uploaded",
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["dd-documents", selectedCompany] });
      toast({ title: "Documento enviado" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (id: string) => {
    await supabase.from("dd_documents" as any).delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["dd-documents", selectedCompany] });
    toast({ title: "Documento excluído" });
  };

  const analyzeDocument = async (docId: string) => {
    setAnalyzingDoc(docId);
    try {
      const doc = documents.find((d: any) => d.id === docId);
      const company = companies.find((c) => c.id === selectedCompany);
      const { data, error } = await supabase.functions.invoke("ai-analyze", {
        body: { type: "due-diligence", data: { company, documentText: `Document: ${doc?.file_name}` } },
      });
      if (error) throw error;
      await supabase.from("dd_documents" as any).update({ ai_analysis: data.result?.ai_report || JSON.stringify(data.result), status: "analyzed" }).eq("id", docId);
      queryClient.invalidateQueries({ queryKey: ["dd-documents", selectedCompany] });
      toast({ title: "Análise concluída" });
    } catch (err: any) {
      toast({ title: "Erro na análise", description: err.message, variant: "destructive" });
    } finally {
      setAnalyzingDoc(null);
    }
  };

  // Full AI analysis
  const fullAnalysisMutation = useMutation({
    mutationFn: async () => {
      const company = companies.find((c) => c.id === selectedCompany);
      const { data, error } = await supabase.functions.invoke("ai-analyze", {
        body: {
          type: "due-diligence-full",
          data: { company, checklist: checklistItems, documents: documents.map((d: any) => ({ name: d.file_name, category: d.category, status: d.status, analysis: d.ai_analysis })) },
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      const result = data.result;
      const { error: insertErr } = await supabase.from("due_diligence_reports").insert({
        company_id: selectedCompany, user_id: user!.id,
        ai_report: typeof result === "string" ? result : JSON.stringify(result),
        risk_items: result.risk_items || result.red_flags || [],
        status: "completed",
      });
      if (insertErr) throw insertErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dd-reports", selectedCompany] });
      toast({ title: "Análise completa concluída" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
          <Shield className="w-8 h-8 text-warning" />Due Diligence
        </h1>
        <p className="text-muted-foreground mt-1">Gestão completa do processo de due diligence</p>
      </div>

      <div className="flex items-end gap-4 flex-wrap">
        <div className="space-y-2">
          <Label>Empresa</Label>
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-[280px]"><SelectValue placeholder="Selecione uma empresa" /></SelectTrigger>
            <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {selectedCompany && checklistItems.length === 0 && !loadingChecklist && (
          <Button variant="outline" onClick={initPlaybook}>
            Inicializar Checklist Padrão
          </Button>
        )}
      </div>

      {selectedCompany ? (
        <Tabs defaultValue="dashboard">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center gap-1"><LayoutDashboard className="w-4 h-4" />Dashboard</TabsTrigger>
            <TabsTrigger value="checklist" className="flex items-center gap-1"><CheckSquare className="w-4 h-4" />Checklist</TabsTrigger>
            <TabsTrigger value="dataroom" className="flex items-center gap-1"><FolderOpen className="w-4 h-4" />Data Room</TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1"><FileBarChart className="w-4 h-4" />Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DDDashboard checklistItems={checklistItems} documents={documents} reports={reports} />
          </TabsContent>

          <TabsContent value="checklist">
            {loadingChecklist ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <DDChecklist items={checklistItems} onAdd={addItem} onEdit={editItem} onDelete={deleteItem} onStatusChange={changeStatus} />
            )}
          </TabsContent>

          <TabsContent value="dataroom">
            <DDDataRoom documents={documents} onUpload={uploadDocument} onDelete={deleteDocument} onAnalyze={analyzeDocument} uploading={uploading} analyzing={analyzingDoc} />
          </TabsContent>

          <TabsContent value="reports">
            <DDReports reports={reports} onRunFullAnalysis={() => fullAnalysisMutation.mutate()} analyzing={fullAnalysisMutation.isPending} checklistItems={checklistItems} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Selecione uma empresa para iniciar o processo de Due Diligence</p>
        </div>
      )}
    </div>
  );
}
