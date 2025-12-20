import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Search, QrCode, Camera } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";

const UNIT_OPTIONS = [
  { value: "nos", label: "Nos (Numbers)" },
  { value: "pcs", label: "Pcs (Pieces)" },
  { value: "kg", label: "Kg (Kilograms)" },
  { value: "gm", label: "Gm (Grams)" },
  { value: "ltr", label: "Ltr (Litres)" },
  { value: "ml", label: "ML (Millilitres)" },
  { value: "box", label: "Box" },
  { value: "pack", label: "Pack" },
  { value: "dozen", label: "Dozen" },
  { value: "set", label: "Set" },
  { value: "mtr", label: "Mtr (Metres)" },
  { value: "ft", label: "Ft (Feet)" },
];

const itemFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  brand: z.string().optional(),
  hsn: z.string().optional(),
  unit: z.string().default("nos"),
  gstPercent: z.coerce.number().min(0).max(100).default(0),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  margin: z.coerce.number().min(0).default(0),
  quantity: z.coerce.number().int().min(0).default(0),
  location: z.string().optional(),
  partyId: z.string().optional(),
});

type ItemFormData = z.infer<typeof itemFormSchema>;

interface Party {
  id: string;
  name: string;
  gstin?: string;
  phone?: string;
  address?: string;
}

interface Item {
  id: string;
  name: string;
  brand?: string | null;
  partyId?: string | null;
  unit: string;
  quantity: number;
  costPrice: string;
  sellingPrice: string;
}

export default function InventoryList() {
  const { data: items } = useQuery<Item[]>({ 
    queryKey: ['items'], 
    queryFn: () => api.items.list() 
  });
  const { data: parties } = useQuery<Party[]>({ 
    queryKey: ['parties'], 
    queryFn: () => api.parties.list() 
  });
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const getPartyName = (partyId?: string | null) => {
    if (!partyId) return "-";
    const party = parties?.find(p => p.id === partyId);
    return party?.name || "-";
  };

  const filteredItems = items?.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.brand?.toLowerCase().includes(search.toLowerCase()) ||
    getPartyName(i.partyId).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage stock, prices, and brands.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventory/scan">
            <Button variant="outline" data-testid="button-scan-bill">
              <Camera className="mr-2 h-4 w-4" /> Scan Bill
            </Button>
          </Link>
          <AddItemSheet open={isOpen} onOpenChange={setIsOpen} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search items..." 
            className="pl-8 bg-background" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>
        <Button variant="outline" size="icon" data-testid="button-qr-scan">
            <QrCode className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Party (Supplier)</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Cost Price</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems?.map((item) => (
              <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell data-testid={`text-party-${item.id}`}>{getPartyName(item.partyId)}</TableCell>
                <TableCell>{item.brand || "-"}</TableCell>
                <TableCell>{item.quantity} {item.unit}</TableCell>
                <TableCell>₹{Number(item.costPrice).toFixed(2)}</TableCell>
                <TableCell>₹{Number(item.sellingPrice).toFixed(2)}</TableCell>
                <TableCell>
                  {Number(item.quantity) < 5 ? (
                    <Badge variant="destructive">Low Stock</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">In Stock</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filteredItems?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No items found. Add some stock!
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AddItemSheet({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [partySearch, setPartySearch] = useState("");
  const [showNewParty, setShowNewParty] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  
  const { data: parties } = useQuery<Party[]>({ 
    queryKey: ['parties'], 
    queryFn: () => api.parties.list() 
  });

  const createPartyMutation = useMutation({
    mutationFn: (data: { name: string }) => api.parties.create(data),
    onSuccess: (newParty) => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      form.setValue('partyId', newParty.id);
      setShowNewParty(false);
      setNewPartyName("");
      toast({ title: "Party Added", description: "New supplier has been added." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to create party" });
    },
  });

  const filteredParties = parties?.filter(p => 
    p.name.toLowerCase().includes(partySearch.toLowerCase())
  ) || [];
  
  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: "",
      brand: "",
      hsn: "",
      unit: "nos",
      gstPercent: 0,
      costPrice: 0,
      sellingPrice: 0,
      margin: 0,
      quantity: 0,
      location: "",
      partyId: "",
    }
  });

  const createItemMutation = useMutation({
    mutationFn: (data: ItemFormData) => api.items.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      toast({ title: "Item Added", description: "Item has been added to inventory." });
      onOpenChange(false);
      form.reset();
      setPartySearch("");
      setShowNewParty(false);
      setNewPartyName("");
    },
    onError: (error: Error) => {
      toast({ 
        variant: "destructive",
        title: "Error", 
        description: error.message || "Failed to create item" 
      });
    }
  });

  const onSubmit = (data: ItemFormData) => {
    createItemMutation.mutate(data);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button data-testid="button-add-item">
          <Plus className="mr-2 h-4 w-4" /> Add Item
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Add New Stock</SheetTitle>
          <SheetDescription>
            Add a new item to your inventory manually.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Samsung Galaxy M32" {...field} data-testid="input-item-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="partyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Party (Supplier)</FormLabel>
                  {showNewParty ? (
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Enter new party name" 
                        value={newPartyName}
                        onChange={(e) => setNewPartyName(e.target.value)}
                        data-testid="input-new-party"
                      />
                      <Button 
                        type="button" 
                        size="sm"
                        onClick={() => createPartyMutation.mutate({ name: newPartyName })}
                        disabled={!newPartyName.trim() || createPartyMutation.isPending}
                      >
                        Add
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewParty(false)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-party">
                            <SelectValue placeholder="Select party (supplier)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <div className="p-2">
                            <Input 
                              placeholder="Search party..." 
                              value={partySearch}
                              onChange={(e) => setPartySearch(e.target.value)}
                              className="mb-2"
                            />
                          </div>
                          {filteredParties.length === 0 && partySearch && (
                            <div className="p-2 text-sm text-muted-foreground">No parties found</div>
                          )}
                          {filteredParties.map((party) => (
                            <SelectItem key={party.id} value={party.id}>
                              {party.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setShowNewParty(true)}>
                        + Add new party
                      </Button>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl>
                        <Input placeholder="Samsung" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="hsn"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>HSN Code</FormLabel>
                    <FormControl>
                        <Input placeholder="8517" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
                 <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} data-testid="input-quantity" />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-unit">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UNIT_OPTIONS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="gstPercent"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>GST %</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                 <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Cost Price (₹)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-cost-price" />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="sellingPrice"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Selling Price (₹)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-selling-price" />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={createItemMutation.isPending} data-testid="button-save-item">
                  {createItemMutation.isPending ? "Saving..." : "Save Item"}
                </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
