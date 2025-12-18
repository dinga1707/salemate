import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/services/storage";
import { Item, itemSchema } from "@/shared/schema";
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
import { Plus, Search, QrCode } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function InventoryList() {
  const { data: items } = useQuery({ queryKey: ['items'], queryFn: () => db.getItems() });
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredItems = items?.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.brand?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage stock, prices, and brands.</p>
        </div>
        <AddItemSheet open={isOpen} onOpenChange={setIsOpen} />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search items..." 
            className="pl-8 bg-background" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon">
            <QrCode className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Cost Price</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.brand || "-"}</TableCell>
                <TableCell>{item.quantity} {item.unit}</TableCell>
                <TableCell>₹{item.costPrice}</TableCell>
                <TableCell>₹{item.sellingPrice}</TableCell>
                <TableCell>
                  {item.quantity < 5 ? (
                    <Badge variant="destructive">Low Stock</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">In Stock</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filteredItems?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
  
  const form = useForm<Item>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      id: crypto.randomUUID(),
      name: "",
      brand: "",
      hsn: "",
      unit: "pcs",
      gstPercent: 0,
      costPrice: 0,
      sellingPrice: 0,
      margin: 0,
      quantity: 0,
      updatedAt: new Date().toISOString(),
    }
  });

  const onSubmit = (data: Item) => {
    db.saveItem(data);
    queryClient.invalidateQueries({ queryKey: ['items'] });
    toast({ title: "Item Added", description: `${data.name} has been added to inventory.` });
    onOpenChange(false);
    form.reset({ ...data, id: crypto.randomUUID(), name: "" }); // Reset for next add
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button>
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
                    <Input placeholder="e.g. Samsung Galaxy M32" {...field} />
                  </FormControl>
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
                        <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
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
                    <FormControl>
                        <Input placeholder="pcs" {...field} />
                    </FormControl>
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
                        <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
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
                        <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
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
                        <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit">Save Item</Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
