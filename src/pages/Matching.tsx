import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Search, Zap, Star, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

const sectors = ["Technology", "Healthcare", "Finance", "Manufacturing", "Energy", "Retail", "Real Estate", "Other"];

export default function Matching() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [criteria, setCriteria] = useState({ target_sector: "", target_size: "", target_location: "", min_revenue: "", max_revenue: "", min_ebitda: "", max_ebitda: "", notes: "" });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("matches").select("*, companies:seller_company_id(*)").eq("buyer_id", user!.id).order("compatibility_score", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const runMatchMutation = useMutation({
    mutationFn: async () => {
      // Save criteria
      const { error: critError } = await supabase.from("match_criteria").insert({ user_id: user!.id, ...Object.fromEntries(Object.entries(criteria).map(([k, v]) => [k, v || null]).filter(([k]) => k !== "min_revenue" && k !== "max_revenue" && k !== "min_ebitda" && k !== "max_ebitda")), min_revenue: criteria.min_revenue ? Number(criteria.min_revenue) : null, max_revenue: criteria.max_revenue ? Number(criteria.max_revenue) : null, min_ebitda: criteria.min_ebitda ? Number(criteria.min_ebitda) : null, max_ebitda: criteria.max_ebitda ? Number(criteria.max_ebitda) : null });
      if (critError) console.error("Criteria save error:", critError);

      const { data, error } = await supabase.functions.invoke("ai-analyze", { body: { type: "match", data: { criteria, companies } } });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const results = Array.isArray(data.result) ? data.result : [];
      for (const match of results) {
        const company = companies.find((c) => c.id === match.company_id);
        if (company) {
          await supabase.from("matches").insert({ buyer_id: user!.id, seller_company_id: company.id, compatibility_score: match.compatibility_score, ai_analysis: match.analysis, status: "new" });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast({ title: "Matching complete!", description: "AI has analyzed compatible companies." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("matches").update({ status }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["matches"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Buyer-Seller Matching</h1>
        <p className="text-muted-foreground mt-1">AI-powered matching algorithm for compatible acquisitions</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><Search className="w-5 h-5 text-accent" />Acquisition Criteria</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2"><Label>Target Sector</Label>
              <Select value={criteria.target_sector} onValueChange={(v) => setCriteria({ ...criteria, target_sector: v })}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>{sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Location</Label><Input value={criteria.target_location} onChange={(e) => setCriteria({ ...criteria, target_location: e.target.value })} placeholder="Any" /></div>
            <div className="space-y-2"><Label>Min Revenue ($)</Label><Input type="number" value={criteria.min_revenue} onChange={(e) => setCriteria({ ...criteria, min_revenue: e.target.value })} /></div>
            <div className="space-y-2"><Label>Max Revenue ($)</Label><Input type="number" value={criteria.max_revenue} onChange={(e) => setCriteria({ ...criteria, max_revenue: e.target.value })} /></div>
          </div>
          <div className="space-y-2 mb-4"><Label>Notes</Label><Textarea value={criteria.notes} onChange={(e) => setCriteria({ ...criteria, notes: e.target.value })} placeholder="Additional requirements..." /></div>
          <Button onClick={() => runMatchMutation.mutate()} disabled={runMatchMutation.isPending || companies.length === 0}>
            <Zap className="w-4 h-4 mr-2" />{runMatchMutation.isPending ? "Analyzing..." : "Run AI Matching"}
          </Button>
          {companies.length === 0 && <p className="text-sm text-muted-foreground mt-2">Add companies first to run matching.</p>}
        </CardContent>
      </Card>

      {matches.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-display font-semibold">Match Results</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {matches.map((m: any) => (
              <Card key={m.id} className={m.status === "dismissed" ? "opacity-50" : ""}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle className="text-base font-display">{m.companies?.name || "Unknown"}</CardTitle>
                    <p className="text-xs text-muted-foreground">{m.companies?.sector} · {m.companies?.location}</p>
                  </div>
                  <Badge className={Number(m.compatibility_score) >= 70 ? "bg-success/10 text-success" : Number(m.compatibility_score) >= 40 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}>
                    {m.compatibility_score}%
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={Number(m.compatibility_score)} className="h-2" />
                  {m.ai_analysis && <p className="text-sm text-muted-foreground">{m.ai_analysis}</p>}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => updateStatus(m.id, "saved")} disabled={m.status === "saved"}><Star className="w-3 h-3 mr-1" />Save</Button>
                    <Button variant="outline" size="sm" onClick={() => updateStatus(m.id, "dismissed")}><X className="w-3 h-3 mr-1" />Dismiss</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
