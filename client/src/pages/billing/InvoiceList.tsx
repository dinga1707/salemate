import { useQuery } from "@tanstack/react-query";
import { db } from "@/services/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, CheckCircle, Clock } from "lucide-react";
import { Link } from "wouter";
import { checkEntitlement } from "@/services/entitlements";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function InvoiceList() {
  const { data: invoices } = useQuery({ queryKey: ['invoices'], queryFn: () => db.getInvoices() });
  const { toast } = useToast();

  const handleCreateClick = (e: React.MouseEvent) => {
    const entitlement = checkEntitlement("create_invoice");
    if (!entitlement.allowed) {
      e.preventDefault();
      toast({
        variant: "destructive",
        title: "Plan Limit Reached",
        description: entitlement.reason,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground mt-1">Manage invoices and estimates.</p>
        </div>
        <Link href="/billing/new" onClick={handleCreateClick}>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Invoice
          </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices?.slice().reverse().map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                <TableCell>{format(new Date(inv.date), "dd MMM yyyy")}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{inv.customerName || "Cash Sale"}</span>
                    <span className="text-xs text-muted-foreground">{inv.customerPhone}</span>
                  </div>
                </TableCell>
                <TableCell>{inv.items.length} items</TableCell>
                <TableCell className="font-bold">₹{inv.grandTotal.toLocaleString('en-IN')}</TableCell>
                <TableCell>
                  <Badge variant={inv.status === 'PAID' ? 'default' : 'outline'} className={inv.status === 'PAID' ? 'bg-success hover:bg-success/90' : ''}>
                    {inv.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                   <Button variant="ghost" size="sm">Print</Button>
                </TableCell>
              </TableRow>
            ))}
            {(!invoices || invoices.length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 opacity-20" />
                    <p>No invoices created yet.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
