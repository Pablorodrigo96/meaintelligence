import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <AppSidebar />
      </div>

      {/* Mobile header + sheet */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-border bg-background shrink-0">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <AppSidebar onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-xs">
              M&A
            </div>
            <span className="font-display font-semibold text-sm">M&A Intelligence</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="container py-4 md:py-8 px-4 md:px-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
