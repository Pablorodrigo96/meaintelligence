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
import { Building2, Plus, Search, Pencil, Trash2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BRAZILIAN_STATES, findCity, getCitiesByState } from "@/data/brazilian-cities";

const sectors = [
  { value: "Technology", label: "Tecnologia" },
  { value: "Healthcare", label: "Saúde" },
  { value: "Finance", label: "Finanças" },
  { value: "Manufacturing", label: "Manufatura" },
  { value: "Energy", label: "Energia" },
  { value: "Retail", label: "Varejo" },
  { value: "Real Estate", label: "Imobiliário" },
  { value: "Agribusiness", label: "Agronegócio" },
  { value: "Logistics", label: "Logística" },
  { value: "Telecom", label: "Telecom" },
  { value: "Education", label: "Educação" },
  { value: "Other", label: "Outro" },
];

const sizes = [
  { value: "Small", label: "Pequena (<R$50M)" },
  { value: "Medium", label: "Média (R$50M-R$500M)" },
  { value: "Large", label: "Grande (R$500M-R$5B)" },
  { value: "Enterprise", label: "Corporação (>R$5B)" },
];

const sourceOptions = [
  { value: "manual", label: "Manual", color: "bg-muted text-muted-foreground" },
  { value: "target_search", label: "Busca Alvos", color: "bg-primary/10 text-primary" },
  { value: "buyer_search", label: "Busca Compradores", color: "bg-accent/80 text-accent-foreground" },
  { value: "enriched", label: "Enriquecida", color: "bg-secondary text-secondary-foreground" },
];

const sectorLabel = (value: string | null) => sectors.find((s) => s.value === value)?.label || value || "—";

function sourceBadge(source: string | null) {
  const s = sourceOptions.find((o) => o.value === (source || "manual")) || sourceOptions[0];
  return <Badge className={s.color}>{s.label}</Badge>;
}

function formatCnpjDisplay(cnpj: string | null) {
  if (!cnpj) return null;
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
}

function riskBadge(level: string | null) {
  const colors: Record<string, string> = { low: "bg-success/10 text-success", medium: "bg-warning/10 text-warning", high: "bg-destructive/10 text-destructive" };
  const labels: Record<string, string> = { low: "Baixo", medium: "Médio", high: "Alto" };
  return <Badge className={colors[level || "medium"] || colors.medium}>{labels[level || "medium"] || level}</Badge>;
}

function formatCurrency(val: number | null) {
  if (val == null) return "—";
  if (val >= 1e9) return `R$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `R$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `R$${(val / 1e3).toFixed(0)}K`;
  return `R$${val.toLocaleString("pt-BR")}`;
}

const emptyCompany = { name: "", cnpj: "", sector: "", state: "", city: "", size: "", description: "", revenue: "", ebitda: "", cash_flow: "", debt: "", risk_level: "medium" };

function formatCnpjInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export default function Companies() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCompany);

  const citySuggestions = form.state ? getCitiesByState(form.state) : [];

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
      const cityData = findCity(values.city, values.state);
      const location = values.city && values.state ? `${values.city}, ${values.state}` : values.city || values.state || null;
      const payload = {
        name: values.name,
        cnpj: values.cnpj ? values.cnpj.replace(/\D/g, "") : null,
        sector: values.sector || null,
        location,
        state: values.state || null,
        city: values.city || null,
        latitude: cityData?.lat ?? null,
        longitude: cityData?.lng ?? null,
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
      toast({ title: editingId ? "Empresa atualizada" : "Empresa criada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast({ title: "Empresa deletada" });
    },
  });

  const filtered = companies.filter((c: any) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.sector || "").toLowerCase().includes(search.toLowerCase());
    const matchesSector = sectorFilter === "all" || c.sector === sectorFilter;
    const matchesSource = sourceFilter === "all" || (c.source || "manual") === sourceFilter;
    return matchesSearch && matchesSector && matchesSource;
  });

  const openEdit = (c: typeof companies[number]) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      cnpj: c.cnpj || "",
      sector: c.sector || "",
      state: c.state || "",
      city: c.city || "",
      size: c.size || "",
      description: c.description || "",
      revenue: c.revenue?.toString() || "",
      ebitda: c.ebitda?.toString() || "",
      cash_flow: c.cash_flow?.toString() || "",
      debt: c.debt?.toString() || "",
      risk_level: c.risk_level || "medium",
    });
    setDialogOpen(true);
  };

  const openNew = () => { setEditingId(null); setForm(emptyCompany); setDialogOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Empresas <Badge variant="secondary" className="ml-2 text-sm align-middle">{companies.length}</Badge></h1>
          <p className="text-muted-foreground mt-1">Gerencie perfis de empresas, dados financeiros e classificações de risco</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Adicionar Empresa</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">{editingId ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="space-y-2"><Label>CNPJ</Label><Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: formatCnpjInput(e.target.value) })} placeholder="XX.XXX.XXX/XXXX-XX" maxLength={18} /></div>
                <div className="space-y-2"><Label>Setor</Label>
                  <Select value={form.sector} onValueChange={(v) => setForm({ ...form, sector: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar setor" /></SelectTrigger>
                    <SelectContent>{sectors.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v, city: "" })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar estado" /></SelectTrigger>
                    <SelectContent>
                      {BRAZILIAN_STATES.map((s) => (
                        <SelectItem key={s.uf} value={s.uf}>{s.uf} — {s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  {citySuggestions.length > 0 ? (
                    <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar cidade" /></SelectTrigger>
                      <SelectContent>
                        {citySuggestions.map((c) => (
                          <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Nome da cidade" />
                  )}
                  {form.city && form.state && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {findCity(form.city, form.state) ? "Coordenadas detectadas automaticamente" : "Cidade sem coordenadas no dicionário"}
                    </p>
                  )}
                </div>
                <div className="space-y-2"><Label>Tamanho</Label>
                  <Select value={form.size} onValueChange={(v) => setForm({ ...form, size: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar tamanho" /></SelectTrigger>
                    <SelectContent>{sizes.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Nível de Risco</Label>
                  <Select value={form.risk_level} onValueChange={(v) => setForm({ ...form, risk_level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixo</SelectItem>
                      <SelectItem value="medium">Médio</SelectItem>
                      <SelectItem value="high">Alto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Receita (R$)</Label><Input type="number" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} /></div>
                <div className="space-y-2"><Label>EBITDA (R$)</Label><Input type="number" value={form.ebitda} onChange={(e) => setForm({ ...form, ebitda: e.target.value })} /></div>
                <div className="space-y-2"><Label>Fluxo de Caixa (R$)</Label><Input type="number" value={form.cash_flow} onChange={(e) => setForm({ ...form, cash_flow: e.target.value })} /></div>
                <div className="space-y-2"><Label>Dívida (R$)</Label><Input type="number" value={form.debt} onChange={(e) => setForm({ ...form, debt: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Salvando..." : editingId ? "Atualizar" : "Criar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Pesquisar empresas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Todos os Setores" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Setores</SelectItem>
            {sectors.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Todas as Origens" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Origens</SelectItem>
            {sourceOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma empresa encontrada. Adicione sua primeira empresa para começar.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted"><Building2 className="w-5 h-5 text-primary" /></div>
                  <div>
                    <CardTitle className="text-base font-display">{c.name}</CardTitle>
                    {(c as any).cnpj && <p className="text-xs font-mono text-muted-foreground">{formatCnpjDisplay((c as any).cnpj)}</p>}
                    <p className="text-xs text-muted-foreground">{sectorLabel(c.sector)} · {c.location || `${c.city || ""}, ${c.state || ""}`}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {sourceBadge((c as any).source)}
                  {riskBadge(c.risk_level)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Receita:</span> {formatCurrency(c.revenue)}</div>
                  <div><span className="text-muted-foreground">EBITDA:</span> {formatCurrency(c.ebitda)}</div>
                  <div><span className="text-muted-foreground">Fluxo de Caixa:</span> {formatCurrency(c.cash_flow)}</div>
                  <div><span className="text-muted-foreground">Dívida:</span> {formatCurrency(c.debt)}</div>
                </div>
                {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => openEdit(c)}><Pencil className="w-3 h-3 mr-1" />Editar</Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="w-3 h-3 mr-1" />Deletar</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
