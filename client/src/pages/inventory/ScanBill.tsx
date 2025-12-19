import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Upload, Camera, Loader2, Check, X, Trash2, ArrowLeft, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ScannedItem {
  name: string;
  brand?: string;
  hsn?: string;
  quantity: number;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  gstPercent: number;
  selected: boolean;
}

interface ScanResult {
  items: ScannedItem[];
  vendorName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  totalAmount?: number;
}

export default function ScanBill() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);

  const scanMutation = useMutation({
    mutationFn: (image: string) => api.scanning.scanBill(image),
    onSuccess: (data: ScanResult) => {
      setScanResult(data);
      setScannedItems(data.items.map(item => ({ ...item, selected: true })));
      toast({ title: "Bill Scanned", description: `Found ${data.items.length} items.` });
    },
    onError: (error: Error) => {
      toast({ 
        variant: "destructive", 
        title: "Scan Failed", 
        description: error.message || "Could not read the bill. Try a clearer image." 
      });
    }
  });

  const saveItemsMutation = useMutation({
    mutationFn: (items: any[]) => api.scanning.bulkCreateItems(items),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({ title: "Items Added", description: `${created.length} items added to inventory.` });
      setLocation("/inventory");
    },
    onError: (error: Error) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.message || "Failed to save items" 
      });
    }
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: "destructive", title: "Invalid File", description: "Please select an image file." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      setScanResult(null);
      setScannedItems([]);
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
        setScanResult(null);
        setScannedItems([]);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleScan = () => {
    if (imagePreview) {
      scanMutation.mutate(imagePreview);
    }
  };

  const toggleItemSelection = (index: number) => {
    setScannedItems(items => 
      items.map((item, i) => i === index ? { ...item, selected: !item.selected } : item)
    );
  };

  const updateItemField = (index: number, field: keyof ScannedItem, value: any) => {
    setScannedItems(items => 
      items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    );
  };

  const removeItem = (index: number) => {
    setScannedItems(items => items.filter((_, i) => i !== index));
  };

  const handleSaveItems = () => {
    const selectedItems = scannedItems
      .filter(item => item.selected)
      .map(({ selected, ...item }) => item);
    
    if (selectedItems.length === 0) {
      toast({ variant: "destructive", title: "No Items", description: "Select at least one item to add." });
      return;
    }

    saveItemsMutation.mutate(selectedItems);
  };

  const selectedCount = scannedItems.filter(i => i.selected).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/inventory")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Scan Supplier Bill</h1>
            <p className="text-muted-foreground mt-1">Upload a bill image to auto-add items to stock.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" /> Bill Image
            </CardTitle>
            <CardDescription>Upload or take a photo of your supplier bill</CardDescription>
          </CardHeader>
          <CardContent>
            {!imagePreview ? (
              <label 
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, or JPEG</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileSelect}
                  data-testid="input-bill-image"
                />
              </label>
            ) : (
              <div className="relative">
                <img 
                  src={imagePreview} 
                  alt="Bill preview" 
                  className="w-full h-64 object-contain rounded-lg bg-muted"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setImagePreview(null);
                    setScanResult(null);
                    setScannedItems([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              size="lg" 
              onClick={handleScan}
              disabled={!imagePreview || scanMutation.isPending}
              data-testid="button-scan-bill"
            >
              {scanMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning with AI...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Scan Bill
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Bill Info */}
        {scanResult && (
          <Card>
            <CardHeader>
              <CardTitle>Bill Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {scanResult.vendorName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendor</span>
                  <span className="font-medium">{scanResult.vendorName}</span>
                </div>
              )}
              {scanResult.invoiceNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice #</span>
                  <span className="font-medium">{scanResult.invoiceNumber}</span>
                </div>
              )}
              {scanResult.invoiceDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{scanResult.invoiceDate}</span>
                </div>
              )}
              {scanResult.totalAmount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-bold text-primary">₹{scanResult.totalAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Extracted Items */}
      {scannedItems.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" /> Extracted Items
              </CardTitle>
              <CardDescription>
                Review and edit items before adding to stock. 
                <Badge variant="secondary" className="ml-2">{selectedCount} selected</Badge>
              </CardDescription>
            </div>
            <Button 
              onClick={handleSaveItems} 
              disabled={selectedCount === 0 || saveItemsMutation.isPending}
              data-testid="button-save-scanned-items"
            >
              {saveItemsMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Add {selectedCount} to Stock
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Cost (₹)</TableHead>
                  <TableHead>Sell (₹)</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scannedItems.map((item, index) => (
                  <TableRow key={index} className={!item.selected ? "opacity-50" : ""} data-testid={`row-scanned-item-${index}`}>
                    <TableCell>
                      <input 
                        type="checkbox" 
                        checked={item.selected}
                        onChange={() => toggleItemSelection(index)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={item.name} 
                        onChange={(e) => updateItemField(index, 'name', e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={item.brand || ''} 
                        onChange={(e) => updateItemField(index, 'brand', e.target.value)}
                        className="h-8 w-24"
                        placeholder="-"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={item.quantity} 
                        onChange={(e) => updateItemField(index, 'quantity', Number(e.target.value))}
                        className="h-8 w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={item.costPrice} 
                        onChange={(e) => updateItemField(index, 'costPrice', Number(e.target.value))}
                        className="h-8 w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={item.sellingPrice} 
                        onChange={(e) => updateItemField(index, 'sellingPrice', Number(e.target.value))}
                        className="h-8 w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.gstPercent}%</Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
