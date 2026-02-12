import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, DollarSign, Scale, Users, Receipt, Leaf, ShieldCheck, Cpu, Settings } from "lucide-react";
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

  const handleSave = (data: any) => {
    if (editingItem) {
      onEdit(editingItem.id, data);
    } else {
      onAdd(data);
    }
    setEditingItem(null);
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
      <div className="flex justify-end">
        <Button onClick={() => { setEditingItem(null); setDialogOpen(true); }} size="sm">
          <Plus className="w-4 h-4 mr-1" />Novo Item
        </Button>
      </div>

      <Accordion type="multiple" defaultValue={DD_CATEGORIES.map((c) => c.key)}>
        {DD_CATEGORIES.map((cat) => {
          const catItems = items.filter((i) => i.category === cat.key);
          const Icon = CATEGORY_ICONS[cat.key] || Settings;
          const done = catItems.filter((i) => i.status === "approved" || i.status === "na").length;

          return (
            <AccordionItem key={cat.key} value={cat.key}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="font-display font-medium">{cat.label}</span>
                  <Badge variant="outline" className="ml-2">{done}/{catItems.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {catItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Nenhum item nesta categoria</p>
                ) : (
                  <div className="space-y-2">
                    {catItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{item.item_name}</span>
                            {severityBadge(item.severity)}
                          </div>
                          {item.description && <p className="text-xs text-muted-foreground mt-1 truncate">{item.description}</p>}
                          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                            {item.responsible && <span>👤 {item.responsible}</span>}
                            {item.due_date && <span>📅 {new Date(item.due_date).toLocaleDateString("pt-BR")}</span>}
                          </div>
                        </div>
                        <Select value={item.status} onValueChange={(v) => onStatusChange(item.id, v)}>
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DD_STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingItem(item); setDialogOpen(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(item.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
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
