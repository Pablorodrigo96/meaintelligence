import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";

export default function Valuation() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Company Valuation</h1>
        <p className="text-muted-foreground mt-1">DCF and EBITDA-based valuation models with sensitivity analysis</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <Calculator className="w-5 h-5 text-primary" />
            Valuation Models
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Valuation module coming soon. Calculate company valuations with adjustable growth and discount rates.</p>
        </CardContent>
      </Card>
    </div>
  );
}
