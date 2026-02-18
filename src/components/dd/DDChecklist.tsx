import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, DollarSign, Scale, Users, Receipt, Leaf, ShieldCheck, Cpu, Settings, Search, ChevronsUpDown, ChevronsDownUp, Download, AlertTriangle } from "lucide-react";
import { DD_CATEGORIES, DD_STATUS_OPTIONS, DD_SEVERITY_OPTIONS } from "@/data/dd-checklist-playbook";
import DDChecklistItemDialog from "./DDChecklistItemDialog";

const CATEGORY_ICONS: Record<string, any> = {
  financeiro: DollarSign, legal: Scale, trabalhista: Users, tributario: Receipt,
  ambiental: Leaf, regulatorio: ShieldCheck, tecnologico: Cpu, operacional: Settings,
};

interface Props {
  items: any[];
  onAdd: (data: any) => void;
  onEdit: (id: string, data: any) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

export default function DDChecklist({ items, onAdd, onEdit, onDelete, onStatusChange }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(DD_CATEGORIES.map((c) => c.key));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isOverdue = (item: any) => {
    if (!item.due_date || item.status === "approved" || item.status === "na") return false;
    return new Date(item.due_date) < today;
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (searchText) {
        const q = searchText.toLowerCase();
        const match = [item.item_name, item.description, item.responsible]
          .filter(Boolean).some((f) => f.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      if (filterSeverity !== "all" && item.severity !== filterSeverity) return false;
      return true;
    });
  }, [items, searchText, filterStatus, filterSeverity]);

  const handleSave = (data: any) => {
    if (editingItem) {
      onEdit(editingItem.id, data);
    } else {
      onAdd(data);
    }
    setEditingItem(null);
  };

  const exportCSV = () => {
    const catLabel = (key: string) => DD_CATEGORIES.find((c) => c.key === key)?.label || key;
    const statusLabel = (key: string) => DD_STATUS_OPTIONS.find((o) => o.value === key)?.label || key;
    const sevLabel = (key: string) => DD_SEVERITY_OPTIONS.find((o) => o.value === key)?.label || key;
    const headers = ["Categoria", "Item", "Severidade", "Status", "Responsável", "Data Limite", "Notas"];
    const rows = filteredItems.map((i) => [
      catLabel(i.category), i.item_name, sevLabel(i.severity), statusLabel(i.status),
      i.responsible || "", i.due_date ? new Date(i.due_date).toLocaleDateString("pt-BR") : "", (i.notes || "").replace(/"/g, '""'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "dd-checklist.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const severityBadge = (s: string) => {
    const colors: Record<string, string> = {
      low: "bg-muted text-muted-foreground", medium: "bg-warning/10 text-warning",
      high: "bg-destructive/10 text-destructive", critical: "bg-destructive text-destructive-foreground",
    };
    const label = DD_SEVERITY_OPTIONS.find((o) => o.value === s)?.label || s;
    return <Badge className={colors[s] || ""}>{label}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar item, descrição ou responsável..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            {DD_STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Severidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Severidades</SelectItem>
            {DD_SEVERITY_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setExpandedCategories(DD_CATEGORIES.map((c) => c.key))}><ChevronsUpDown className="w-4 h-4 mr-1" />Expandir</Button>
        <Button variant="outline" size="sm" onClick={() => setExpandedCategories([])}><ChevronsDownUp className="w-4 h-4 mr-1" />Recolher</Button>
        <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
        <Button onClick={() => { setEditingItem(null); setDialogOpen(true); }} size="sm">
          <Plus className="w-4 h-4 mr-1" />Novo Item
        </Button>
      </div>

      <Accordion type="multiple" value={expandedCategories} onValueChange={setExpandedCategories}>
        {DD_CATEGORIES.map((cat) => {
          const catItems = filteredItems.filter((i) => i.category === cat.key);
          const Icon = CATEGORY_ICONS[cat.key] || Settings;
          const allCatItems = items.filter((i) => i.category === cat.key);
          const done = allCatItems.filter((i) => i.status === "approved" || i.status === "na").length;

          return (
            <AccordionItem key={cat.key} value={cat.key}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="font-display font-medium">{cat.label}</span>
                  <Badge variant="outline" className="ml-2">{done}/{allCatItems.length}</Badge>
                  {catItems.length !== allCatItems.length && <span className="text-xs text-muted-foreground">({catItems.length} filtrados)</span>}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {catItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Nenhum item nesta categoria</p>
                ) : (
                  <div className="space-y-2">
                    {catItems.map((item) => {
                      const overdue = isOverdue(item);
                      return (
                        <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border bg-card ${overdue ? "bg-destructive/5 border-destructive/30" : ""}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{item.item_name}</span>
                              {severityBadge(item.severity)}
                              {overdue && <AlertTriangle className="w-4 h-4 text-destructive" />}
                            </div>
                            {item.description && <p className="text-xs text-muted-foreground mt-1 truncate">{item.description}</p>}
                            <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                              {item.responsible && <span>👤 {item.responsible}</span>}
                              {item.due_date && (
                                <span className={overdue ? "text-destructive font-medium" : ""}>
                                  📅 {new Date(item.due_date).toLocaleDateString("pt-BR")}
                                </span>
                              )}
                            </div>
                          </div>
                          <Select value={item.status} onValueChange={(v) => onStatusChange(item.id, v)}>
                            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {DD_STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingItem(item); setDialogOpen(true); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(item.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <DDChecklistItemDialog open={dialogOpen} onOpenChange={setDialogOpen} item={editingItem} onSave={handleSave} />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) onDelete(deleteTarget); setDeleteTarget(null); }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
