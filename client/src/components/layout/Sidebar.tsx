import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Package, FileText, ArrowRightLeft, Settings, PieChart, LogOut, Store, CreditCard } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function Sidebar() {
  const [location] = useLocation();
  const { user: store, signout } = useAuth();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Package, label: "Stock / Inventory", href: "/inventory" },
    { icon: FileText, label: "Billing", href: "/billing" },
    { icon: ArrowRightLeft, label: "Transfers", href: "/transfers" },
    { icon: PieChart, label: "Reports", href: "/reports" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  };

  return (
    <div className="h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
            S
          </div>
          <span className="font-heading font-bold text-xl tracking-tight text-sidebar-foreground">Salemate</span>
        </div>
      </div>
      
      <div className="p-4 border-b border-sidebar-border bg-sidebar-accent/20">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            <AvatarImage src={store?.shopPhoto || undefined} alt={store?.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {store?.shopPhoto ? <Store className="h-5 w-5" /> : getInitials(store?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-sidebar-foreground truncate" data-testid="text-store-name">
              {store?.name || "Loading..."}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate" data-testid="text-owner-name">
              {store?.ownerName || "Owner"}
            </p>
            <p className="text-xs text-muted-foreground truncate" data-testid="text-phone">
              {store?.phone}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/10 space-y-3">
        <Link href="/subscription">
          <div className="flex items-center gap-3 p-2 rounded-lg border border-border bg-background/50 hover:bg-primary/5 cursor-pointer transition-colors" data-testid="link-subscription">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
              <CreditCard className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" data-testid="text-plan-name">{store?.plan || 'FREE'} Plan</p>
              <p className="text-xs text-muted-foreground">Tap to upgrade</p>
            </div>
          </div>
        </Link>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={signout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
