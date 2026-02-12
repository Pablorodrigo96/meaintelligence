import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function Contracts() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Contract Generation</h1>
        <p className="text-muted-foreground mt-1">AI-generated legal documents and contract templates</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <FileText className="w-5 h-5 text-accent" />
            Document Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Contracts module coming soon. Generate NDAs, purchase agreements, and shareholder agreements with AI assistance.</p>
        </CardContent>
      </Card>
    </div>
  );
}
