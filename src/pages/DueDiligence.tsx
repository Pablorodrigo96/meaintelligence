import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function DueDiligence() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Due Diligence</h1>
        <p className="text-muted-foreground mt-1">Automated legal and financial document analysis</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <Shield className="w-5 h-5 text-warning" />
            Document Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Due diligence module coming soon. Upload documents for AI-powered risk identification and compliance checking.</p>
        </CardContent>
      </Card>
    </div>
  );
}
