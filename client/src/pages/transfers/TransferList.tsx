import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Check, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";

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

  const handleAccept = (transfer: any) => {
    updateTransferMutation.mutate({ id: transfer.id, status: 'ACCEPTED' });
  };

  const handleReject = (transfer: any) => {
    updateTransferMutation.mutate({ id: transfer.id, status: 'REJECTED' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
        <TabsList>
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
               <TransferCard key={t.id} transfer={t} />
           ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TransferCard({ transfer, onAccept, onReject, isIncoming }: { 
  transfer: any, 
  onAccept?: () => void, 
  onReject?: () => void, 
  isIncoming?: boolean 
}) {
  return (
    <Card data-testid={`card-transfer-${transfer.id}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              {isIncoming ? `From: ${transfer.fromStoreId}` : `To: ${transfer.toStoreId}`}
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
              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={onReject} data-testid="button-reject-transfer">
                <X className="mr-1 h-4 w-4" /> Reject
              </Button>
              <Button size="sm" onClick={onAccept} data-testid="button-accept-transfer">
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
            {transfer.items?.map((item: any, idx: number) => (
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
