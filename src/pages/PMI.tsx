import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { format, parseISO } from "date-fns";
import { pmiPlaybook, PMI_GROUPS, DEADLINE_ORDER, STATUS_OPTIONS, getDeadlineColor, getStatusColor, getStatusLabel } from "@/data/pmi-playbook";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChevronDown, ChevronRight, Layers, Filter, CalendarIcon, Plus, Pencil, Trash2, Search, ChevronsUpDown, Download, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import PMIDashboard from "@/components/pmi/PMIDashboard";
import PMIActivityDialog, { type ActivityFormData } from "@/components/pmi/PMIActivityDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ActivityStatus = "pending" | "in_progress" | "completed" | "blocked";

interface ActivityState {
  id: number;
  status: ActivityStatus;
  dbId?: string;
  responsible?: string;
  dueDate?: string | null;
  notes?: string | null;
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
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [filterDiscipline, setFilterDiscipline] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<(ActivityFormData & { activityId: number; dbId?: string }) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ activityId: number; dbId?: string } | null>(null);
  const activitiesRef = useRef<ActivityState[]>([]);

  useEffect(() => {
    activitiesRef.current = activities;
  }, [activities]);

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
          responsible: (dbRow as any)?.responsible || "",
          dueDate: (dbRow as any)?.due_date || null,
          notes: (dbRow as any)?.notes || null,
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
    const activity = activitiesRef.current.find((a) => a.id === activityId);
    if (!activity?.dbId) {
      console.warn("updateStatus: no dbId for activity", activityId);
      return;
    }

    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, status: newStatus } : a))
    );

    const { error } = await supabase
      .from("pmi_activities")
      .update({ status: newStatus })
      .eq("id", activity.dbId);

    if (error) {
      console.error("Error updating status:", error);
      setActivities((prev) =>
        prev.map((a) => (a.id === activityId ? { ...a, status: activity.status } : a))
      );
    }
  }, []);

  const updateResponsible = useCallback(async (activityId: number, value: string) => {
    const activity = activitiesRef.current.find((a) => a.id === activityId);
    if (!activity?.dbId) {
      console.warn("updateResponsible: no dbId for activity", activityId);
      return;
    }

    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, responsible: value } : a))
    );

    const { error } = await supabase
      .from("pmi_activities")
      .update({ responsible: value } as any)
      .eq("id", activity.dbId);

    if (error) console.error("Error updating responsible:", error);
  }, []);

  const updateDueDate = useCallback(async (activityId: number, date: Date | undefined) => {
    const activity = activitiesRef.current.find((a) => a.id === activityId);
    if (!activity?.dbId) {
      console.warn("updateDueDate: no dbId for activity", activityId);
      return;
    }

    const dateStr = date ? format(date, "yyyy-MM-dd") : null;

    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, dueDate: dateStr } : a))
    );

    const { error } = await supabase
      .from("pmi_activities")
      .update({ due_date: dateStr } as any)
      .eq("id", activity.dbId);

    if (error) console.error("Error updating due_date:", error);
  }, []);

  const updateNotes = useCallback(async (activityId: number, value: string) => {
    const activity = activitiesRef.current.find((a) => a.id === activityId);
    if (!activity?.dbId) return;

    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, notes: value || null } : a))
    );

    const { error } = await supabase
      .from("pmi_activities")
      .update({ notes: value || null })
      .eq("id", activity.dbId);

    if (error) console.error("Error updating notes:", error);
  }, []);

  const addActivity = async (data: ActivityFormData) => {
    if (!user) return;
    const { data: inserted, error } = await supabase
      .from("pmi_activities")
      .insert({
        user_id: user.id,
        group_name: data.group,
        discipline: data.discipline,
        area: data.area,
        milestone: data.milestone,
        activity: data.activity,
        deadline: data.deadline,
        responsible: data.responsible || null,
        due_date: data.dueDate || null,
        notes: data.notes || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao adicionar atividade", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Atividade adicionada!" });
    await loadActivities();
  };

  const editActivity = async (activityId: number, dbId: string | undefined, data: ActivityFormData) => {
    if (!dbId) return;
    const { error } = await supabase
      .from("pmi_activities")
      .update({
        group_name: data.group,
        discipline: data.discipline,
        area: data.area,
        milestone: data.milestone,
        activity: data.activity,
        deadline: data.deadline,
        responsible: data.responsible || null,
        due_date: data.dueDate || null,
        notes: data.notes || null,
      })
      .eq("id", dbId);

    if (error) {
      toast({ title: "Erro ao editar atividade", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Atividade atualizada!" });
    await loadActivities();
  };

  const deleteActivity = async () => {
    if (!deleteTarget?.dbId) return;
    const { error } = await supabase
      .from("pmi_activities")
      .delete()
      .eq("id", deleteTarget.dbId);

    if (error) {
      toast({ title: "Erro ao excluir atividade", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Atividade excluída!" });
    setDeleteTarget(null);
    await loadActivities();
  };

  const handleSaveDialog = (data: ActivityFormData) => {
    if (editingActivity) {
      editActivity(editingActivity.activityId, editingActivity.dbId, data);
    } else {
      addActivity(data);
    }
    setEditingActivity(null);
  };

  const openEditDialog = (item: any, state: ActivityState | undefined) => {
    setEditingActivity({
      activityId: item.id,
      dbId: state?.dbId,
      group: item.group,
      discipline: item.discipline,
      area: item.area,
      milestone: item.milestone,
      activity: item.activity,
      deadline: item.deadline,
      responsible: state?.responsible || "",
      dueDate: state?.dueDate || null,
      notes: state?.notes || "",
    });
    setDialogOpen(true);
  };

  const getActivityStatus = (id: number): ActivityStatus => {
    return activities.find((a) => a.id === id)?.status || "pending";
  };

  const getActivityState = (id: number): ActivityState | undefined => {
    return activities.find((a) => a.id === id);
  };

  const allDisciplines = useMemo(() => {
    const set = new Set(pmiPlaybook.map((i) => i.discipline));
    return Array.from(set).sort();
  }, []);

  const filteredPlaybook = useMemo(() => {
    const search = searchText.toLowerCase().trim();
    return pmiPlaybook.filter((item) => {
      if (filterDeadline !== "all" && item.deadline !== filterDeadline) return false;
      if (filterStatus !== "all" && getActivityStatus(item.id) !== filterStatus) return false;
      if (filterGroup !== "all" && item.group !== filterGroup) return false;
      if (filterDiscipline !== "all" && item.discipline !== filterDiscipline) return false;
      if (search) {
        const state = getActivityState(item.id);
        const haystack = [item.activity, item.area, item.milestone, item.discipline, item.group, state?.responsible || ""].join(" ").toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [filterDeadline, filterStatus, filterGroup, filterDiscipline, searchText, activities]);

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

  const dashboardActivities = useMemo(() => {
    return pmiPlaybook.map((item) => {
      const state = getActivityState(item.id);
      return {
        id: item.id,
        group: item.group,
        discipline: item.discipline,
        deadline: item.deadline,
        activity: item.activity,
        status: (state?.status || "pending") as ActivityStatus,
        dueDate: state?.dueDate,
      };
    });
  }, [activities]);

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

  const expandAll = () => {
    const groups = new Set(filteredPlaybook.map((i) => i.group));
    setExpandedGroups(groups);
    const disciplines = new Set(filteredPlaybook.map((i) => `${i.group}::${i.discipline}`));
    setExpandedDisciplines(disciplines);
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
    setExpandedDisciplines(new Set());
  };

  const exportCSV = () => {
    const today = new Date().toISOString().split("T")[0];
    const headers = ["Grupo", "Disciplina", "Área/Tema", "Milestone", "Atividade", "Prazo", "Status", "Responsável", "Data Prazo", "Notas"];
    const rows = filteredPlaybook.map((item) => {
      const state = getActivityState(item.id);
      return [
        item.group,
        item.discipline,
        item.area,
        item.milestone,
        item.activity,
        item.deadline,
        getStatusLabel(state?.status || "pending"),
        state?.responsible || "",
        state?.dueDate || "",
        state?.notes || "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pmi-playbook-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exportado!", description: `${filteredPlaybook.length} atividades exportadas.` });
  };

  const getDisciplines = (groupName: string) => {
    const disciplines = new Set(filteredPlaybook.filter((i) => i.group === groupName).map((i) => i.discipline));
    return Array.from(disciplines);
  };

  const isOverdue = (dueDate: string | null | undefined, status: string) => {
    if (!dueDate || status === "completed") return false;
    const today = new Date().toISOString().split("T")[0];
    return dueDate < today;
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
      <div className="flex items-center gap-3">
        <Layers className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-display font-bold">PMI - Pós M&A Integração</h1>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="playbook">Playbook</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <PMIDashboard activities={dashboardActivities} />
        </TabsContent>

        <TabsContent value="playbook">
          <div className="space-y-6">
            {/* Overall Progress */}
            <div className="flex items-center gap-4">
              <Progress value={overallStats.percent} className="flex-1 h-3" />
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                {overallStats.completed}/{overallStats.total} ({overallStats.percent}%)
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por atividade, área, milestone, disciplina ou responsável..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9"
              />
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
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os grupos</SelectItem>
                  {PMI_GROUPS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Disciplina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as disciplinas</SelectItem>
                  {allDisciplines.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={expandAll}>
                  <ChevronsUpDown className="w-4 h-4 mr-1" /> Expandir
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>
                  Recolher
                </Button>
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="w-4 h-4 mr-1" /> CSV
                </Button>
                <Button size="sm" onClick={() => { setEditingActivity(null); setDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-1" /> Nova Atividade
                </Button>
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

                              {dExpanded && (
                                <div className="px-6 pb-3">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-[150px]">Área/Tema</TableHead>
                                        <TableHead className="w-[180px]">Milestone</TableHead>
                                        <TableHead>Atividade</TableHead>
                                        <TableHead className="w-[140px]">Responsável</TableHead>
                                        <TableHead className="w-[120px]">Data Prazo</TableHead>
                                        <TableHead className="w-[70px] text-center">Prazo</TableHead>
                                        <TableHead className="w-[140px]">Status</TableHead>
                                        <TableHead className="w-[80px] text-center">Ações</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {disciplineActivities.map((item) => {
                                        const state = getActivityState(item.id);
                                        const status = state?.status || "pending";
                                        const responsible = state?.responsible || "";
                                        const dueDate = state?.dueDate;
                                        const overdue = isOverdue(dueDate, status);

                                        return (
                                          <TableRow key={item.id} className={cn(overdue && "bg-destructive/5")}>
                                            <TableCell className="text-xs">{item.area}</TableCell>
                                            <TableCell className="text-xs">{item.milestone}</TableCell>
                                            <TableCell className="text-sm">
                                              <div className="flex items-start gap-1">
                                                <span>{item.activity}</span>
                                                {state?.notes && (
                                                  <TooltipProvider>
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <span className="inline-block w-2 h-2 rounded-full bg-primary mt-1 shrink-0 cursor-help" />
                                                      </TooltipTrigger>
                                                      <TooltipContent side="top" className="max-w-xs">
                                                        <p className="text-xs whitespace-pre-wrap">{state.notes}</p>
                                                      </TooltipContent>
                                                    </Tooltip>
                                                  </TooltipProvider>
                                                )}
                                              </div>
                                            </TableCell>
                                            <TableCell>
                                              <Input
                                                className="h-7 text-xs"
                                                placeholder="Responsável"
                                                defaultValue={responsible}
                                                onBlur={(e) => {
                                                  if (e.target.value !== responsible) {
                                                    updateResponsible(item.id, e.target.value);
                                                  }
                                                }}
                                              />
                                            </TableCell>
                                            <TableCell>
                                              <Popover>
                                                <PopoverTrigger asChild>
                                                  <Button
                                                    variant="outline"
                                                    className={cn(
                                                      "h-7 w-full justify-start text-left text-xs font-normal",
                                                      !dueDate && "text-muted-foreground",
                                                      overdue && "border-destructive text-destructive"
                                                    )}
                                                  >
                                                    {overdue && <AlertCircle className="mr-1 h-3 w-3 text-destructive" />}
                                                    <CalendarIcon className="mr-1 h-3 w-3" />
                                                    {dueDate ? format(parseISO(dueDate), "dd/MM/yyyy") : "Selecionar"}
                                                  </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                  <Calendar
                                                    mode="single"
                                                    selected={dueDate ? parseISO(dueDate) : undefined}
                                                    onSelect={(date) => updateDueDate(item.id, date)}
                                                    initialFocus
                                                    className={cn("p-3 pointer-events-auto")}
                                                  />
                                                </PopoverContent>
                                              </Popover>
                                            </TableCell>
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
                                            <TableCell className="text-center">
                                              <div className="flex items-center justify-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(item, state)}>
                                                  <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ activityId: item.id, dbId: state?.dbId })}>
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                              </div>
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
        </TabsContent>
      </Tabs>

      <PMIActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activity={editingActivity || undefined}
        onSave={handleSaveDialog}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta atividade? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteActivity}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
