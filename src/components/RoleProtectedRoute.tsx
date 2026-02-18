import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  requiredRole: string;
  children: React.ReactNode;
}

export function RoleProtectedRoute({ requiredRole, children }: Props) {
  const { roles, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!roles.includes(requiredRole as any)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
