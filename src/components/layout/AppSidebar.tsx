import { Link, useLocation } from "react-router-dom";
import {
  Building2,
  LayoutDashboard,
  Users,
  Search,
  Shield,
  Calculator,
  TrendingUp,
  FileText,
  AlertTriangle,
  Layers,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

const navItems = [
  { label: "Painel", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Empresas", icon: Building2, path: "/companies" },
  { label: "Matching", icon: Search, path: "/matching" },
  { label: "Due Diligence", icon: Shield, path: "/due-diligence" },
  { label: "Valuation", icon: Calculator, path: "/valuation" },
  { label: "Estratégia", icon: TrendingUp, path: "/strategy" },
  { label: "Contratos", icon: FileText, path: "/contracts" },
  { label: "PMI", icon: Layers, path: "/pmi" },
  { label: "Análise de Risco", icon: AlertTriangle, path: "/risk" },
];

const adminItems = [
  { label: "Gestão de Usuários", icon: Users, path: "/admin/users" },
  { label: "Configurações", icon: Settings, path: "/admin/settings" },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut, roles, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();
  const isAdmin = roles.includes("admin" as any);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border overflow-hidden">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-display font-bold text-sm shrink-0">
          M&A
        </div>
        {!collapsed && (
          <span className="font-display font-semibold text-sidebar-accent-foreground truncate whitespace-nowrap transition-opacity duration-200">
            M&A Intelligence
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <span className="truncate whitespace-nowrap">{item.label}</span>
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-4 pb-2 px-3 h-8">
              {!collapsed && (
                <span className="text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50 block">
                  Admin
                </span>
              )}
            </div>
            {adminItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {!collapsed && (
                    <span className="truncate whitespace-nowrap">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 space-y-1 overflow-hidden">
        {!collapsed && user && (
          <div className="px-3 py-2 text-xs text-sidebar-foreground/60 truncate whitespace-nowrap">
            {user.email}
          </div>
        )}
        
        <button
          onClick={toggleTheme}
          aria-label="Alternar tema"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors w-full"
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5 shrink-0" />
          ) : (
            <Moon className="w-5 h-5 shrink-0" />
          )}
          {!collapsed && (
            <span className="whitespace-nowrap">
              {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
            </span>
          )}
        </button>

        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">Sair</span>}
        </button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full h-8 text-sidebar-foreground/50 hover:text-sidebar-foreground"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>
    </aside>
  );
}
