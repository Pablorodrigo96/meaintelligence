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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const sectors = ["Technology", "Healthcare", "Finance", "Manufacturing", "Energy", "Retail", "Real Estate", "Other"];
const sizes = ["Small (<$10M)", "Medium ($10M-$100M)", "Large ($100M-$1B)", "Enterprise (>$1B)"];

function riskBadge(level: string | null) {
  const colors: Record<string, string> = { low: "bg-success/10 text-success", medium: "bg-warning/10 text-warning", high: "bg-destructive/10 text-destructive" };
  return <Badge className={colors[level || "medium"] || colors.medium}>{level || "medium"}</Badge>;
}

function formatCurrency(val: number | null) {
  if (val == null) return "—";
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
}

const emptyCompany = { name: "", sector: "", location: "", size: "", description: "", revenue: "", ebitda: "", cash_flow: "", debt: "", risk_level: "medium" };

export default function Companies() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCompany);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload = {
        name: values.name,
        sector: values.sector || null,
        location: values.location || null,
        size: values.size || null,
        description: values.description || null,
        revenue: values.revenue ? Number(values.revenue) : null,
        ebitda: values.ebitda ? Number(values.ebitda) : null,
        cash_flow: values.cash_flow ? Number(values.cash_flow) : null,
        debt: values.debt ? Number(values.debt) : null,
        risk_level: values.risk_level || "medium",
        user_id: user!.id,
      };
      if (editingId) {
        const { error } = await supabase.from("companies").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("companies").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyCompany);
      toast({ title: editingId ? "Company updated" : "Company created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast({ title: "Company deleted" });
    },
  });

  const filtered = companies.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.sector || "").toLowerCase().includes(search.toLowerCase());
    const matchesSector = sectorFilter === "all" || c.sector === sectorFilter;
    return matchesSearch && matchesSector;
  });

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({ name: c.name, sector: c.sector || "", location: c.location || "", size: c.size || "", description: c.description || "", revenue: c.revenue?.toString() || "", ebitda: c.ebitda?.toString() || "", cash_flow: c.cash_flow?.toString() || "", debt: c.debt?.toString() || "", risk_level: c.risk_level || "medium" });
    setDialogOpen(true);
  };

  const openNew = () => { setEditingId(null); setForm(emptyCompany); setDialogOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Companies</h1>
          <p className="text-muted-foreground mt-1">Manage company profiles, financials, and risk classifications</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add Company</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">{editingId ? "Edit Company" : "New Company"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Sector</Label>
                  <Select value={form.sector} onValueChange={(v) => setForm({ ...form, sector: v })}>
                    <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
                    <SelectContent>{sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
                <div className="space-y-2"><Label>Size</Label>
                  <Select value={form.size} onValueChange={(v) => setForm({ ...form, size: v })}>
                    <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                    <SelectContent>{sizes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Revenue ($)</Label><Input type="number" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} /></div>
                <div className="space-y-2"><Label>EBITDA ($)</Label><Input type="number" value={form.ebitda} onChange={(e) => setForm({ ...form, ebitda: e.target.value })} /></div>
                <div className="space-y-2"><Label>Cash Flow ($)</Label><Input type="number" value={form.cash_flow} onChange={(e) => setForm({ ...form, cash_flow: e.target.value })} /></div>
                <div className="space-y-2"><Label>Debt ($)</Label><Input type="number" value={form.debt} onChange={(e) => setForm({ ...form, debt: e.target.value })} /></div>
                <div className="space-y-2"><Label>Risk Level</Label>
                  <Select value={form.risk_level} onValueChange={(v) => setForm({ ...form, risk_level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Sectors" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sectors</SelectItem>
            {sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No companies found. Add your first company to get started.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted"><Building2 className="w-5 h-5 text-primary" /></div>
                  <div>
                    <CardTitle className="text-base font-display">{c.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{c.sector} · {c.location}</p>
                  </div>
                </div>
                {riskBadge(c.risk_level)}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Revenue:</span> {formatCurrency(c.revenue)}</div>
                  <div><span className="text-muted-foreground">EBITDA:</span> {formatCurrency(c.ebitda)}</div>
                  <div><span className="text-muted-foreground">Cash Flow:</span> {formatCurrency(c.cash_flow)}</div>
                  <div><span className="text-muted-foreground">Debt:</span> {formatCurrency(c.debt)}</div>
                </div>
                {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => openEdit(c)}><Pencil className="w-3 h-3 mr-1" />Edit</Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="w-3 h-3 mr-1" />Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
