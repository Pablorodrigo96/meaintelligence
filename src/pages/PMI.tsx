import { useState, useEffect, useMemo, useCallback } from "react";
import { pmiPlaybook, PMI_GROUPS, DEADLINE_ORDER, STATUS_OPTIONS, getDeadlineColor, getStatusColor, getStatusLabel } from "@/data/pmi-playbook";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, Layers, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ActivityStatus = "pending" | "in_progress" | "completed" | "blocked";

interface ActivityState {
  id: number;
  status: ActivityStatus;
  dbId?: string;
}

export default function PMI() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityState[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedDisciplines, setExpandedDisciplines] = useState<Set<string>>(new Set());
  const [filterDeadline, setFilterDeadline] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Load activities from DB
  useEffect(() => {
    if (!user) return;
    loadActivities();
  }, [user]);

  const loadActivities = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("pmi_activities")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error loading PMI activities:", error);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const mapped = pmiPlaybook.map((item) => {
        const dbRow = data.find(
          (d: any) => d.group_name === item.group && d.discipline === item.discipline && d.activity === item.activity
        );
        return {
          id: item.id,
          status: (dbRow?.status as ActivityStatus) || "pending",
          dbId: dbRow?.id,
        };
      });
      setActivities(mapped);
      setInitialized(true);
    }
    setLoading(false);
  };

  const initializePlaybook = async () => {
    if (!user) return;
    setLoading(true);
    const rows = pmiPlaybook.map((item) => ({
      user_id: user.id,
      group_name: item.group,
      discipline: item.discipline,
      area: item.area,
      milestone: item.milestone,
      activity: item.activity,
      deadline: item.deadline,
      status: "pending",
    }));

    // Insert in batches of 100
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await supabase.from("pmi_activities").insert(batch);
      if (error) {
        console.error("Error initializing PMI:", error);
        toast({ title: "Erro ao inicializar playbook", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
    }

    toast({ title: "Playbook inicializado!", description: `${rows.length} atividades carregadas.` });
    await loadActivities();
  };

  const updateStatus = useCallback(async (activityId: number, newStatus: ActivityStatus) => {
    const activity = activities.find((a) => a.id === activityId);
    if (!activity?.dbId) return;

    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, status: newStatus } : a))
    );

    const { error } = await supabase
      .from("pmi_activities")
      .update({ status: newStatus })
      .eq("id", activity.dbId);

    if (error) {
      console.error("Error updating status:", error);
      // Revert
      setActivities((prev) =>
        prev.map((a) => (a.id === activityId ? { ...a, status: activity.status } : a))
      );
    }
  }, [activities]);

  const getActivityStatus = (id: number): ActivityStatus => {
    return activities.find((a) => a.id === id)?.status || "pending";
  };

  const filteredPlaybook = useMemo(() => {
    return pmiPlaybook.filter((item) => {
      if (filterDeadline !== "all" && item.deadline !== filterDeadline) return false;
      if (filterStatus !== "all" && getActivityStatus(item.id) !== filterStatus) return false;
      return true;
    });
  }, [filterDeadline, filterStatus, activities]);

  const getGroupStats = (groupName: string) => {
    const groupItems = filteredPlaybook.filter((i) => i.group === groupName);
    const completed = groupItems.filter((i) => getActivityStatus(i.id) === "completed").length;
    return { total: groupItems.length, completed, percent: groupItems.length > 0 ? Math.round((completed / groupItems.length) * 100) : 0 };
  };

  const getDisciplineStats = (groupName: string, discipline: string) => {
    const items = filteredPlaybook.filter((i) => i.group === groupName && i.discipline === discipline);
    const completed = items.filter((i) => getActivityStatus(i.id) === "completed").length;
    return { total: items.length, completed, percent: items.length > 0 ? Math.round((completed / items.length) * 100) : 0 };
  };

  const overallStats = useMemo(() => {
    const completed = filteredPlaybook.filter((i) => getActivityStatus(i.id) === "completed").length;
    return { total: filteredPlaybook.length, completed, percent: filteredPlaybook.length > 0 ? Math.round((completed / filteredPlaybook.length) * 100) : 0 };
  }, [filteredPlaybook, activities]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  };

  const toggleDiscipline = (key: string) => {
    setExpandedDisciplines((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const getDisciplines = (groupName: string) => {
    const disciplines = new Set(filteredPlaybook.filter((i) => i.group === groupName).map((i) => i.discipline));
    return Array.from(disciplines);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-6">
        <Layers className="w-16 h-16 mx-auto text-primary" />
        <h1 className="text-3xl font-display font-bold">PMI - Pós M&A Integração</h1>
        <p className="text-muted-foreground text-lg">
          Playbook completo com {pmiPlaybook.length} atividades de integração pós-aquisição organizadas por disciplina.
        </p>
        <Button size="lg" onClick={initializePlaybook}>
          Iniciar Playbook
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Layers className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-display font-bold">PMI - Pós M&A Integração</h1>
        </div>

        {/* Overall Progress */}
        <div className="flex items-center gap-4">
          <Progress value={overallStats.percent} className="flex-1 h-3" />
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            {overallStats.completed}/{overallStats.total} ({overallStats.percent}%)
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterDeadline} onValueChange={setFilterDeadline}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Prazo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os prazos</SelectItem>
              {DEADLINE_ORDER.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-3">
        {PMI_GROUPS.map((group) => {
          const stats = getGroupStats(group);
          if (stats.total === 0) return null;
          const isExpanded = expandedGroups.has(group);

          return (
            <div key={group} className="border rounded-lg overflow-hidden">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-muted/50 hover:bg-muted transition-colors text-left"
              >
                {isExpanded ? <ChevronDown className="w-5 h-5 shrink-0" /> : <ChevronRight className="w-5 h-5 shrink-0" />}
                <span className="font-semibold text-lg flex-1">{group}</span>
                <Badge variant="secondary" className="mr-2">{stats.total} atividades</Badge>
                <div className="flex items-center gap-2 w-48">
                  <Progress value={stats.percent} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground w-10 text-right">{stats.percent}%</span>
                </div>
              </button>

              {/* Disciplines */}
              {isExpanded && (
                <div className="divide-y">
                  {getDisciplines(group).map((discipline) => {
                    const dStats = getDisciplineStats(group, discipline);
                    const dKey = `${group}::${discipline}`;
                    const dExpanded = expandedDisciplines.has(dKey);
                    const disciplineActivities = filteredPlaybook.filter(
                      (i) => i.group === group && i.discipline === discipline
                    );

                    return (
                      <div key={dKey}>
                        {/* Discipline Header */}
                        <button
                          onClick={() => toggleDiscipline(dKey)}
                          className="w-full flex items-center gap-3 px-6 py-2.5 hover:bg-muted/30 transition-colors text-left"
                        >
                          {dExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                          <span className="font-medium flex-1">{discipline}</span>
                          <Badge variant="outline" className="mr-2">{dStats.total}</Badge>
                          <div className="flex items-center gap-2 w-36">
                            <Progress value={dStats.percent} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground w-10 text-right">{dStats.percent}%</span>
                          </div>
                        </button>

                        {/* Activities Table */}
                        {dExpanded && (
                          <div className="px-6 pb-3">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[180px]">Área/Tema</TableHead>
                                  <TableHead className="w-[200px]">Milestone</TableHead>
                                  <TableHead>Atividade</TableHead>
                                  <TableHead className="w-[80px] text-center">Prazo</TableHead>
                                  <TableHead className="w-[150px]">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {disciplineActivities.map((item) => {
                                  const status = getActivityStatus(item.id);
                                  return (
                                    <TableRow key={item.id}>
                                      <TableCell className="text-xs">{item.area}</TableCell>
                                      <TableCell className="text-xs">{item.milestone}</TableCell>
                                      <TableCell className="text-sm">{item.activity}</TableCell>
                                      <TableCell className="text-center">
                                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded border", getDeadlineColor(item.deadline))}>
                                          {item.deadline}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <Select
                                          value={status}
                                          onValueChange={(val) => updateStatus(item.id, val as ActivityStatus)}
                                        >
                                          <SelectTrigger className={cn("h-7 text-xs", getStatusColor(status))}>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {STATUS_OPTIONS.map((s) => (
                                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
