import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import AppShell from "@/components/layout/AppShell";
import Home from "@/pages/dashboard/Home";
import InventoryList from "@/pages/inventory/InventoryList";
import ScanBill from "@/pages/inventory/ScanBill";
import InvoiceList from "@/pages/billing/InvoiceList";
import CreateInvoice from "@/pages/billing/CreateInvoice";
import EditInvoice from "@/pages/billing/EditInvoice";
import TransferList from "@/pages/transfers/TransferList";
import CreateTransfer from "@/pages/transfers/CreateTransfer";
import TransferInvoice from "@/pages/transfers/TransferInvoice";
import Subscription from "@/pages/subscription/Subscription";
import Reports from "@/pages/reports/Reports";
import PartyList from "@/pages/parties/PartyList";
import Settings from "@/pages/settings/Settings";
import SignUp from "@/pages/auth/SignUp";
import SignIn from "@/pages/auth/SignIn";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/signin" />;
  }

  return <Component />;
}

function AuthRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/signup">
        <AuthRoute component={SignUp} />
      </Route>
      <Route path="/signin">
        <AuthRoute component={SignIn} />
      </Route>
      <Route path="/forgot-password">
        <AuthRoute component={ForgotPassword} />
      </Route>
      <Route path="/">
        <ProtectedRoute component={() => (
          <AppShell>
            <Home />
          </AppShell>
        )} />
      </Route>
      <Route path="/inventory">
        <ProtectedRoute component={() => (
          <AppShell>
            <InventoryList />
          </AppShell>
        )} />
      </Route>
      <Route path="/inventory/scan">
        <ProtectedRoute component={() => (
          <AppShell>
            <ScanBill />
          </AppShell>
        )} />
      </Route>
      <Route path="/billing">
        <ProtectedRoute component={() => (
          <AppShell>
            <InvoiceList />
          </AppShell>
        )} />
      </Route>
      <Route path="/billing/new">
        <ProtectedRoute component={() => (
          <AppShell>
            <CreateInvoice />
          </AppShell>
        )} />
      </Route>
      <Route path="/billing/edit/:id">
        <ProtectedRoute component={() => (
          <AppShell>
            <EditInvoice />
          </AppShell>
        )} />
      </Route>
      <Route path="/transfers">
        <ProtectedRoute component={() => (
          <AppShell>
            <TransferList />
          </AppShell>
        )} />
      </Route>
      <Route path="/transfers/new">
        <ProtectedRoute component={() => (
          <AppShell>
            <CreateTransfer />
          </AppShell>
        )} />
      </Route>
      <Route path="/transfers/:id/invoice">
        <ProtectedRoute component={() => (
          <AppShell>
            <TransferInvoice />
          </AppShell>
        )} />
      </Route>
      <Route path="/subscription">
        <ProtectedRoute component={() => (
          <AppShell>
            <Subscription />
          </AppShell>
        )} />
      </Route>
      <Route path="/reports">
        <ProtectedRoute component={() => (
          <AppShell>
            <Reports />
          </AppShell>
        )} />
      </Route>
      <Route path="/parties">
        <ProtectedRoute component={() => (
          <AppShell>
            <PartyList />
          </AppShell>
        )} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
