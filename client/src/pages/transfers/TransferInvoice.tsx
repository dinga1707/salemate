import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { format } from "date-fns";
import { Link, useParams } from "wouter";

export default function TransferInvoice() {
  const params = useParams();
  const transferId = params?.id;

  const { data: invoiceData, isLoading, error } = useQuery({ 
    queryKey: ['transfer-invoice', transferId], 
    queryFn: () => api.transfers.getInvoice(transferId!),
    enabled: !!transferId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !invoiceData) {
    return (
      <div className="space-y-6 px-4 sm:px-6">
        <Link href="/transfers">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Transfers
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Invoice not found or not yet generated.
          </CardContent>
        </Card>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 px-4 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Link href="/transfers">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Transfers
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-2xl">TRANSFER INVOICE</CardTitle>
              <p className="text-muted-foreground mt-1">{invoiceData.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <p className="font-medium">Date</p>
              <p className="text-muted-foreground">{format(new Date(invoiceData.date), "PPP")}</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">FROM (Sender)</h3>
              <div className="space-y-1">
                <p className="font-medium text-lg">{invoiceData.fromStore?.name}</p>
                <p className="text-sm text-muted-foreground">{invoiceData.fromStore?.address}</p>
                <p className="text-sm text-muted-foreground">Phone: {invoiceData.fromStore?.phone}</p>
                {invoiceData.fromStore?.gstin && (
                  <p className="text-sm text-muted-foreground">GSTIN: {invoiceData.fromStore?.gstin}</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">TO (Receiver)</h3>
              <div className="space-y-1">
                <p className="font-medium text-lg">{invoiceData.toStore?.name}</p>
                <p className="text-sm text-muted-foreground">{invoiceData.toStore?.address}</p>
                <p className="text-sm text-muted-foreground">Phone: {invoiceData.toStore?.phone}</p>
                {invoiceData.toStore?.gstin && (
                  <p className="text-sm text-muted-foreground">GSTIN: {invoiceData.toStore?.gstin}</p>
                )}
              </div>
            </div>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">#</th>
                  <th className="text-left p-3 font-medium">Item</th>
                  <th className="text-left p-3 font-medium">HSN</th>
                  <th className="text-right p-3 font-medium">Qty</th>
                  <th className="text-right p-3 font-medium">Rate</th>
                  <th className="text-right p-3 font-medium">Disc</th>
                  <th className="text-right p-3 font-medium">GST %</th>
                  <th className="text-right p-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.items?.map((item: any, idx: number) => (
                  <tr key={idx} className="border-t">
                    <td className="p-3">{idx + 1}</td>
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3 text-muted-foreground">{item.hsn || '-'}</td>
                    <td className="p-3 text-right">{item.quantity}</td>
                    <td className="p-3 text-right">₹{Number(item.unitPrice).toFixed(2)}</td>
                    <td className="p-3 text-right">₹{Number(item.discount || 0).toFixed(2)}</td>
                    <td className="p-3 text-right">{item.gstPercent || 0}%</td>
                    <td className="p-3 text-right font-medium">₹{Number(item.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-full sm:w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{Number(invoiceData.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>₹{Number(invoiceData.taxTotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Grand Total</span>
                <span className="text-primary">₹{Number(invoiceData.grandTotal).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-6 text-center text-sm text-muted-foreground">
            <p>This is a computer-generated invoice for inter-store stock transfer.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
