import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Search, Shield, Calculator, TrendingUp, FileText, AlertTriangle, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const metrics = [
  { title: "Empresas", icon: Building2, color: "text-primary", table: "companies" as const, filter: null },
  { title: "Matches Ativos", icon: Search, color: "text-accent", table: "matches" as const, filter: { column: "status", not: "dismissed" } },
  { title: "Valuations", icon: Calculator, color: "text-primary", table: "valuations" as const, filter: null },
  { title: "Contratos", icon: FileText, color: "text-accent", table: "contracts" as const, filter: null },
  { title: "Due Diligence", icon: Shield, color: "text-warning", table: "due_diligence_reports" as const, filter: null },
  { title: "Análises de Risco", icon: AlertTriangle, color: "text-destructive", table: "risk_assessments" as const, filter: null },
];

const modules = [
  { title: "Empresas", description: "Gerencie perfis de empresas e dados financeiros", icon: Building2, path: "/companies", color: "text-primary" },
  { title: "Matching", description: "Encontre compradores e vendedores compatíveis", icon: Search, path: "/matching", color: "text-accent" },
  { title: "Due Diligence", description: "Análise automática de documentos", icon: Shield, path: "/due-diligence", color: "text-warning" },
  { title: "Valuation", description: "Análise de DCF e EBITDA", icon: Calculator, path: "/valuation", color: "text-primary" },
  { title: "Estratégia", description: "Previsões de transações", icon: TrendingUp, path: "/strategy", color: "text-success" },
  { title: "Contratos", description: "Gere documentos legais", icon: FileText, path: "/contracts", color: "text-accent" },
  { title: "Análise de Risco", description: "Pontuação de risco abrangente", icon: AlertTriangle, path: "/risk", color: "text-destructive" },
];

function useMetricCount(table: string, filter: { column: string; not: string } | null) {
  return useQuery({
    queryKey: ["metric", table],
    queryFn: async () => {
      const query = supabase.from(table as "companies").select("*", { count: "exact", head: true });
      if (filter) {
        const { count, error } = await query.neq(filter.column as "id", filter.not);
        if (error) throw error;
        return count ?? 0;
      }
      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function MetricCard({ title, icon: Icon, color, table, filter }: typeof metrics[number]) {
  const { data: count, isLoading } = useMetricCount(table, filter);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{count}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user, roles } = useAuth();

  const roleNames: Record<string, string> = { buyer: "Comprador", seller: "Vendedor", advisor: "Consultor", admin: "Admin" };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Painel</h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo(a) de volta{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}.
          {roles.length > 0 && <span> Cargo: {roles.map(r => roleNames[r] || r).join(", ")}</span>}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {metrics.map((m) => (
          <MetricCard key={m.table} {...m} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {modules.map((mod) => (
          <Link key={mod.path} to={mod.path}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className={`p-2.5 rounded-lg bg-muted ${mod.color}`}>
                  <mod.icon className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-display group-hover:text-primary transition-colors">
                  {mod.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{mod.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
