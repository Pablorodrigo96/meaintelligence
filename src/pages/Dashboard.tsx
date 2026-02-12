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
  { title: "Risk Assessments", icon: AlertTriangle, color: "text-destructive", table: "risk_assessments" as const, filter: null },
];

const modules = [
  { title: "Companies", description: "Manage company profiles and financials", icon: Building2, path: "/companies", color: "text-primary" },
  { title: "Matching", description: "Find compatible buyers and sellers", icon: Search, path: "/matching", color: "text-accent" },
  { title: "Due Diligence", description: "Automated document review", icon: Shield, path: "/due-diligence", color: "text-warning" },
  { title: "Valuation", description: "DCF and EBITDA analysis", icon: Calculator, path: "/valuation", color: "text-primary" },
  { title: "Strategy", description: "Transaction predictions", icon: TrendingUp, path: "/strategy", color: "text-success" },
  { title: "Contracts", description: "Generate legal documents", icon: FileText, path: "/contracts", color: "text-accent" },
  { title: "Risk Analysis", description: "Comprehensive risk scoring", icon: AlertTriangle, path: "/risk", color: "text-destructive" },
];

function useMetricCount(table: string, filter: { column: string; not: string } | null) {
  return useQuery({
    queryKey: ["metric", table],
    queryFn: async () => {
      // Use type assertion to handle dynamic table name
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}.
          {roles.length > 0 && <span className="capitalize"> Role: {roles.join(", ")}</span>}
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
