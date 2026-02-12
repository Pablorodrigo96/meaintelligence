import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function AdminUsers() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">Manage platform users and roles</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <Users className="w-5 h-5 text-primary" />
            Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Admin user management coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
