import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";

export default function Matching() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Buyer-Seller Matching</h1>
        <p className="text-muted-foreground mt-1">AI-powered matching algorithm for compatible acquisitions</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <Search className="w-5 h-5 text-accent" />
            Matching Engine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Matching module coming soon. Define acquisition criteria and get AI-ranked compatibility scores.</p>
        </CardContent>
      </Card>
    </div>
  );
}
