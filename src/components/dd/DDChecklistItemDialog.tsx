import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DD_CATEGORIES, DD_STATUS_OPTIONS, DD_SEVERITY_OPTIONS } from "@/data/dd-checklist-playbook";

interface ChecklistItem {
  id?: string;
  category: string;
  item_name: string;
  description?: string;
  status: string;
  severity: string;
  responsible?: string;
  due_date?: string;
  notes?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ChecklistItem | null;
  onSave: (data: Omit<ChecklistItem, "id">) => void;
}

export default function DDChecklistItemDialog({ open, onOpenChange, item, onSave }: Props) {
  const [form, setForm] = useState<Omit<ChecklistItem, "id">>({
    category: "financeiro",
    item_name: "",
    description: "",
    status: "pending",
    severity: "medium",
    responsible: "",
    due_date: "",
    notes: "",
  });

  useEffect(() => {
    if (item) {
      setForm({
        category: item.category,
        item_name: item.item_name,
        description: item.description || "",
        status: item.status,
        severity: item.severity,
        responsible: item.responsible || "",
        due_date: item.due_date || "",
        notes: item.notes || "",
      });
    } else {
      setForm({ category: "financeiro", item_name: "", description: "", status: "pending", severity: "medium", responsible: "", due_date: "", notes: "" });
    }
  }, [item, open]);

  const handleSave = () => {
    if (!form.item_name.trim()) return;
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{item ? "Editar Item" : "Novo Item de Checklist"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DD_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severidade</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DD_SEVERITY_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Item</Label>
            <Input value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} placeholder="Nome do item de verificação" />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição detalhada" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DD_STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Input value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} placeholder="Nome do responsável" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Limite</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observações adicionais" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.item_name.trim()}>{item ? "Salvar" : "Adicionar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}