import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/services/storage";
import { TransitStatus, TransferRequest, transferRequestSchema } from "@/shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Check, X, Truck, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TransferList() {
  const { data: transfers } = useQuery({ queryKey: ['transfers'], queryFn: () => db.getTransfers() });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAccept = (transfer: TransferRequest) => {
    // In a real app, this would verify stock availability if outgoing, or add stock if incoming.
    // For this prototype, we just update status.
    const updated = { ...transfer, status: TransitStatus.ACCEPTED, updatedAt: new Date().toISOString() };
    db.saveTransfer(updated);
    
    // If accepting incoming, add to stock
    if (transfer.toStoreId === db.getStoreProfile().id) {
       // Logic to add items to inventory would go here
       toast({ title: "Stock Received", description: "Items added to your inventory." });
    } else {
       toast({ title: "Transfer Accepted", description: "Status updated." });
    }
    
    queryClient.invalidateQueries({ queryKey: ['transfers'] });
  };

  const handleReject = (transfer: TransferRequest) => {
    const updated = { ...transfer, status: TransitStatus.REJECTED, updatedAt: new Date().toISOString() };
    db.saveTransfer(updated);
    queryClient.invalidateQueries({ queryKey: ['transfers'] });
    toast({ title: "Transfer Rejected", description: "Items returned to source." });
  };

  const simulateIncoming = () => {
    const newTransfer: TransferRequest = {
      id: crypto.randomUUID(),
      fromStoreId: "store-external-1",
      toStoreId: db.getStoreProfile().id,
      items: [{ itemId: "ext-1", name: "OnePlus 12R", quantity: 5 }],
      status: TransitStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.saveTransfer(newTransfer);
    queryClient.invalidateQueries({ queryKey: ['transfers'] });
    toast({ title: "Incoming Request", description: "New stock transfer received from HQ." });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Transfers</h1>
          <p className="text-muted-foreground mt-1">Move inventory between stores.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={simulateIncoming}>
                <Download className="mr-2 h-4 w-4" /> Simulate Incoming
            </Button>
            <CreateTransferDialog />
        </div>
      </div>

      <Tabs defaultValue="incoming" className="w-full">
        <TabsList>
          <TabsTrigger value="incoming">Incoming (Received)</TabsTrigger>
          <TabsTrigger value="outgoing">Outgoing (Sent)</TabsTrigger>
        </TabsList>
        <TabsContent value="incoming" className="mt-4 space-y-4">
           {transfers?.filter(t => t.toStoreId === db.getStoreProfile().id).length === 0 && (
               <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/10">
                   No incoming transfers.
               </div>
           )}
           {transfers?.filter(t => t.toStoreId === db.getStoreProfile().id).map(t => (
               <TransferCard key={t.id} transfer={t} onAccept={() => handleAccept(t)} onReject={() => handleReject(t)} isIncoming />
           ))}
        </TabsContent>
        <TabsContent value="outgoing" className="mt-4 space-y-4">
            {transfers?.filter(t => t.fromStoreId === db.getStoreProfile().id).length === 0 && (
               <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/10">
                   No outgoing transfers.
               </div>
           )}
           {transfers?.filter(t => t.fromStoreId === db.getStoreProfile().id).map(t => (
               <TransferCard key={t.id} transfer={t} />
           ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TransferCard({ transfer, onAccept, onReject, isIncoming }: { transfer: TransferRequest, onAccept?: () => void, onReject?: () => void, isIncoming?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              {isIncoming ? "From: Warehouse HQ" : "To: Branch Store 2"}
              <Badge variant={
                transfer.status === 'ACCEPTED' ? 'default' : 
                transfer.status === 'REJECTED' ? 'destructive' : 'secondary'
              } className={transfer.status === 'ACCEPTED' ? 'bg-success hover:bg-success/90' : ''}>
                {transfer.status}
              </Badge>
            </CardTitle>
            <CardDescription>{format(new Date(transfer.createdAt), "PPP p")}</CardDescription>
          </div>
          {isIncoming && transfer.status === 'PENDING' && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={onReject}>
                <X className="mr-1 h-4 w-4" /> Reject
              </Button>
              <Button size="sm" onClick={onAccept}>
                <Check className="mr-1 h-4 w-4" /> Accept
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/30 p-3 rounded-md text-sm">
          <div className="font-medium mb-2">Items in transit:</div>
          <ul className="space-y-1">
            {transfer.items.map((item, idx) => (
              <li key={idx} className="flex justify-between">
                <span>{item.name}</span>
                <span className="font-mono">x{item.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

function CreateTransferDialog() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newTransfer: TransferRequest = {
            id: crypto.randomUUID(),
            fromStoreId: db.getStoreProfile().id,
            toStoreId: "store-branch-2",
            items: [{ itemId: "1", name: "Samsung Galaxy S24", quantity: 2 }], // Hardcoded for prototype
            status: TransitStatus.PENDING,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        db.saveTransfer(newTransfer);
        queryClient.invalidateQueries({ queryKey: ['transfers'] });
        toast({ title: "Transfer Initiated", description: "Request sent to Branch Store 2." });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <ArrowRightLeft className="mr-2 h-4 w-4" /> New Transfer
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Stock Transfer</DialogTitle>
                    <DialogDescription>Move items to another branch.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Target Store</Label>
                        <Select defaultValue="store-branch-2">
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="store-branch-2">Branch Store 2 (Indiranagar)</SelectItem>
                                <SelectItem value="store-branch-3">Branch Store 3 (Koramangala)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Items (Demo: Hardcoded)</Label>
                        <div className="p-3 border rounded-md text-sm text-muted-foreground bg-muted/20">
                            1. Samsung Galaxy S24 (Qty: 2)
                        </div>
                         <p className="text-xs text-muted-foreground">In full version, this would be an item selector.</p>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Send Stock</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
