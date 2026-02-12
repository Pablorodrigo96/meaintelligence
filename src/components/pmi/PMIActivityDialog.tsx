import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { PMI_GROUPS, DEADLINE_ORDER } from "@/data/pmi-playbook";

export interface ActivityFormData {
  group: string;
  discipline: string;
  area: string;
  milestone: string;
  activity: string;
  deadline: string;
  responsible?: string;
  dueDate?: string | null;
}

interface PMIActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: ActivityFormData;
  onSave: (data: ActivityFormData) => void;
}

export default function PMIActivityDialog({ open, onOpenChange, activity, onSave }: PMIActivityDialogProps) {
  const [form, setForm] = useState<ActivityFormData>({
    group: "",
    discipline: "",
    area: "",
    milestone: "",
    activity: "",
    deadline: "D15",
    responsible: "",
    dueDate: null,
  });

  useEffect(() => {
    if (activity) {
      setForm(activity);
    } else {
      setForm({ group: "", discipline: "", area: "", milestone: "", activity: "", deadline: "D15", responsible: "", dueDate: null });
    }
  }, [activity, open]);

  const handleSave = () => {
    if (!form.group || !form.discipline || !form.area || !form.milestone || !form.activity || !form.deadline) return;
    onSave(form);
    onOpenChange(false);
  };

  const isEdit = !!activity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Atividade" : "Nova Atividade"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Grupo</Label>
            <Select value={form.group} onValueChange={(v) => setForm((f) => ({ ...f, group: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione o grupo" /></SelectTrigger>
              <SelectContent>
                {PMI_GROUPS.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Disciplina</Label>
              <Input value={form.discipline} onChange={(e) => setForm((f) => ({ ...f, discipline: e.target.value }))} placeholder="Ex: PMO" />
            </div>
            <div className="grid gap-2">
              <Label>Área/Tema</Label>
              <Input value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} placeholder="Ex: Gestão do projeto" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Milestone</Label>
            <Input value={form.milestone} onChange={(e) => setForm((f) => ({ ...f, milestone: e.target.value }))} placeholder="Ex: Execução do plano" />
          </div>
          <div className="grid gap-2">
            <Label>Atividade</Label>
            <Input value={form.activity} onChange={(e) => setForm((f) => ({ ...f, activity: e.target.value }))} placeholder="Descrição da atividade" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Prazo</Label>
              <Select value={form.deadline} onValueChange={(v) => setForm((f) => ({ ...f, deadline: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEADLINE_ORDER.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Responsável</Label>
              <Input value={form.responsible || ""} onChange={(e) => setForm((f) => ({ ...f, responsible: e.target.value }))} placeholder="Opcional" />
            </div>
            <div className="grid gap-2">
              <Label>Data Prazo</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("h-10 w-full justify-start text-left text-sm font-normal", !form.dueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.dueDate ? format(parseISO(form.dueDate), "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.dueDate ? parseISO(form.dueDate) : undefined}
                    onSelect={(date) => setForm((f) => ({ ...f, dueDate: date ? format(date, "yyyy-MM-dd") : null }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.group || !form.activity || !form.discipline}>
            {isEdit ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
