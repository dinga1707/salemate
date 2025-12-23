import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IndianRupee, Package, ShoppingCart, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data: items } = useQuery({ 
    queryKey: ['items'], 
    queryFn: () => api.items.list() 
  });
  const { data: invoices } = useQuery({ 
    queryKey: ['invoices'], 
    queryFn: () => api.invoices.list() 
  });

  const lowStockItems = items?.filter(i => Number(i.quantity) < 5).length || 0;
  const itemCostMap = new Map(
    (items || []).map((item) => [item.id, Number(item.costPrice) || 0])
  );
  const currentMonthRevenue = (invoices || []).reduce((acc, inv) => {
    const invoiceDate = new Date(inv.date);
    const now = new Date();
    const isCurrentMonth =
      invoiceDate.getFullYear() === now.getFullYear() &&
      invoiceDate.getMonth() === now.getMonth();
    if (!isCurrentMonth) return acc;
    return acc + Number(inv.grandTotal || 0);
  }, 0);
  const currentMonthProfit = (invoices || []).reduce((acc, inv) => {
    const invoiceDate = new Date(inv.date);
    const now = new Date();
    const isCurrentMonth =
      invoiceDate.getFullYear() === now.getFullYear() &&
      invoiceDate.getMonth() === now.getMonth();
    if (!isCurrentMonth) return acc;

    const invoiceProfit = (inv.items || []).reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const discount = Number(item.discount) || 0;
      const lineTotal = Number(item.total) || (unitPrice * quantity) - discount;
      const costPrice = item.itemId ? (itemCostMap.get(item.itemId) || 0) : 0;
      return sum + (lineTotal - (costPrice * quantity));
    }, 0);

    return acc + invoiceProfit;
  }, 0);
  const cashBalance = (invoices || []).reduce((acc, inv) => {
    const method = inv.paymentMethod || "CASH";
    if (method === "CASH") return acc + Number(inv.grandTotal || 0);
    return acc;
  }, 0);
  const bankBalance = (invoices || []).reduce((acc, inv) => {
    const method = inv.paymentMethod || "CASH";
    if (method !== "CASH" && method !== "PAY_LATER") return acc + Number(inv.grandTotal || 0);
    return acc;
  }, 0);
  const toReceiveBalance = (invoices || []).reduce((acc, inv) => {
    const method = inv.paymentMethod || "CASH";
    if (method === "PAY_LATER") return acc + Number(inv.grandTotal || 0);
    return acc;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your store performance.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/billing/new">
            <Button size="lg" className="shadow-lg hover:shadow-xl transition-all" data-testid="button-new-invoice">
              <ShoppingCart className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </Link>
          <Link href="/inventory">
            <Button variant="outline" size="lg" data-testid="button-add-stock">
              <Package className="mr-2 h-4 w-4" />
              Add Stock
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Month Profit</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-current-month-profit">₹{currentMonthProfit.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground" data-testid="text-current-month-revenue">
              Revenue: ₹{currentMonthRevenue.toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">To Receive</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-to-receive">₹{toReceiveBalance.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">Pay Later invoices</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning" data-testid="text-low-stock">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Items below 5 qty</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash / Bank Balance</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-cash-balance">₹{cashBalance.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground" data-testid="text-bank-balance">
              Bank: ₹{bankBalance.toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>
        <Link href="/billing" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Invoices</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-invoices">{invoices?.length || 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoices?.slice(-5).reverse().map((inv) => (
                <div key={inv.id} className="flex items-center" data-testid={`invoice-${inv.id}`}>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{inv.customerName || "Cash Sale"}</p>
                    <p className="text-sm text-muted-foreground">{inv.invoiceNumber}</p>
                  </div>
                  <div className="ml-auto font-medium">+₹{Number(inv.grandTotal).toLocaleString('en-IN')}</div>
                </div>
              ))}
              {(!invoices || invoices.length === 0) && (
                 <div className="text-center text-muted-foreground py-8">No invoices yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
             <CardContent className="grid gap-2">
                <Button variant="ghost" className="justify-start">Generate GST Report</Button>
                <Button variant="ghost" className="justify-start">Create Transfer Request</Button>
                <Button variant="ghost" className="justify-start">Manage Templates</Button>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
