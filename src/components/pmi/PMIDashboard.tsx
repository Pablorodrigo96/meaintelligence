import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PMI_GROUPS, DEADLINE_ORDER, STATUS_OPTIONS, getStatusLabel } from "@/data/pmi-playbook";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { CheckCircle2, Clock, AlertTriangle, ListChecks } from "lucide-react";

type ActivityStatus = "pending" | "in_progress" | "completed" | "blocked";

interface DashboardActivity {
  id: number;
  group: string;
  discipline: string;
  deadline: string;
  status: ActivityStatus;
  dueDate?: string | null;
}

interface PMIDashboardProps {
  activities: DashboardActivity[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "hsl(var(--muted-foreground))",
  in_progress: "hsl(45, 93%, 47%)",
  completed: "hsl(142, 71%, 45%)",
  blocked: "hsl(0, 84%, 60%)",
};

export default function PMIDashboard({ activities }: PMIDashboardProps) {
  const stats = useMemo(() => {
    const total = activities.length;
    const completed = activities.filter((a) => a.status === "completed").length;
    const blocked = activities.filter((a) => a.status === "blocked").length;
    const today = new Date().toISOString().split("T")[0];
    const overdue = activities.filter(
      (a) => a.dueDate && a.dueDate < today && a.status !== "completed"
    ).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, blocked, overdue, percent };
  }, [activities]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = { pending: 0, in_progress: 0, completed: 0, blocked: 0 };
    activities.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });
    return STATUS_OPTIONS.map((s) => ({
      name: s.label,
      value: counts[s.value] || 0,
      color: STATUS_COLORS[s.value],
    })).filter((d) => d.value > 0);
  }, [activities]);

  const groupData = useMemo(() => {
    return PMI_GROUPS.map((group) => {
      const items = activities.filter((a) => a.group === group);
      const completed = items.filter((a) => a.status === "completed").length;
      const total = items.length;
      return {
        name: group.length > 20 ? group.substring(0, 18) + "…" : group,
        fullName: group,
        Concluídas: completed,
        Restantes: total - completed,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    }).filter((d) => d.Concluídas + d.Restantes > 0);
  }, [activities]);

  const deadlineData = useMemo(() => {
    return DEADLINE_ORDER.map((dl) => {
      const items = activities.filter((a) => a.deadline === dl);
      return {
        name: dl,
        Pendente: items.filter((a) => a.status === "pending").length,
        "Em Andamento": items.filter((a) => a.status === "in_progress").length,
        Concluído: items.filter((a) => a.status === "completed").length,
        Bloqueado: items.filter((a) => a.status === "blocked").length,
      };
    }).filter((d) => d.Pendente + d["Em Andamento"] + d.Concluído + d.Bloqueado > 0);
  }, [activities]);

  const summaryCards = [
    { title: "Total / Concluídas", value: `${stats.completed}/${stats.total}`, sub: `${stats.percent}% completo`, icon: ListChecks, color: "text-primary" },
    { title: "Progresso Geral", value: `${stats.percent}%`, sub: null, icon: CheckCircle2, color: "text-green-500", showProgress: true },
    { title: "Bloqueadas", value: stats.blocked.toString(), sub: "atividades", icon: AlertTriangle, color: stats.blocked > 0 ? "text-destructive" : "text-muted-foreground" },
    { title: "Vencidas", value: stats.overdue.toString(), sub: "prazo ultrapassado", icon: Clock, color: stats.overdue > 0 ? "text-destructive" : "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              {card.showProgress ? (
                <Progress value={stats.percent} className="h-2 mt-2" />
              ) : card.sub ? (
                <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, "Atividades"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Group Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progresso por Grupo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={groupData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="Concluídas" stackId="a" fill="hsl(142, 71%, 45%)" />
                <Bar dataKey="Restantes" stackId="a" fill="hsl(var(--muted))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Deadline Stacked Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prazo x Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={deadlineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Pendente" stackId="a" fill="hsl(var(--muted-foreground))" />
                <Bar dataKey="Em Andamento" stackId="a" fill="hsl(45, 93%, 47%)" />
                <Bar dataKey="Concluído" stackId="a" fill="hsl(142, 71%, 45%)" />
                <Bar dataKey="Bloqueado" stackId="a" fill="hsl(0, 84%, 60%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
