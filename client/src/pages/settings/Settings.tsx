import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  Printer,
  Users,
  Bell,
  FileCheck,
  DollarSign,
  Gift,
  HelpCircle,
  LogOut,
  User,
  Store,
  MessageCircle,
  X,
  Save,
  Upload,
  CheckSquare,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const settingsNav = [
  { id: "manage-business", label: "Manage Business", icon: Store },
  { id: "invoice-settings", label: "Invoice Settings", icon: FileText },
  { id: "print-settings", label: "Print Settings", icon: Printer },
  { id: "manage-users", label: "Manage Users", icon: Users },
  { id: "reminders", label: "Reminders", icon: Bell },
  { id: "ca-reports", label: "CA Reports Sharing", icon: FileCheck },
  { id: "pricing", label: "Pricing", icon: DollarSign },
  { id: "refer", label: "Refer & Earn", icon: Gift },
  { id: "help", label: "Help And Support", icon: HelpCircle },
  { id: "logout", label: "Sign Out", icon: LogOut },
];

export default function Settings() {
  const [, setLocation] = useLocation();
  const [active, setActive] = useState("manage-business");
  const { user: store, signout } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [gstRegistered, setGstRegistered] = useState<"yes" | "no">("no");
  const [gstNumber, setGstNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [eInvoiceEnabled, setEInvoiceEnabled] = useState(false);
  const [logoPhoto, setLogoPhoto] = useState<string | null>(null);
  const [signaturePhoto, setSignaturePhoto] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(" ").map((part) => part[0]).join("").toUpperCase().substring(0, 2);
  };

  useEffect(() => {
    setOwnerName(store?.ownerName || "");
    setBusinessName(store?.name || "");
    setCompanyPhone(store?.phone || "");
    setCompanyEmail(store?.email || "");
    setBillingAddress(store?.address || "");
    setStateValue(store?.state || "");
    setCity(store?.city || "");
    setPincode(store?.pincode || "");
    setBusinessType(store?.businessType || "");
    setGstNumber(store?.gstin || "");
    setGstRegistered(store?.gstin ? "yes" : "no");
    setPanNumber(store?.panNumber || "");
    setEInvoiceEnabled(!!store?.eInvoiceEnabled);
    setLogoPhoto(store?.logo || null);
    setSignaturePhoto(store?.signaturePhoto || null);
  }, [
    store?.address,
    store?.businessType,
    store?.city,
    store?.eInvoiceEnabled,
    store?.email,
    store?.gstin,
    store?.name,
    store?.ownerName,
    store?.panNumber,
    store?.phone,
    store?.pincode,
    store?.logo,
    store?.signaturePhoto,
    store?.state,
  ]);

  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string | null) => void,
    label: string
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Invalid file", description: `Please select an image file for ${label}.` });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: `${label} must be under 5 MB.` });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setter(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const updateStoreMutation = useMutation({
    mutationFn: async () => {
      if (!store?.id) {
        throw new Error("Store not found");
      }
      return api.store.update(store.id, {
        ownerName,
        name: businessName,
        email: companyEmail,
        address: billingAddress,
        state: stateValue,
        city,
        pincode,
        businessType,
        panNumber,
        eInvoiceEnabled,
        gstin: gstRegistered === "yes" ? gstNumber.trim() : "",
        logo: logoPhoto || undefined,
        signaturePhoto: signaturePhoto || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      toast({ title: "Saved", description: "Business settings updated." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  return (
    <div className="min-h-screen">
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full lg:w-64 lg:fixed lg:left-0 lg:top-0 lg:bottom-0">
          <div className="w-full bg-sidebar border-r border-sidebar-border flex flex-col h-full">
            <div className="p-4 border-b border-sidebar-border bg-sidebar-accent/20">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                  <AvatarImage src={store?.ownerPhoto || undefined} alt={store?.ownerName} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {store?.ownerPhoto ? <Store className="h-5 w-5" /> : getInitials(store?.ownerName || store?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-sidebar-foreground truncate">
                    {store?.name || "Loading..."}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">
                    {store?.ownerName || "Owner"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {store?.phone}
                  </p>
                </div>
              </div>
              <Link href="/">
                <Button
                  variant="outline"
                  className="mt-4 w-full justify-center gap-2 bg-sidebar-accent/40 text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent/60"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {settingsNav.map((item) => {
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                    onClick={async () => {
                      if (item.id === "logout") {
                        await signout();
                        setLocation("/signin");
                        return;
                      }
                      setActive(item.id);
                    }}
                  >
                    <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-sidebar-border text-xs text-sidebar-foreground/60 space-y-1">
              <p>App Version : 8.90.0</p>
              <p>100% Secure</p>
            </div>
          </div>
        </aside>

        <section className="flex-1 space-y-4 px-4 sm:px-6 py-6 lg:ml-64">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Business Settings</h1>
              <p className="text-sm text-muted-foreground">Edit your company settings and information.</p>
            </div>
            <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
              <Button size="sm" variant="outline">
                <MessageCircle className="mr-2 h-4 w-4" />
                Chat Support
              </Button>
              <Button size="sm" variant="outline">
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (gstRegistered === "yes" && !gstNumber.trim()) {
                    toast({
                      variant: "destructive",
                      title: "GST number required",
                      description: "Please enter GST number or mark GST as No.",
                    });
                    return;
                  }
                  updateStoreMutation.mutate();
                }}
                disabled={updateStoreMutation.isPending || !store?.id}
              >
                <Save className="mr-2 h-4 w-4" />
                {updateStoreMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>

          {active === "manage-business" ? (
            <Card>
              <CardContent className="p-4 sm:p-6 text-sm">
                <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-[1fr_160px] items-center">
                      <div className="space-y-3 self-center">
                        <div>
                          <Label className="text-xs text-muted-foreground">Owner Name</Label>
                          <Input
                            placeholder="Owner name"
                            className="mt-2 h-10 text-sm"
                            value={ownerName}
                            onChange={(event) => setOwnerName(event.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Business Name <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            placeholder="Business name"
                            className="mt-2 h-10 text-sm"
                            value={businessName}
                            onChange={(event) => setBusinessName(event.target.value)}
                          />
                        </div>
                      </div>
                      <label
                        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/60 p-4 text-center text-primary transition hover:border-primary"
                        onClick={() => logoInputRef.current?.click()}
                      >
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => handleImageUpload(event, setLogoPhoto, "Logo")}
                        />
                        {logoPhoto ? (
                          <img
                            src={logoPhoto}
                            alt="Business logo"
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <Upload className="h-5 w-5" />
                          </div>
                        )}
                        <span className="text-sm font-medium">Upload Logo</span>
                        <span className="text-xs text-muted-foreground">PNG/JPG, max 5 MB.</span>
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Company Phone Number</Label>
                        <Input
                          placeholder="Enter phone number"
                          className="mt-2 h-10 text-sm"
                          value={companyPhone}
                          onChange={(event) => setCompanyPhone(event.target.value)}
                          disabled
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Company E-Mail</Label>
                        <Input
                          placeholder="Enter company e-mail"
                          className="mt-2 h-10 text-sm"
                          value={companyEmail}
                          onChange={(event) => setCompanyEmail(event.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Billing Address</Label>
                      <Textarea
                        placeholder="Enter Billing Address"
                        className="mt-2 text-sm"
                        rows={3}
                        value={billingAddress}
                        onChange={(event) => setBillingAddress(event.target.value)}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">State</Label>
                      <Select value={stateValue || undefined} onValueChange={setStateValue}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Enter State" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Karnataka">Karnataka</SelectItem>
                          <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                          <SelectItem value="Tamil Nadu">Tamil Nadu</SelectItem>
                        </SelectContent>
                      </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Pincode</Label>
                      <Input
                        placeholder="Enter Pincode"
                        className="mt-2 h-10 text-sm"
                        value={pincode}
                        onChange={(event) => setPincode(event.target.value)}
                      />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">City</Label>
                      <Input
                        placeholder="Enter City"
                        className="mt-2 h-10 text-sm"
                        value={city}
                        onChange={(event) => setCity(event.target.value)}
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Are you GST Registered?</Label>
                      <RadioGroup
                        value={gstRegistered}
                        onValueChange={(value) => setGstRegistered(value as "yes" | "no")}
                        className="mt-2 grid gap-3 sm:grid-cols-2"
                      >
                        <label className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3 text-sm">
                          <span>Yes</span>
                          <RadioGroupItem value="yes" />
                        </label>
                        <label className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3 text-sm">
                          <span>No</span>
                          <RadioGroupItem value="no" />
                        </label>
                      </RadioGroup>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">
                        GST Number {gstRegistered === "yes" && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        placeholder="Enter GST Number"
                        className="mt-2 h-10 text-sm"
                        value={gstNumber}
                        onChange={(event) => setGstNumber(event.target.value)}
                        disabled={gstRegistered === "no"}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/5 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <CheckSquare className="h-4 w-4" />
                        Enable e-Invoicing
                        <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold">
                          New
                        </span>
                      </div>
                      <Switch checked={eInvoiceEnabled} onCheckedChange={setEInvoiceEnabled} />
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">PAN Number</Label>
                      <Input
                        placeholder="Enter your PAN Number"
                        className="mt-2 h-10 text-sm"
                        value={panNumber}
                        onChange={(event) => setPanNumber(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <Label className="text-xs text-muted-foreground">Business Type</Label>
                      <Select value={businessType || undefined} onValueChange={setBusinessType}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Retail">Retail</SelectItem>
                          <SelectItem value="Wholesale">Wholesale</SelectItem>
                          <SelectItem value="Production">Production</SelectItem>
                          <SelectItem value="Services">Services</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="rounded-md bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Note:</span> Terms &amp; Conditions and
                      Signature added below will be shown on your invoices.
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Signature</Label>
                      <label
                        className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/60 p-4 text-center text-primary"
                        onClick={() => signatureInputRef.current?.click()}
                      >
                        <input
                          ref={signatureInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => handleImageUpload(event, setSignaturePhoto, "Signature")}
                        />
                        {signaturePhoto ? (
                          <img
                            src={signaturePhoto}
                            alt="Signature"
                            className="h-14 w-28 object-contain"
                          />
                        ) : (
                          <span className="text-sm font-medium">+ Add Signature</span>
                        )}
                      </label>
                    </div>

                    <Card>
                      <CardContent className="p-4 space-y-4">
                        <div>
                          <p className="text-sm font-semibold">Add Business Details</p>
                          <p className="text-xs text-muted-foreground">
                            Add additional business information such as MSME number, Website etc.
                          </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center">
                          <Input placeholder="Website" className="h-10 text-sm" />
                          <span className="text-xs text-muted-foreground text-center">=</span>
                          <Input placeholder="www.website.com" className="h-10 text-sm" />
                          <Button size="sm">Add</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                This section is coming soon.
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
