import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Upload, Camera, Loader2, Check, X, Trash2, ArrowLeft, Package, FileText, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

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
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [createdPartyId, setCreatedPartyId] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  const convertPdfToImages = async (file: File): Promise<string[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: string[] = [];
    
    const numPages = Math.min(pdf.numPages, 5);
    
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport, canvas } as any).promise;
      images.push(canvas.toDataURL('image/jpeg', 0.85));
    }
    
    return images;
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanResult(null);
    setScannedItems([]);

    if (file.type === 'application/pdf') {
      setIsProcessingPdf(true);
      try {
        const images = await convertPdfToImages(file);
        setPdfPages(images);
        setImagePreview(images[0]);
        setCurrentPage(0);
        toast({ title: "PDF Loaded", description: `Extracted ${images.length} page(s) from PDF.` });
      } catch (error) {
        toast({ variant: "destructive", title: "PDF Error", description: "Failed to process PDF file." });
      } finally {
        setIsProcessingPdf(false);
      }
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setImagePreview(base64);
        setPdfPages([]);
      };
      reader.readAsDataURL(file);
    } else {
      toast({ variant: "destructive", title: "Invalid File", description: "Please select an image or PDF file." });
    }
  }, [toast]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    setScanResult(null);
    setScannedItems([]);

    if (file.type === 'application/pdf') {
      setIsProcessingPdf(true);
      try {
        const images = await convertPdfToImages(file);
        setPdfPages(images);
        setImagePreview(images[0]);
        setCurrentPage(0);
      } catch (error) {
        toast({ variant: "destructive", title: "PDF Error", description: "Failed to process PDF file." });
      } finally {
        setIsProcessingPdf(false);
      }
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
        setPdfPages([]);
      };
      reader.readAsDataURL(file);
    }
  }, [toast]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (error) {
      toast({ variant: "destructive", title: "Camera Error", description: "Could not access camera. Please check permissions." });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d')!;
      context.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      setImagePreview(imageData);
      setPdfPages([]);
      setScanResult(null);
      setScannedItems([]);
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleScan = () => {
    if (imagePreview) {
      scanMutation.mutate(imagePreview);
    }
  };

  const clearAll = () => {
    setImagePreview(null);
    setPdfPages([]);
    setScanResult(null);
    setScannedItems([]);
    setCurrentPage(0);
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

  const handleSaveItems = async () => {
    const selectedItems = scannedItems
      .filter(item => item.selected)
      .map(({ selected, ...item }) => item);
    
    if (selectedItems.length === 0) {
      toast({ variant: "destructive", title: "No Items", description: "Select at least one item to add." });
      return;
    }

    let partyId = createdPartyId;
    
    // Create party from vendor name if not already created
    if (!partyId && scanResult?.vendorName) {
      try {
        // First try to find existing party with same name
        const existingParties = await api.parties.search(scanResult.vendorName);
        const existingParty = existingParties.find(
          (p: { name: string }) => p.name.toLowerCase() === scanResult.vendorName?.toLowerCase()
        );
        
        if (existingParty) {
          partyId = existingParty.id;
          setCreatedPartyId(existingParty.id);
        } else {
          // Create new party
          const party = await api.parties.create({ name: scanResult.vendorName });
          partyId = party.id;
          setCreatedPartyId(party.id);
          queryClient.invalidateQueries({ queryKey: ['parties'] });
          toast({ title: "Party Created", description: `Supplier "${scanResult.vendorName}" has been added.` });
        }
      } catch (error: any) {
        console.error("Failed to create party:", error);
        toast({ 
          variant: "destructive", 
          title: "Party Creation Failed", 
          description: error.message || "Items will be added without party linkage." 
        });
      }
    }

    // Add partyId to items if available
    const itemsWithParty = selectedItems.map(item => ({
      ...item,
      partyId: partyId || undefined,
    }));

    saveItemsMutation.mutate(itemsWithParty);
  };

  const selectedCount = scannedItems.filter(i => i.selected).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/inventory")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Scan Supplier Bill</h1>
            <p className="text-muted-foreground mt-1">Upload an image, PDF, or take a photo to auto-add items.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Bill Source
            </CardTitle>
            <CardDescription>Choose how to capture your supplier bill</CardDescription>
          </CardHeader>
          <CardContent>
            {!imagePreview ? (
              <div className="space-y-4">
                <label 
                  className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {isProcessingPdf ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-10 h-10 mb-3 text-muted-foreground animate-spin" />
                      <p className="text-sm text-muted-foreground">Processing PDF...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, JPEG, or PDF</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*,application/pdf" 
                    onChange={handleFileSelect}
                    data-testid="input-bill-file"
                  />
                </label>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full h-16" 
                  onClick={startCamera}
                  data-testid="button-open-camera"
                >
                  <Video className="mr-2 h-5 w-5" />
                  Take Photo with Camera
                </Button>
              </div>
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
                  onClick={clearAll}
                  data-testid="button-clear-image"
                >
                  <X className="h-4 w-4" />
                </Button>
                {pdfPages.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-background/90 px-3 py-1 rounded-full flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      disabled={currentPage === 0}
                      onClick={() => {
                        setCurrentPage(p => p - 1);
                        setImagePreview(pdfPages[currentPage - 1]);
                      }}
                    >
                      ←
                    </Button>
                    <span className="text-sm">Page {currentPage + 1} of {pdfPages.length}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      disabled={currentPage === pdfPages.length - 1}
                      onClick={() => {
                        setCurrentPage(p => p + 1);
                        setImagePreview(pdfPages[currentPage + 1]);
                      }}
                    >
                      →
                    </Button>
                  </div>
                )}
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

        {scanResult && (
          <Card>
            <CardHeader>
              <CardTitle>Bill Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {scanResult.vendorName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Party (Supplier)</span>
                  <span className="font-medium" data-testid="text-scanned-party">{scanResult.vendorName}</span>
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

      <Dialog open={showCamera} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Take Photo of Bill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={stopCamera} data-testid="button-cancel-camera">
                Cancel
              </Button>
              <Button onClick={capturePhoto} data-testid="button-capture-photo">
                <Camera className="mr-2 h-4 w-4" />
                Capture Photo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
