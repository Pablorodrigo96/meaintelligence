import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import { CheckCircle2, Clock, AlertTriangle, ListChecks, CalendarClock } from "lucide-react";
import { DD_CATEGORIES, DD_STATUS_OPTIONS } from "@/data/dd-checklist-playbook";

export interface ChecklistItem {
  id: string;
  item_name: string;
  category: string;
  status: "pending" | "approved" | "na" | "alert" | string;
  severity?: "normal" | "medium" | "critical";
  due_date?: string;
  description?: string;
  observation?: string;
}

export interface Document {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  created_at: string;
  updated_at?: string;
  company_id?: string;
}

export interface Report {
  id: string;
  created_at: string;
  updated_at?: string;
  status?: string;
  companies?: {
    name: string;
  };
  summary?: string;
}

interface Props {
  checklistItems: ChecklistItem[];
  documents: Document[];
  reports: Report[];
}

export default function DDDashboard({ checklistItems, documents, reports }: Props) {
  const total = checklistItems.length;
  const approved = checklistItems.filter((i) => i.status === "approved").length;
  const pending = checklistItems.filter((i) => i.status === "pending").length;
  const alerts = checklistItems.filter((i) => i.status === "alert" || i.severity === "critical").length;
  const progress = total > 0 ? Math.round((approved / total) * 100) : 0;

  const radarData = DD_CATEGORIES.map((cat) => {
    const items = checklistItems.filter((i) => i.category === cat.key);
    const done = items.filter((i) => i.status === "approved" || i.status === "na").length;
    const score = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
    return { category: cat.label.split("/")[0], score, fullMark: 100 };
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingItems = checklistItems
    .filter((i) => i.due_date && i.status !== "approved" && i.status !== "na")
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 10);

  const timeline = [
    ...reports.map((r) => ({ type: "report", date: r.created_at, label: `Relatório gerado - ${r.companies?.name || ""}` })),
    ...documents.map((d) => ({ type: "document", date: d.created_at, label: `Documento: ${d.file_name}` })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Progresso Geral</span>
          <span className="text-sm text-muted-foreground">{progress}%</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <ListChecks className="w-8 h-8 text-primary" />
            <div><p className="text-2xl font-bold">{total}</p><p className="text-xs text-muted-foreground">Total de Itens</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-success" />
            <div><p className="text-2xl font-bold">{approved}</p><p className="text-xs text-muted-foreground">Verificados</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-warning" />
            <div><p className="text-2xl font-bold">{pending}</p><p className="text-xs text-muted-foreground">Pendentes</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <div><p className="text-2xl font-bold">{alerts}</p><p className="text-xs text-muted-foreground">Alertas Críticos</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="font-display text-base">Score por Categoria</CardTitle></CardHeader>
          <CardContent>
            {total > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" className="text-xs" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">Inicialize o checklist para ver o gráfico</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display text-base flex items-center gap-2"><CalendarClock className="w-4 h-4" />Próximos Vencimentos</CardTitle></CardHeader>
          <CardContent>
            {upcomingItems.length > 0 ? (
              <div className="space-y-2">
                {upcomingItems.map((item) => {
                  const overdue = item.due_date ? new Date(item.due_date) < today : false;
                  const catLabel = DD_CATEGORIES.find((c) => c.key === item.category)?.label.split("/")[0] || item.category;
                  return (
                    <div key={item.id} className={`flex items-center gap-3 p-2 rounded-lg text-sm ${overdue ? "bg-destructive/5" : "bg-muted/30"}`}>
                      {overdue && <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground">{catLabel}</p>
                      </div>
                      <span className={`text-xs whitespace-nowrap ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {item.due_date ? new Date(item.due_date).toLocaleDateString("pt-BR") : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhum item com data limite pendente</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-display text-base">Timeline Recente</CardTitle></CardHeader>
        <CardContent>
          {timeline.length > 0 ? (
            <div className="space-y-3">
              {timeline.map((t, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p className="text-foreground">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">Nenhuma atividade registrada</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}