import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { Link, useLocation } from "wouter";
import { checkEntitlement } from "@/services/entitlements";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const isWithinCurrentFY = (date: Date) => {
  const now = new Date();
  const currentFYStart = now.getMonth() >= 3 
    ? new Date(now.getFullYear(), 3, 1) 
    : new Date(now.getFullYear() - 1, 3, 1);
  const currentFYEnd = now.getMonth() >= 3 
    ? new Date(now.getFullYear() + 1, 2, 31) 
    : new Date(now.getFullYear(), 2, 31);
  return date >= currentFYStart && date <= currentFYEnd;
};

export default function InvoiceList() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: invoices } = useQuery({ 
    queryKey: ['invoices'], 
    queryFn: () => api.invoices.list() 
  });
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.invoices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({ title: "Invoice Deleted", description: "The invoice has been deleted and stock restored." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  });

  const handleCreateClick = async (e: React.MouseEvent) => {
    try {
      const entitlement = await checkEntitlement("create_invoice");
      if (!entitlement.allowed) {
        e.preventDefault();
        toast({
          variant: "destructive",
          title: "Plan Limit Reached",
          description: entitlement.reason,
        });
      }
    } catch (error) {
      console.error("Error checking entitlement:", error);
    }
  };

  const handleEdit = (id: string) => {
    setLocation(`/billing/edit/${id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground mt-1">Manage invoices and estimates.</p>
        </div>
        <Link href="/billing/new" onClick={handleCreateClick}>
          <Button data-testid="button-new-invoice">
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
              <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                <TableCell>{format(new Date(inv.date), "dd MMM yyyy")}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{inv.customerName || "Cash Sale"}</span>
                    <span className="text-xs text-muted-foreground">{inv.customerPhone}</span>
                  </div>
                </TableCell>
                <TableCell>{inv.items?.length || 0} items</TableCell>
                <TableCell className="font-bold">₹{Number(inv.grandTotal).toLocaleString('en-IN')}</TableCell>
                <TableCell>
                  <Badge variant={inv.status === 'PAID' ? 'default' : 'outline'} className={inv.status === 'PAID' ? 'bg-success hover:bg-success/90' : ''}>
                    {inv.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-actions-${inv.id}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(inv.id)} disabled={!isWithinCurrentFY(new Date(inv.date))}>
                        <Pencil className="mr-2 h-4 w-4" />
                        {isWithinCurrentFY(new Date(inv.date)) ? "Edit" : "Edit (Locked - Previous FY)"}
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={!isWithinCurrentFY(new Date(inv.date))} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            {isWithinCurrentFY(new Date(inv.date)) ? "Delete" : "Delete (Locked - Previous FY)"}
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete invoice {inv.invoiceNumber} and restore stock quantities. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(inv.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete Invoice
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
