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
  quantity: number;
  maxQuantity: number;
  unit: string;
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
        quantity: 1,
        maxQuantity: Number(item.quantity),
        unit: item.unit,
      }]);
    } else {
      setSelectedItems(prev => prev.filter(i => i.itemId !== item.id));
    }
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setSelectedItems(prev => prev.map(item => 
      item.itemId === itemId 
        ? { ...item, quantity: Math.min(quantity, item.maxQuantity) }
        : item
    ));
  };

  const handleSubmit = () => {
    if (!selectedStore || selectedItems.length === 0 || !currentStore) return;

    const transfer = {
      toStoreId: selectedStore.id,
    };

    const lineItems = selectedItems.map(item => ({
      itemId: item.itemId,
      name: item.name,
      quantity: item.quantity,
    }));

    createTransferMutation.mutate({ transfer, lineItems });
  };

  const availableItems = myItems?.filter((item: any) => Number(item.quantity) > 0) || [];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/transfers")} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Stock Transfer</h1>
          <p className="text-muted-foreground">Send items to another Salemate store</p>
        </div>
      </div>

      <div className="flex items-center justify-between px-4">
        <StepIndicator step={1} current={step} label="Find Store" />
        <div className="flex-1 h-0.5 bg-border mx-2" />
        <StepIndicator step={2} current={step} label="Select Items" />
        <div className="flex-1 h-0.5 bg-border mx-2" />
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
            <div className="flex items-center justify-between">
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
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
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
                              Available: {item.quantity} {item.unit}
                            </p>
                          </div>
                          {selected && (
                            <div className="flex items-center gap-2">
                              <Label className="text-sm">Qty:</Label>
                              <Input
                                type="number"
                                min={1}
                                max={item.quantity}
                                value={selected.quantity}
                                onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                                className="w-20"
                                data-testid={`input-qty-${item.id}`}
                              />
                            </div>
                          )}
                        </div>
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
              <div className="border rounded-lg divide-y">
                {selectedItems.map((item) => (
                  <div key={item.itemId} className="p-3 flex justify-between items-center">
                    <span>{item.name}</span>
                    <span className="font-mono text-sm">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                ))}
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
