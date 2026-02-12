import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Search, Shield, Calculator, TrendingUp, FileText, AlertTriangle, Users } from "lucide-react";
import { Link } from "react-router-dom";

const modules = [
  { title: "Companies", description: "Manage company profiles and financials", icon: Building2, path: "/companies", color: "text-primary" },
  { title: "Matching", description: "Find compatible buyers and sellers", icon: Search, path: "/matching", color: "text-accent" },
  { title: "Due Diligence", description: "Automated document review", icon: Shield, path: "/due-diligence", color: "text-warning" },
  { title: "Valuation", description: "DCF and EBITDA analysis", icon: Calculator, path: "/valuation", color: "text-primary" },
  { title: "Strategy", description: "Transaction predictions", icon: TrendingUp, path: "/strategy", color: "text-success" },
  { title: "Contracts", description: "Generate legal documents", icon: FileText, path: "/contracts", color: "text-accent" },
  { title: "Risk Analysis", description: "Comprehensive risk scoring", icon: AlertTriangle, path: "/risk", color: "text-destructive" },
];

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
