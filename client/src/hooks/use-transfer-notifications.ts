import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function useTransferNotifications() {
  const { user: store } = useAuth();
  const { toast } = useToast();
  const prevStatuses = useRef(new Map<string, string>());
  const hasInitialized = useRef(false);

  const { data: transfers } = useQuery({
    queryKey: ["transfers"],
    queryFn: () => api.transfers.list(),
    enabled: !!store?.id,
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!store?.id || !transfers) return;

    if (!hasInitialized.current) {
      const initial = new Map<string, string>();
      transfers.forEach((transfer: any) => {
        initial.set(transfer.id, transfer.status);
      });
      prevStatuses.current = initial;
      hasInitialized.current = true;
      return;
    }

    const nextStatuses = new Map(prevStatuses.current);
    transfers.forEach((transfer: any) => {
      const prevStatus = prevStatuses.current.get(transfer.id);
      const status = transfer.status;

      if (!prevStatus && transfer.toStoreId === store.id && status === "PENDING") {
        toast({
          title: "New Transfer Request",
          description: `From ${transfer.fromStore?.name || transfer.fromStoreId}`,
        });
      }

      if (prevStatus && prevStatus !== status) {
        if (transfer.fromStoreId === store.id && (status === "ACCEPTED" || status === "REJECTED")) {
          toast({
            title: status === "ACCEPTED" ? "Transfer Accepted" : "Transfer Rejected",
            description: `By ${transfer.toStore?.name || transfer.toStoreId}`,
          });
        }

        if (transfer.toStoreId === store.id && status === "RETURNED") {
          toast({
            title: "Return Accepted",
            description: `Sender accepted the return request.`,
          });
        }
      }

      nextStatuses.set(transfer.id, status);
    });

    prevStatuses.current = nextStatuses;
  }, [store?.id, transfers, toast]);
}
