import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Search, Store, ArrowRight, Package, Check, Loader2, ArrowLeft, Phone, MapPin } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";

interface FoundStore {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  plan: string;
}

interface SelectedItem {
  itemId: string;
  name: string;
  hsn: string;
  quantity: number;
  maxQuantity: number;
  unit: string;
  unitPrice: string;
  discount: string;
  gstPercent: string;
}

export default function CreateTransfer() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentStore } = useAuth();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState<FoundStore | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FoundStore[]>([]);

  const { data: myItems } = useQuery({ 
    queryKey: ['items'], 
    queryFn: () => api.items.list() 
  });

  const createTransferMutation = useMutation({
    mutationFn: ({ transfer, lineItems }: { transfer: any, lineItems: any[] }) => 
      api.transfers.create(transfer, lineItems),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({ title: "Transfer Sent", description: `Stock transfer request sent to ${selectedStore?.name}.` });
      navigate("/transfers");
    },
    onError: (error: Error) => {
      toast({ 
        variant: "destructive",
        title: "Error", 
        description: error.message || "Failed to create transfer" 
      });
    }
  });

  useEffect(() => {
    const searchStores = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        const results = await api.store.search(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchStores, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSelectStore = (store: FoundStore) => {
    setSelectedStore(store);
    setStep(2);
  };

  const handleItemToggle = (item: any, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, {
        itemId: item.id,
        name: item.name,
        hsn: item.hsn || "",
        quantity: 1,
        maxQuantity: Number(item.quantity),
        unit: item.unit,
        unitPrice: item.sellingPrice || "0",
        discount: item.discount || "0",
        gstPercent: item.gstPercent || "0",
      }]);
    } else {
      setSelectedItems(prev => prev.filter(i => i.itemId !== item.id));
    }
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    setSelectedItems(prev => prev.map(item => 
      item.itemId === itemId 
        ? { ...item, quantity: Math.min(quantity, item.maxQuantity) }
        : item
    ));
  };

  const handlePriceChange = (itemId: string, unitPrice: string) => {
    setSelectedItems(prev => prev.map(item => 
      item.itemId === itemId ? { ...item, unitPrice } : item
    ));
  };

  const handleDiscountChange = (itemId: string, discount: string) => {
    setSelectedItems(prev => prev.map(item => 
      item.itemId === itemId ? { ...item, discount } : item
    ));
  };

  const handleSubmit = () => {
    if (!selectedStore || selectedItems.length === 0 || !currentStore) return;

    const transfer = {
      toStoreId: selectedStore.id,
    };

    const lineItems = selectedItems.map(item => {
      const price = parseFloat(item.unitPrice) || 0;
      const disc = parseFloat(item.discount) || 0;
      const total = ((price - disc) * item.quantity).toFixed(2);
      return {
        itemId: item.itemId,
        name: item.name,
        hsn: item.hsn,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        discount: item.discount,
        gstPercent: item.gstPercent,
        total,
      };
    });

    createTransferMutation.mutate({ transfer, lineItems });
  };

  const calculateTotal = () => {
    return selectedItems.reduce((sum, item) => {
      const price = parseFloat(item.unitPrice) || 0;
      const disc = parseFloat(item.discount) || 0;
      return sum + (price - disc) * item.quantity;
    }, 0);
  };

  const availableItems = myItems?.filter((item: any) => Number(item.quantity) > 0) || [];

  return (
    <div className="space-y-6 max-w-2xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/transfers")} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Stock Transfer</h1>
          <p className="text-muted-foreground">Send items to another Salemate store</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <StepIndicator step={1} current={step} label="Find Store" />
        <div className="hidden sm:block flex-1 h-0.5 bg-border mx-2" />
        <StepIndicator step={2} current={step} label="Select Items" />
        <div className="hidden sm:block flex-1 h-0.5 bg-border mx-2" />
        <StepIndicator step={3} current={step} label="Review" />
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Find Recipient Store
            </CardTitle>
            <CardDescription>
              Search by store name or mobile number
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter store name or phone number..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-store"
              />
            </div>

            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Store className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No stores found matching "{searchQuery}"</p>
                <p className="text-sm">Make sure the store is registered on Salemate</p>
              </div>
            )}

            {searchResults.map((store) => (
              <div
                key={store.id}
                className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                onClick={() => handleSelectStore(store)}
                data-testid={`store-result-${store.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-primary" />
                      <span className="font-medium">{store.name}</span>
                      <Badge variant="outline" className="text-xs">{store.plan}</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {store.phone}
                    </div>
                    {store.address && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {store.address}
                      </div>
                    )}
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            ))}

            {searchQuery.length < 2 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Enter at least 2 characters to search</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && selectedStore && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Select Items to Transfer
                </CardTitle>
                <CardDescription>
                  Sending to: <span className="font-medium text-foreground">{selectedStore.name}</span>
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                Change Store
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No items with stock available</p>
                <p className="text-sm">Add items to your inventory first</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {availableItems.map((item: any) => {
                    const selected = selectedItems.find(i => i.itemId === item.id);
                    return (
                      <div
                        key={item.id}
                        className={`p-3 border rounded-lg transition-colors ${selected ? 'border-primary bg-primary/5' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={!!selected}
                            onCheckedChange={(checked) => handleItemToggle(item, !!checked)}
                            data-testid={`checkbox-item-${item.id}`}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Available: {item.quantity} {item.unit} | MRP: ₹{item.sellingPrice}
                              {item.hsn && ` | HSN: ${item.hsn}`}
                            </p>
                          </div>
                        </div>
                        {selected && (
                          <div className="mt-3 pt-3 border-t grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <Label className="text-xs text-muted-foreground">Qty</Label>
                              <Input
                                type="number"
                                inputMode="decimal"
                                min="0.001"
                                step="0.001"
                                max={item.quantity}
                                value={selected.quantity}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  if (Number.isNaN(value)) return;
                                  handleQuantityChange(item.id, value);
                                }}
                                data-testid={`input-qty-${item.id}`}
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Price (₹)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={selected.unitPrice}
                                onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                data-testid={`input-price-${item.id}`}
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Discount (₹)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={selected.discount}
                                onChange={(e) => handleDiscountChange(item.id, e.target.value)}
                                data-testid={`input-discount-${item.id}`}
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Total</Label>
                              <div className="h-10 flex items-center font-mono text-primary">
                                ₹{((parseFloat(selected.unitPrice) - parseFloat(selected.discount || "0")) * selected.quantity).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button 
                    onClick={() => setStep(3)} 
                    disabled={selectedItems.length === 0}
                    data-testid="button-continue-review"
                  >
                    Continue to Review
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {step === 3 && selectedStore && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              Review Transfer
            </CardTitle>
            <CardDescription>
              Confirm the details before sending
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground">Sending to:</p>
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                <span className="font-medium text-lg">{selectedStore.name}</span>
              </div>
              <p className="text-sm text-muted-foreground">{selectedStore.phone}</p>
              {selectedStore.address && (
                <p className="text-sm text-muted-foreground">{selectedStore.address}</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="font-medium">Items ({selectedItems.length})</p>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Item</th>
                      <th className="text-right p-2">Qty</th>
                      <th className="text-right p-2">Price</th>
                      <th className="text-right p-2">Disc</th>
                      <th className="text-right p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedItems.map((item) => {
                      const itemTotal = (parseFloat(item.unitPrice) - parseFloat(item.discount || "0")) * item.quantity;
                      return (
                        <tr key={item.itemId}>
                          <td className="p-2">{item.name}</td>
                          <td className="p-2 text-right">{item.quantity} {item.unit}</td>
                          <td className="p-2 text-right">₹{item.unitPrice}</td>
                          <td className="p-2 text-right">₹{item.discount || "0"}</td>
                          <td className="p-2 text-right font-mono font-medium">₹{itemTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end pt-2">
                <div className="text-lg font-bold">
                  Grand Total: <span className="text-primary">₹{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createTransferMutation.isPending}
                data-testid="button-send-transfer"
              >
                {createTransferMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Transfer
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepIndicator({ step, current, label }: { step: number, current: number, label: string }) {
  const isCompleted = current > step;
  const isCurrent = current === step;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
        isCompleted ? 'bg-primary text-primary-foreground' :
        isCurrent ? 'bg-primary text-primary-foreground' :
        'bg-muted text-muted-foreground'
      }`}>
        {isCompleted ? <Check className="h-4 w-4" /> : step}
      </div>
      <span className={`text-xs ${isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  );
}
