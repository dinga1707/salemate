import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, FileText, ShoppingCart, Package, Download, Search, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";

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
  hsn?: string | null;
  partyId?: string | null;
  unit: string;
  quantity: number;
  costPrice: string;
  sellingPrice: string;
  gstPercent?: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName?: string;
  customerPhone?: string;
  customerGstin?: string;
  subtotal: string;
  gstAmount: string;
  total: string;
  paymentMethod: string;
  createdAt: string;
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState("party");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("current-month");

  const { data: parties } = useQuery<Party[]>({
    queryKey: ['parties'],
    queryFn: () => api.parties.list()
  });

  const { data: items } = useQuery<Item[]>({
    queryKey: ['items'],
    queryFn: () => api.items.list()
  });

  const { data: invoices } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: () => api.invoices.list()
  });

  const getPartyName = (partyId?: string | null) => {
    if (!partyId) return "-";
    const party = parties?.find(p => p.id === partyId);
    return party?.name || "-";
  };

  const getItemsByParty = (partyId: string) => {
    return items?.filter(i => i.partyId === partyId) || [];
  };

  const getPartyStats = (partyId: string) => {
    const partyItems = getItemsByParty(partyId);
    const totalValue = partyItems.reduce((sum, item) => 
      sum + (Number(item.costPrice) * item.quantity), 0
    );
    return {
      itemCount: partyItems.length,
      totalQuantity: partyItems.reduce((sum, i) => sum + i.quantity, 0),
      totalValue
    };
  };

  const calculateGSTSummary = () => {
    const gstRates: Record<string, { taxableValue: number; cgst: number; sgst: number; igst: number }> = {};
    
    invoices?.forEach(invoice => {
      const gstPercent = Number(invoice.gstAmount) > 0 ? 
        Math.round((Number(invoice.gstAmount) / Number(invoice.subtotal)) * 100) : 0;
      const key = `${gstPercent}%`;
      
      if (!gstRates[key]) {
        gstRates[key] = { taxableValue: 0, cgst: 0, sgst: 0, igst: 0 };
      }
      
      gstRates[key].taxableValue += Number(invoice.subtotal);
      gstRates[key].cgst += Number(invoice.gstAmount) / 2;
      gstRates[key].sgst += Number(invoice.gstAmount) / 2;
    });

    return Object.entries(gstRates).map(([rate, values]) => ({
      rate,
      ...values,
      total: values.cgst + values.sgst + values.igst
    }));
  };

  const getFilteredInvoices = () => {
    if (!invoices) return [];
    
    let filtered = [...invoices];
    
    if (dateFilter === "current-month") {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      filtered = filtered.filter(inv => {
        const date = parseISO(inv.createdAt);
        return date >= start && date <= end;
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(inv => 
        inv.invoiceNumber?.toLowerCase().includes(query) ||
        inv.customerName?.toLowerCase().includes(query) ||
        inv.customerPhone?.includes(query)
      );
    }

    return filtered;
  };

  const getStockSummary = () => {
    if (!items) return { totalItems: 0, lowStock: 0, totalValue: 0, totalRetailValue: 0 };
    
    return {
      totalItems: items.length,
      lowStock: items.filter(i => i.quantity < 5).length,
      totalValue: items.reduce((sum, i) => sum + (Number(i.costPrice) * i.quantity), 0),
      totalRetailValue: items.reduce((sum, i) => sum + (Number(i.sellingPrice) * i.quantity), 0)
    };
  };

  const filteredItems = items?.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(query) || 
           item.brand?.toLowerCase().includes(query) ||
           getPartyName(item.partyId).toLowerCase().includes(query);
  }) || [];

  const stockSummary = getStockSummary();
  const gstSummary = calculateGSTSummary();
  const filteredInvoices = getFilteredInvoices();
  const totalGST = gstSummary.reduce((sum, g) => sum + g.total, 0);
  const totalTaxable = gstSummary.reduce((sum, g) => sum + g.taxableValue, 0);

  return (
    <div className="space-y-6 px-4 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">View business reports and analytics.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="party" className="gap-2" data-testid="tab-party">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Party</span>
          </TabsTrigger>
          <TabsTrigger value="gst" className="gap-2" data-testid="tab-gst">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">GST</span>
          </TabsTrigger>
          <TabsTrigger value="transaction" className="gap-2" data-testid="tab-transaction">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Transaction</span>
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-2" data-testid="tab-stock">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Stock</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="party" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:flex-1 sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search parties..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-party"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Party Report</CardTitle>
              <CardDescription>Stock value and item count by supplier</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Party Name</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total Qty</TableHead>
                    <TableHead className="text-right">Stock Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parties?.filter(p => 
                    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((party) => {
                    const stats = getPartyStats(party.id);
                    return (
                      <TableRow key={party.id} data-testid={`row-party-${party.id}`}>
                        <TableCell className="font-medium">{party.name}</TableCell>
                        <TableCell>{party.gstin || "-"}</TableCell>
                        <TableCell>{party.phone || "-"}</TableCell>
                        <TableCell className="text-right">{stats.itemCount}</TableCell>
                        <TableCell className="text-right">{stats.totalQuantity}</TableCell>
                        <TableCell className="text-right font-medium">₹{stats.totalValue.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {(!parties || parties.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No parties found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gst" className="space-y-4">
          <div className="flex items-center gap-2">
            <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-date-filter">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current-month">Current Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Taxable Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-taxable-value">₹{totalTaxable.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total GST</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-gst">₹{totalGST.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Invoice Count</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-invoice-count">{filteredInvoices.length}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>GST Summary</CardTitle>
              <CardDescription>Tax breakdown by rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GST Rate</TableHead>
                    <TableHead className="text-right">Taxable Value</TableHead>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="text-right">SGST</TableHead>
                    <TableHead className="text-right">Total Tax</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gstSummary.map((row) => (
                    <TableRow key={row.rate}>
                      <TableCell className="font-medium">{row.rate}</TableCell>
                      <TableCell className="text-right">₹{row.taxableValue.toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{row.cgst.toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{row.sgst.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">₹{row.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {gstSummary.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No GST data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transaction" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:flex-1 sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice #, customer..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-transaction"
              />
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-transaction-date">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current-month">Current Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Transaction Report</CardTitle>
              <CardDescription>All invoices and transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">GST</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{format(parseISO(invoice.createdAt), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{invoice.customerName || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{invoice.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell className="text-right">₹{Number(invoice.subtotal).toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{Number(invoice.gstAmount).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">₹{Number(invoice.total).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:flex-1 sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-stock"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-items">{stockSummary.totalItems}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive" data-testid="text-low-stock">{stockSummary.lowStock}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Stock Value (Cost)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-stock-value">₹{stockSummary.totalValue.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Stock Value (Retail)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-retail-value">₹{stockSummary.totalRetailValue.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Stock Report</CardTitle>
              <CardDescription>Inventory details by item</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>HSN</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Cost Price</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                    <TableHead className="text-right">Stock Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id} data-testid={`row-stock-${item.id}`}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{getPartyName(item.partyId)}</TableCell>
                      <TableCell>{item.brand || "-"}</TableCell>
                      <TableCell>{item.hsn || "-"}</TableCell>
                      <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                      <TableCell className="text-right">₹{Number(item.costPrice).toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{Number(item.sellingPrice).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{(Number(item.costPrice) * item.quantity).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {item.quantity < 5 ? (
                          <Badge variant="destructive">Low</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No items found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
