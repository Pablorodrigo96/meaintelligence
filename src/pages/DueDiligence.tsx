import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Shield, Upload, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DueDiligence() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCompany, setSelectedCompany] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name");
      if (error) throw error;
      return data;
    },
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["dd-reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("due_diligence_reports").select("*, companies:company_id(name)").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const company = companies.find((c) => c.id === companyId);
      const { data, error } = await supabase.functions.invoke("ai-analyze", { body: { type: "due-diligence", data: { company } } });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      const result = data.result;
      const { error: insertErr } = await supabase.from("due_diligence_reports").insert({
        company_id: companyId, user_id: user!.id, ai_report: result.ai_report || JSON.stringify(result),
        risk_items: result.risk_items || [], status: result.status || "completed",
      });
      if (insertErr) throw insertErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dd-reports"] });
      toast({ title: "Analysis complete" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCompany) return;
    setUploading(true);
    try {
      const path = `${user!.id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("documents").upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(path);
      await supabase.from("due_diligence_reports").insert({ company_id: selectedCompany, user_id: user!.id, document_url: publicUrl, status: "pending" });
      queryClient.invalidateQueries({ queryKey: ["dd-reports"] });
      toast({ title: "Document uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const severityColor: Record<string, string> = { high: "text-destructive", medium: "text-warning", low: "text-success" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Due Diligence</h1>
        <p className="text-muted-foreground mt-1">Automated legal and financial document analysis</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><Shield className="w-5 h-5 text-warning" />New Analysis</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Company</Label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger><SelectValue placeholder="Choose a company" /></SelectTrigger>
              <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex gap-3">
            <div className="space-y-2">
              <Label>Upload Document (optional)</Label>
              <Input type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleFileUpload} disabled={!selectedCompany || uploading} />
            </div>
          </div>
          <Button onClick={() => analyzeMutation.mutate(selectedCompany)} disabled={!selectedCompany || analyzeMutation.isPending}>
            {analyzeMutation.isPending ? "Analyzing..." : "Run AI Analysis"}
          </Button>
        </CardContent>
      </Card>

      {reports.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-display font-semibold">Reports</h2>
          {reports.map((r: any) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <FileText className="w-4 h-4" />{r.companies?.name || "Unknown"}
                </CardTitle>
                <Badge className={r.status === "completed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>
                  {r.status === "completed" ? <><CheckCircle2 className="w-3 h-3 mr-1" />Completed</> : r.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {r.ai_report && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.ai_report}</p>}
                {Array.isArray(r.risk_items) && r.risk_items.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Risk Items:</p>
                    {r.risk_items.map((item: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${severityColor[item.severity] || "text-warning"}`} />
                        <div><span className="font-medium">{item.category}:</span> {item.description}</div>
                      </div>
                    ))}
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
