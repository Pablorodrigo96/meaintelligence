import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function Strategy() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Transaction Strategy</h1>
        <p className="text-muted-foreground mt-1">AI predictions and strategic recommendations for M&A success</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <TrendingUp className="w-5 h-5 text-success" />
            Strategy Engine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Strategy module coming soon. Get AI-powered transaction success predictions and post-merger integration advice.</p>
        </CardContent>
      </Card>
    </div>
  );
}
