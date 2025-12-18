import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AppShell from "@/components/layout/AppShell";
import Home from "@/pages/dashboard/Home";
import InventoryList from "@/pages/inventory/InventoryList";
import InvoiceList from "@/pages/billing/InvoiceList";
import CreateInvoice from "@/pages/billing/CreateInvoice";
import TransferList from "@/pages/transfers/TransferList";

function Router() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/inventory" component={InventoryList} />
        <Route path="/billing" component={InvoiceList} />
        <Route path="/billing/new" component={CreateInvoice} />
        <Route path="/transfers" component={TransferList} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
