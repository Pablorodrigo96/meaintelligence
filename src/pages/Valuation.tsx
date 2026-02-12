import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";

export default function Valuation() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Valuation de Empresa</h1>
        <p className="text-muted-foreground mt-1">Modelos de valuation baseados em DCF e EBITDA com análise de sensibilidade</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Valuation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <iframe
            src="https://vcedealflow.lovable.app/valuation"
            title="Valuation Tool"
            width="100%"
            height="800"
            frameBorder="0"
            className="rounded-lg border border-border"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </CardContent>
      </Card>
    </div>
  );
}
