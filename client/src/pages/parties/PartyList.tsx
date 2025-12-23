import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

const partyFormSchema = z.object({
  name: z.string().min(1, "Party name is required"),
  gstin: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  type: z.enum(["CUSTOMER", "SUPPLIER", "BOTH"]).default("SUPPLIER"),
  toPay: z.coerce.number().min(0).default(0),
  toReceive: z.coerce.number().min(0).default(0),
});

type PartyFormData = z.infer<typeof partyFormSchema>;

interface Party {
  id: string;
  name: string;
  gstin?: string | null;
  phone?: string | null;
  address?: string | null;
  type?: "CUSTOMER" | "SUPPLIER" | "BOTH" | null;
  toPay?: string | number | null;
  toReceive?: string | number | null;
}

const partyTypeLabel = (type?: Party["type"]) => {
  if (type === "CUSTOMER") return "Customer";
  if (type === "BOTH") return "Customer & Supplier";
  return "Supplier";
};

export default function PartyList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: parties } = useQuery<Party[]>({
    queryKey: ["parties"],
    queryFn: () => api.parties.list(),
  });

  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editParty, setEditParty] = useState<Party | null>(null);
  const [deleteParty, setDeleteParty] = useState<Party | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: PartyFormData) => api.parties.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parties"] });
      toast({ title: "Party Added", description: "Party has been added successfully." });
      setIsOpen(false);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: PartyFormData) => api.parties.update(editParty!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parties"] });
      toast({ title: "Party Updated", description: "Party has been updated successfully." });
      setEditParty(null);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.parties.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parties"] });
      toast({ title: "Party Deleted", description: "Party has been removed." });
      setDeleteParty(null);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const createForm = useForm<PartyFormData>({
    resolver: zodResolver(partyFormSchema),
    defaultValues: {
      name: "",
      gstin: "",
      phone: "",
      address: "",
      type: "SUPPLIER",
      toPay: 0,
      toReceive: 0,
    },
  });

  const editForm = useForm<PartyFormData>({
    resolver: zodResolver(partyFormSchema),
    defaultValues: {
      name: "",
      gstin: "",
      phone: "",
      address: "",
      type: "SUPPLIER",
      toPay: 0,
      toReceive: 0,
    },
  });

  useEffect(() => {
    if (!editParty) return;
    editForm.reset({
      name: editParty.name || "",
      gstin: editParty.gstin || "",
      phone: editParty.phone || "",
      address: editParty.address || "",
      type: editParty.type || "SUPPLIER",
      toPay: Number(editParty.toPay || 0),
      toReceive: Number(editParty.toReceive || 0),
    });
  }, [editParty, editForm]);

  const filteredParties = parties?.filter((party) => {
    const query = search.toLowerCase();
    return (
      party.name.toLowerCase().includes(query) ||
      party.phone?.toLowerCase().includes(query) ||
      party.gstin?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 px-4 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parties</h1>
          <p className="text-muted-foreground mt-1">Manage customers and suppliers.</p>
        </div>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button data-testid="button-add-party">
              <Plus className="mr-2 h-4 w-4" /> Add Party
            </Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto w-full sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>Add Party</SheetTitle>
              <SheetDescription>Create a customer or supplier profile.</SheetDescription>
            </SheetHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4 mt-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Party Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Mahesh Traders" {...field} data-testid="input-party-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile</FormLabel>
                        <FormControl>
                          <Input placeholder="9876543210" {...field} data-testid="input-party-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="gstin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GSTIN (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="22AAAAA0000A1Z5" {...field} data-testid="input-party-gstin" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={createForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="Street, city, state" {...field} data-testid="input-party-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer / Supplier</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-party-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CUSTOMER">Customer</SelectItem>
                          <SelectItem value="SUPPLIER">Supplier</SelectItem>
                          <SelectItem value="BOTH">Customer & Supplier</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="toPay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To Pay (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" {...field} data-testid="input-party-to-pay" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="toReceive"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To Receive (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" {...field} data-testid="input-party-to-receive" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="pt-4 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Saving..." : "Save Party"}
                  </Button>
                </div>
              </form>
            </Form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search parties..."
            className="pl-8 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-party"
          />
        </div>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Party Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">To Pay</TableHead>
              <TableHead className="text-right">To Receive</TableHead>
              <TableHead className="w-[70px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredParties?.map((party) => (
              <TableRow key={party.id} data-testid={`row-party-${party.id}`}>
                <TableCell className="font-medium">{party.name}</TableCell>
                <TableCell>{partyTypeLabel(party.type)}</TableCell>
                <TableCell>{party.phone || "-"}</TableCell>
                <TableCell>{party.gstin || "-"}</TableCell>
                <TableCell className="min-w-[220px]">{party.address || "-"}</TableCell>
                <TableCell className="text-right">₹{Number(party.toPay || 0).toFixed(2)}</TableCell>
                <TableCell className="text-right">₹{Number(party.toReceive || 0).toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-actions-${party.id}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditParty(party)} data-testid={`button-edit-${party.id}`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteParty(party)}
                        className="text-destructive"
                        data-testid={`button-delete-${party.id}`}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filteredParties?.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No parties found. Add your first customer or supplier.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!editParty} onOpenChange={() => setEditParty(null)}>
        <SheetContent className="overflow-y-auto w-full sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Edit Party</SheetTitle>
            <SheetDescription>Update party details and balances.</SheetDescription>
          </SheetHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4 mt-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Party Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Mahesh Traders" {...field} data-testid="input-edit-party-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile</FormLabel>
                      <FormControl>
                        <Input placeholder="9876543210" {...field} data-testid="input-edit-party-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="gstin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GSTIN (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="22AAAAA0000A1Z5" {...field} data-testid="input-edit-party-gstin" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Street, city, state" {...field} data-testid="input-edit-party-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer / Supplier</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-party-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CUSTOMER">Customer</SelectItem>
                        <SelectItem value="SUPPLIER">Supplier</SelectItem>
                        <SelectItem value="BOTH">Customer & Supplier</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="toPay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Pay (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} data-testid="input-edit-party-to-pay" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="toReceive"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Receive (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} data-testid="input-edit-party-to-receive" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditParty(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Update Party"}
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteParty} onOpenChange={() => setDeleteParty(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Party</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteParty?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteParty && deleteMutation.mutate(deleteParty.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-party"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
