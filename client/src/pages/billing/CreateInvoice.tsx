import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/services/storage";
import { Item, Invoice, invoiceSchema } from "@/shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Trash2, Plus, Calculator, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function CreateInvoice() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: items } = useQuery({ queryKey: ['items'], queryFn: () => db.getItems() });
  const { data: invoices } = useQuery({ queryKey: ['invoices'], queryFn: () => db.getInvoices() });

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [openCombobox, setOpenCombobox] = useState(false);

  // Auto-generate invoice number
  const nextInvoiceNum = `INV-${new Date().getFullYear()}-${(invoices?.length || 0) + 101}`;

  const addItem = (item: Item) => {
    const existing = selectedItems.find(i => i.itemId === item.id);
    if (existing) {
      updateQuantity(existing.id, existing.quantity + 1);
    } else {
      setSelectedItems([...selectedItems, {
        id: crypto.randomUUID(),
        itemId: item.id,
        name: item.name,
        hsn: item.hsn,
        gstPercent: item.gstPercent,
        quantity: 1,
        unitPrice: item.sellingPrice,
        discount: 0,
        total: item.sellingPrice
      }]);
    }
    setOpenCombobox(false);
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty < 1) return;
    setSelectedItems(selectedItems.map(item => {
      if (item.id === id) {
        const total = (item.unitPrice * qty) - item.discount;
        return { ...item, quantity: qty, total };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setSelectedItems(selectedItems.filter(i => i.id !== id));
  };

  const subtotal = selectedItems.reduce((acc, i) => acc + i.total, 0);
  const taxTotal = selectedItems.reduce((acc, i) => acc + (i.total * (i.gstPercent / 100)), 0);
  const grandTotal = subtotal + taxTotal;

  const handleSave = () => {
    if (selectedItems.length === 0) {
      toast({ variant: "destructive", title: "Empty Invoice", description: "Add at least one item." });
      return;
    }

    const invoice: Invoice = {
      id: crypto.randomUUID(),
      invoiceNumber: nextInvoiceNum,
      customerName,
      customerPhone,
      date: new Date().toISOString(),
      items: selectedItems,
      subtotal,
      taxTotal,
      grandTotal,
      status: "PAID",
      type: "INVOICE"
    };

    db.saveInvoice(invoice);
    
    // Reduce stock
    selectedItems.forEach(lineItem => {
      const stockItem = items?.find(i => i.id === lineItem.itemId);
      if (stockItem) {
        db.saveItem({ ...stockItem, quantity: stockItem.quantity - lineItem.quantity });
      }
    });

    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['items'] });
    
    toast({ title: "Invoice Created", description: `Invoice ${nextInvoiceNum} saved successfully.` });
    setLocation("/billing");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Invoice</h1>
          <p className="text-muted-foreground mt-1">Create a sale entry.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" onClick={() => setLocation("/billing")}>Cancel</Button>
           <Button onClick={handleSave} className="gap-2">
             <Save className="h-4 w-4" /> Save Invoice
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Customer Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Customer Name</label>
                <Input placeholder="Walk-in Customer" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input placeholder="Optional" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card className="min-h-[400px] flex flex-col">
             <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Items</CardTitle>
               <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" role="combobox" aria-expanded={openCombobox} className="w-[250px] justify-between">
                    <Plus className="mr-2 h-4 w-4" /> Add Item...
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search item..." />
                    <CommandList>
                      <CommandEmpty>No item found.</CommandEmpty>
                      <CommandGroup>
                        {items?.map((item) => (
                          <CommandItem key={item.id} value={item.name} onSelect={() => addItem(item)}>
                            <Check className={cn("mr-2 h-4 w-4", selectedItems.some(i => i.itemId === item.id) ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col">
                              <span>{item.name}</span>
                              <span className="text-xs text-muted-foreground">Stock: {item.quantity}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Item</TableHead>
                    <TableHead className="w-[15%]">Price</TableHead>
                    <TableHead className="w-[20%]">Qty</TableHead>
                    <TableHead className="w-[20%] text-right">Total</TableHead>
                    <TableHead className="w-[5%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">GST {item.gstPercent}%</div>
                      </TableCell>
                      <TableCell>₹{item.unitPrice}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">₹{item.total}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {selectedItems.length === 0 && (
                     <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground border-none">
                        No items added. Search above to add stock.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Totals Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" /> Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Invoice No.</span>
                <span className="font-medium">{nextInvoiceNum}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="border-t my-4"></div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (GST)</span>
                <span>₹{taxTotal.toFixed(2)}</span>
              </div>
              <div className="border-t my-4"></div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-xl text-primary">₹{grandTotal.toFixed(2)}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" size="lg" onClick={handleSave} disabled={selectedItems.length === 0}>
                Confirm & Print
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
