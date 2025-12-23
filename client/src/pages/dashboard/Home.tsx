import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { IndianRupee, Package, ShoppingCart, Lock } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CartesianGrid, Line, LineChart, Pie, PieChart, XAxis, YAxis, Cell } from "recharts";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { user: store } = useAuth();
  const { data: items } = useQuery({ 
    queryKey: ['items'], 
    queryFn: () => api.items.list() 
  });
  const { data: invoices } = useQuery({ 
    queryKey: ['invoices'], 
    queryFn: () => api.invoices.list() 
  });

  const itemCostMap = new Map(
    (items || []).map((item) => [item.id, Number(item.costPrice) || 0])
  );
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyMap = new Map<string, { label: string; revenue: number; profit: number }>();

  for (let i = 11; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    monthlyMap.set(key, {
      label: `${monthLabels[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`,
      revenue: 0,
      profit: 0,
    });
  }

  let currentMonthRevenue = 0;
  let currentMonthProfit = 0;

  (invoices || []).forEach((inv) => {
    const invoiceDate = new Date(inv.date);
    if (invoiceDate < monthStart) return;

    const revenue = Number(inv.grandTotal || 0);
    const invoiceProfit = (inv.items || []).reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const discount = Number(item.discount) || 0;
      const lineTotal = Number(item.total) || (unitPrice * quantity) - discount;
      const costPrice = item.itemId ? (itemCostMap.get(item.itemId) || 0) : 0;
      return sum + (lineTotal - (costPrice * quantity));
    }, 0);

    const key = `${invoiceDate.getFullYear()}-${invoiceDate.getMonth()}`;
    const monthBucket = monthlyMap.get(key);
    if (monthBucket) {
      monthBucket.revenue += revenue;
      monthBucket.profit += invoiceProfit;
    }

    if (invoiceDate.getFullYear() === now.getFullYear() && invoiceDate.getMonth() === now.getMonth()) {
      currentMonthRevenue += revenue;
      currentMonthProfit += invoiceProfit;
    }
  });

  const monthlySeries = Array.from(monthlyMap.values());
  const pieData = [
    { name: "Revenue", value: currentMonthRevenue },
    { name: "Profit", value: currentMonthProfit },
  ];
  const hasPaidPlan = import.meta.env.DEV || (store?.plan && store.plan !== "FREE");
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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className={hasPaidPlan ? "lg:col-span-2" : "lg:col-span-2 relative"}>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Last 12 Months</CardTitle>
              <p className="text-sm text-muted-foreground">Revenue and profit trend</p>
            </div>
          </CardHeader>
          <CardContent className={hasPaidPlan ? "" : "opacity-40 pointer-events-none"}>
            <ChartContainer
              config={{
                revenue: { label: "Revenue", color: "hsl(var(--primary))" },
                profit: { label: "Profit", color: "hsl(var(--success))" },
              }}
              className="h-[260px] w-full"
            >
              <LineChart data={monthlySeries} margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tickMargin={8} />
                <YAxis tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="var(--color-profit)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
          {!hasPaidPlan && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 rounded-full border border-border bg-background/90 px-4 py-2 text-sm font-medium text-foreground shadow-sm">
                <Lock className="h-4 w-4" />
                Paid plan required
              </div>
            </div>
          )}
        </Card>
        <Card className={hasPaidPlan ? "" : "relative"}>
          <CardHeader>
            <CardTitle>Current Month Split</CardTitle>
            <p className="text-sm text-muted-foreground">Revenue vs profit</p>
          </CardHeader>
          <CardContent className={hasPaidPlan ? "" : "opacity-40 pointer-events-none"}>
            <ChartContainer
              config={{
                revenue: { label: "Revenue", color: "hsl(var(--primary))" },
                profit: { label: "Profit", color: "hsl(var(--success))" },
              }}
              className="h-[260px] w-full"
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                >
                  <Cell fill="var(--color-revenue)" />
                  <Cell fill="var(--color-profit)" />
                </Pie>
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
          {!hasPaidPlan && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 rounded-full border border-border bg-background/90 px-4 py-2 text-sm font-medium text-foreground shadow-sm">
                <Lock className="h-4 w-4" />
                Paid plan required
              </div>
            </div>
          )}
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
