import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function Companies() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Companies</h1>
        <p className="text-muted-foreground mt-1">Manage company profiles, financials, and risk classifications</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <Building2 className="w-5 h-5 text-primary" />
            Company Profiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Company profiling module coming soon. You'll be able to add companies, upload financial documents, and view AI-generated risk assessments.</p>
        </CardContent>
      </Card>
    </div>
  );
}
