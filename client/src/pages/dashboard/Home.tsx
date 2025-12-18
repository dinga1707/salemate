import { useQuery } from "@tanstack/react-query";
import { db } from "@/services/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IndianRupee, Package, ShoppingCart, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data: items } = useQuery({ queryKey: ['items'], queryFn: () => db.getItems() });
  const { data: invoices } = useQuery({ queryKey: ['invoices'], queryFn: () => db.getInvoices() });

  const totalStockValue = items?.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0) || 0;
  const totalSales = invoices?.reduce((acc, inv) => acc + inv.grandTotal, 0) || 0;
  const lowStockItems = items?.filter(i => i.quantity < 5).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your store performance.</p>
        </div>
        <div className="flex gap-2">
           <Link href="/billing/new">
            <Button size="lg" className="shadow-lg hover:shadow-xl transition-all">
              <ShoppingCart className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </Link>
          <Link href="/inventory">
            <Button variant="outline" size="lg">
              <Package className="mr-2 h-4 w-4" />
              Add Stock
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalSales.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalStockValue.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">{items?.length} distinct items</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Items below 5 qty</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Invoices</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices?.length || 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoices?.slice(-5).reverse().map((inv) => (
                <div key={inv.id} className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{inv.customerName || "Cash Sale"}</p>
                    <p className="text-sm text-muted-foreground">{inv.invoiceNumber}</p>
                  </div>
                  <div className="ml-auto font-medium">+₹{inv.grandTotal.toLocaleString('en-IN')}</div>
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
