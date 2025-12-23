import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Check, X, Plus, RotateCcw, FileText, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInHours, differenceInMinutes } from "date-fns";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";

export default function TransferList() {
  const { data: transfers } = useQuery({ 
    queryKey: ['transfers'], 
    queryFn: () => api.transfers.list() 
  });
  const { user: store } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateTransferMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => 
      api.transfers.update(id, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      if (variables.status === 'ACCEPTED') {
        toast({ title: "Transfer Accepted", description: "Items added to your inventory." });
      } else {
        toast({ title: "Transfer Rejected", description: "Items returned to source." });
      }
    },
    onError: (error: Error) => {
      toast({ 
        variant: "destructive",
        title: "Error", 
        description: error.message || "Failed to update transfer" 
      });
    }
  });

  const revertMutation = useMutation({
    mutationFn: (id: string) => api.transfers.revert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({ title: "Transfer Reverted", description: "Items removed from your inventory. Waiting for sender to accept return." });
    },
    onError: (error: Error) => {
      toast({ 
        variant: "destructive",
        title: "Error", 
        description: error.message || "Failed to revert transfer" 
      });
    }
  });

  const returnMutation = useMutation({
    mutationFn: ({ id, accept }: { id: string, accept: boolean }) => 
      api.transfers.return(id, accept),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      if (variables.accept) {
        toast({ title: "Return Accepted", description: "Items added back to your inventory." });
      } else {
        toast({ title: "Return Rejected", description: "Items remain with the receiver." });
      }
    },
    onError: (error: Error) => {
      toast({ 
        variant: "destructive",
        title: "Error", 
        description: error.message || "Failed to process return" 
      });
    }
  });

  const handleAccept = (transfer: any) => {
    updateTransferMutation.mutate({ id: transfer.id, status: 'ACCEPTED' });
  };

  const handleReject = (transfer: any) => {
    updateTransferMutation.mutate({ id: transfer.id, status: 'REJECTED' });
  };

  const handleRevert = (transfer: any) => {
    revertMutation.mutate(transfer.id);
  };

  const handleReturn = (transfer: any, accept: boolean) => {
    returnMutation.mutate({ id: transfer.id, accept });
  };

  return (
    <div className="space-y-6 px-4 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Transfers</h1>
          <p className="text-muted-foreground mt-1">Move inventory between stores.</p>
        </div>
        <Link href="/transfers/new">
          <Button data-testid="button-new-transfer">
            <Plus className="mr-2 h-4 w-4" /> New Transfer
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="incoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="incoming">Incoming (Received)</TabsTrigger>
          <TabsTrigger value="outgoing">Outgoing (Sent)</TabsTrigger>
        </TabsList>
        <TabsContent value="incoming" className="mt-4 space-y-4">
           {transfers?.filter((t: any) => t.toStoreId === store?.id).length === 0 && (
               <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/10">
                   No incoming transfers.
               </div>
           )}
           {transfers?.filter((t: any) => t.toStoreId === store?.id).map((t: any) => (
               <TransferCard 
                 key={t.id} 
                 transfer={t} 
                 onAccept={() => handleAccept(t)} 
                 onReject={() => handleReject(t)} 
                 onRevert={() => handleRevert(t)}
                 isIncoming 
               />
           ))}
        </TabsContent>
        <TabsContent value="outgoing" className="mt-4 space-y-4">
            {transfers?.filter((t: any) => t.fromStoreId === store?.id).length === 0 && (
               <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/10">
                   No outgoing transfers.
               </div>
           )}
           {transfers?.filter((t: any) => t.fromStoreId === store?.id).map((t: any) => (
               <TransferCard 
                 key={t.id} 
                 transfer={t} 
                 onAcceptReturn={() => handleReturn(t, true)}
                 onRejectReturn={() => handleReturn(t, false)}
               />
           ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TransferCard({ transfer, onAccept, onReject, onRevert, onAcceptReturn, onRejectReturn, isIncoming }: { 
  transfer: any, 
  onAccept?: () => void, 
  onReject?: () => void, 
  onRevert?: () => void,
  onAcceptReturn?: () => void,
  onRejectReturn?: () => void,
  isIncoming?: boolean 
}) {
  const [remainingTime, setRemainingTime] = useState<string | null>(null);
  const [canRevert, setCanRevert] = useState(false);

  useEffect(() => {
    if (transfer.status === 'ACCEPTED' && transfer.acceptedAt && isIncoming) {
      const updateTime = () => {
        const acceptedAt = new Date(transfer.acceptedAt);
        const now = new Date();
        const hoursDiff = differenceInHours(now, acceptedAt);
        const minutesDiff = differenceInMinutes(now, acceptedAt) % 60;
        
        if (hoursDiff >= 24) {
          setRemainingTime(null);
          setCanRevert(false);
        } else {
          const hoursLeft = 23 - hoursDiff;
          const minutesLeft = 60 - minutesDiff;
          setRemainingTime(`${hoursLeft}h ${minutesLeft}m left to revert`);
          setCanRevert(true);
        }
      };
      
      updateTime();
      const interval = setInterval(updateTime, 60000);
      return () => clearInterval(interval);
    }
  }, [transfer.status, transfer.acceptedAt, isIncoming]);

  const getStatusBadge = () => {
    const statusColors: Record<string, string> = {
      'ACCEPTED': 'bg-green-500 hover:bg-green-600',
      'REJECTED': 'bg-red-500 hover:bg-red-600',
      'REVERTED': 'bg-amber-500 hover:bg-amber-600',
      'RETURNED': 'bg-blue-500 hover:bg-blue-600',
      'PENDING': 'bg-gray-500 hover:bg-gray-600',
    };
    
    return (
      <Badge className={statusColors[transfer.status] || 'bg-gray-500'}>
        {transfer.status}
      </Badge>
    );
  };

  const storeName = isIncoming 
    ? transfer.fromStore?.name || transfer.fromStoreId 
    : transfer.toStore?.name || transfer.toStoreId;

  return (
    <Card data-testid={`card-transfer-${transfer.id}`}>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              {isIncoming ? `From: ${storeName}` : `To: ${storeName}`}
              {getStatusBadge()}
            </CardTitle>
            <CardDescription>
              {format(new Date(transfer.createdAt), "PPP p")}
              {remainingTime && (
                <span className="ml-2 text-amber-600 font-medium inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {remainingTime}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {isIncoming && transfer.status === 'PENDING' && (
              <>
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={onReject} data-testid="button-reject-transfer">
                  <X className="mr-1 h-4 w-4" /> Reject
                </Button>
                <Button size="sm" onClick={onAccept} data-testid="button-accept-transfer">
                  <Check className="mr-1 h-4 w-4" /> Accept
                </Button>
              </>
            )}
            {isIncoming && transfer.status === 'ACCEPTED' && canRevert && (
              <Button size="sm" variant="outline" onClick={onRevert} data-testid="button-revert-transfer">
                <RotateCcw className="mr-1 h-4 w-4" /> Revert
              </Button>
            )}
            {!isIncoming && transfer.status === 'REVERTED' && (
              <>
                <Button size="sm" variant="outline" onClick={onRejectReturn} data-testid="button-reject-return">
                  <X className="mr-1 h-4 w-4" /> Keep with Receiver
                </Button>
                <Button size="sm" onClick={onAcceptReturn} data-testid="button-accept-return">
                  <Check className="mr-1 h-4 w-4" /> Accept Return
                </Button>
              </>
            )}
            {transfer.invoiceId && (
              <Link href={`/transfers/${transfer.id}/invoice`}>
                <Button size="sm" variant="ghost" data-testid="button-view-invoice">
                  <FileText className="mr-1 h-4 w-4" /> Invoice
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/30 p-3 rounded-md text-sm">
          <div className="font-medium mb-2">Items in transit:</div>
          <ul className="space-y-2">
            {transfer.items?.map((item: any, idx: number) => (
              <li key={idx} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground ml-2">
                    {item.quantity} {item.unit || 'pcs'}
                  </span>
                  {item.hsn && (
                    <span className="text-xs text-muted-foreground ml-2">HSN: {item.hsn}</span>
                  )}
                </div>
                <span className="font-mono text-primary">
                  ₹{(Number(item.total || item.unitPrice || item.sellingPrice || 0) * (item.total ? 1 : item.quantity)).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t mt-3 pt-2 flex justify-between font-medium">
            <span>Total Value:</span>
            <span className="text-primary">
              ₹{transfer.items?.reduce((sum: number, item: any) => 
                sum + Number(item.total || (Number(item.unitPrice || item.sellingPrice || 0) * item.quantity)), 0
              ).toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
