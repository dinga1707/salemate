import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Package, FileText, ArrowRightLeft, Settings, PieChart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function Sidebar() {
  const [location] = useLocation();
  const { data: store } = useQuery({ 
    queryKey: ['store'], 
    queryFn: () => api.store.get() 
  });

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Package, label: "Stock / Inventory", href: "/inventory" },
    { icon: FileText, label: "Billing", href: "/billing" },
    { icon: ArrowRightLeft, label: "Transfers", href: "/transfers" },
    { icon: PieChart, label: "Reports", href: "/reports" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  return (
    <div className="h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
            S
          </div>
          <span className="font-heading font-bold text-xl tracking-tight text-sidebar-foreground">Salemate</span>
        </div>
        <div className="text-xs text-sidebar-foreground/60 px-1 truncate">
          {store?.name || "Loading..."}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <a
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.label}
              </a>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/10">
        <div className="flex items-center gap-3 p-2 rounded-lg border border-border bg-background/50">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
            {store?.plan?.substring(0, 1) || "F"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-plan-name">{store?.plan} Plan</p>
            <p className="text-xs text-muted-foreground">Valid till Dec 2025</p>
          </div>
        </div>
      </div>
    </div>
  );
}
