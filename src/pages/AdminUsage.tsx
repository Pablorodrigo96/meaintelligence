import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Brain, Search, Phone, Globe, Database, Microscope, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const SERVICES = [
  { key: "ai-analyze", label: "IA (Análise)", icon: Brain, color: "hsl(var(--primary))" },
  { key: "apollo", label: "Apollo", icon: Search, color: "hsl(var(--chart-1))" },
  { key: "lusha", label: "Lusha", icon: Phone, color: "hsl(var(--chart-2))" },
  { key: "perplexity", label: "Perplexity", icon: Globe, color: "hsl(var(--chart-3))" },
  { key: "company-enrich", label: "Enriquecimento", icon: Database, color: "hsl(var(--chart-4))" },
  { key: "national-search", label: "Base Nacional", icon: Search, color: "hsl(var(--chart-5))" },
  { key: "deep-dive", label: "Deep Dive", icon: Microscope, color: "hsl(var(--accent))" },
];

const PERIODS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

export default function AdminUsage() {
  const { roles } = useAuth();
  const [period, setPeriod] = useState("30");
  const isAdmin = roles.includes("admin");

  const dateFilter = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - Number(period));
    return d.toISOString();
  }, [period]);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["api-usage-logs", period],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_usage_logs" as any)
        .select("user_id, service, action, created_at")
        .gte("created_at", dateFilter)
        .order("created_at", { ascending: false })
        .limit(10000);
      if (error) throw error;
      return data as unknown as { user_id: string; service: string; action: string | null; created_at: string }[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["all-profiles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, company_name");
      if (error) throw error;
      return data;
    },
  });

  // Aggregate by service for summary cards
  const serviceTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const log of logs) {
      map[log.service] = (map[log.service] || 0) + 1;
    }
    return SERVICES.map(s => ({ ...s, count: map[s.key] || 0 }));
  }, [logs]);

  // Aggregate by user + service for table
  const userAggregation = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const log of logs) {
      if (!map[log.user_id]) map[log.user_id] = {};
      map[log.user_id][log.service] = (map[log.user_id][log.service] || 0) + 1;
    }
    return Object.entries(map).map(([userId, services]) => {
      const profile = profiles.find(p => p.user_id === userId);
      const total = Object.values(services).reduce((a, b) => a + b, 0);
      return { userId, name: profile?.full_name || profile?.company_name || userId.slice(0, 8), services, total };
    }).sort((a, b) => b.total - a.total);
  }, [logs, profiles]);

  // Chart data
  const chartData = serviceTotals.filter(s => s.count > 0);

  if (!isAdmin) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>Acesso restrito a administradores</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            Consumo de APIs
          </h1>
          <p className="text-muted-foreground mt-1">Monitoramento de uso de serviços externos por usuário</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {serviceTotals.map(s => (
              <Card key={s.key}>
                <CardContent className="pt-4 pb-3 text-center">
                  <s.icon className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <div className="text-2xl font-bold">{s.count}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Total */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Total de chamadas: {logs.length}</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="count" name="Chamadas" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhuma chamada registrada no período</p>
              )}
            </CardContent>
          </Card>

          {/* User Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display">Consumo por Usuário</CardTitle>
            </CardHeader>
            <CardContent>
              {userAggregation.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Sem dados no período</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        {SERVICES.map(s => <TableHead key={s.key} className="text-center text-xs">{s.label}</TableHead>)}
                        <TableHead className="text-center">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userAggregation.map(row => (
                        <TableRow key={row.userId}>
                          <TableCell className="font-medium whitespace-nowrap">{row.name}</TableCell>
                          {SERVICES.map(s => (
                            <TableCell key={s.key} className="text-center">
                              {row.services[s.key] ? (
                                <Badge variant="secondary" className="text-xs">{row.services[s.key]}</Badge>
                              ) : (
                                <span className="text-muted-foreground/30">—</span>
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-center">
                            <Badge className="bg-primary/10 text-primary border-0">{row.total}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
