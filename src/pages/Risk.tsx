import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function Risk() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Risk Analysis</h1>
        <p className="text-muted-foreground mt-1">Consolidated risk dashboard across financial, legal, and operational dimensions</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Risk Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Risk analysis module coming soon. View risk matrices, trend charts, and AI-generated mitigation recommendations.</p>
        </CardContent>
      </Card>
    </div>
  );
}
