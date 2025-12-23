import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="md:hidden sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img
              src="/assets/salemate-logo.png"
              alt="Salemate"
              className="h-7 w-7 object-contain"
            />
            <span className="font-heading font-bold text-lg tracking-tight">Salemate</span>
          </div>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <Sidebar isMobile onNavigate={() => setIsOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Sidebar className="hidden md:flex" />
      <main className="flex-1 md:ml-64 px-4 sm:px-6 lg:px-8 pt-6 md:pt-8 pb-10 md:h-screen md:overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
