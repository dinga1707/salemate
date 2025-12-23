import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Building2,
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
  Calendar,
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

const settingsNav = [
  { id: "account", label: "Account", icon: User },
  { id: "manage-business", label: "Manage Business", icon: Store },
  { id: "invoice-settings", label: "Invoice Settings", icon: FileText },
  { id: "print-settings", label: "Print Settings", icon: Printer },
  { id: "manage-users", label: "Manage Users", icon: Users },
  { id: "reminders", label: "Reminders", icon: Bell },
  { id: "ca-reports", label: "CA Reports Sharing", icon: FileCheck },
  { id: "pricing", label: "Pricing", icon: DollarSign },
  { id: "refer", label: "Refer & Earn", icon: Gift },
  { id: "help", label: "Help And Support", icon: HelpCircle },
  { id: "logout", label: "Logout", icon: LogOut },
];

export default function Settings() {
  const [active, setActive] = useState("manage-business");
  const { user: store } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(" ").map((part) => part[0]).join("").toUpperCase().substring(0, 2);
  };

  return (
    <div className="min-h-screen">
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full lg:w-64 lg:fixed lg:left-0 lg:top-0 lg:bottom-0">
          <div className="w-full bg-sidebar border-r border-sidebar-border flex flex-col h-full">
            <div className="p-6 border-b border-sidebar-border">
              <div className="flex items-center gap-2 mb-1">
                <img
                  src="/assets/salemate-logo.png"
                  alt="Salemate"
                  className="h-8 w-8 object-contain"
                />
                <span className="font-heading font-bold text-xl tracking-tight text-sidebar-foreground">Salemate</span>
              </div>
            </div>
            <div className="p-4 border-b border-sidebar-border bg-sidebar-accent/20">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                  <AvatarImage src={store?.shopPhoto || undefined} alt={store?.name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {store?.shopPhoto ? <Store className="h-5 w-5" /> : getInitials(store?.name)}
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
                    onClick={() => setActive(item.id)}
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
              <Button className="bg-amber-500 text-white hover:bg-amber-600">
                <Building2 className="mr-2 h-4 w-4" />
                Create new business
              </Button>
              <Button variant="outline">
                <MessageCircle className="mr-2 h-4 w-4" />
                Chat Support
              </Button>
              <Button variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Close Financial Year
              </Button>
              <Button variant="outline">
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>

          {active === "manage-business" ? (
            <Card>
              <CardContent className="p-4 sm:p-6 space-y-6">
                <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-4 text-center transition hover:border-primary/60">
                    <input type="file" className="hidden" />
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium">Upload Logo</span>
                    <span className="text-xs text-muted-foreground">PNG/JPG, max 5 MB.</span>
                  </label>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="lg:col-span-1">
                      <Label>Business Name *</Label>
                      <Input placeholder="Salemate" className="mt-2" />
                    </div>
                    <div className="lg:col-span-1">
                      <Label>Business Type (Select multiple, if applicable)</Label>
                      <Select>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Retailer, Services" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="retailer">Retailer</SelectItem>
                          <SelectItem value="services">Services</SelectItem>
                          <SelectItem value="wholesale">Wholesale</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="lg:col-span-1">
                      <Label>Company Phone Number</Label>
                      <Input placeholder="9972460640" className="mt-2" />
                    </div>
                    <div className="lg:col-span-1">
                      <Label>Company E-Mail</Label>
                      <Input placeholder="Enter company e-mail" className="mt-2" />
                    </div>
                    <div className="lg:col-span-2">
                      <Label>Billing Address</Label>
                      <Textarea placeholder="Enter Billing Address" className="mt-2" rows={3} />
                    </div>
                    <div>
                      <Label>State</Label>
                      <Select>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Enter State" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ka">Karnataka</SelectItem>
                          <SelectItem value="mh">Maharashtra</SelectItem>
                          <SelectItem value="tn">Tamil Nadu</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Pincode</Label>
                      <Input placeholder="Enter Pincode" className="mt-2" />
                    </div>
                    <div className="lg:col-span-2">
                      <Label>City</Label>
                      <Input placeholder="Enter City" className="mt-2" />
                    </div>
                    <div className="lg:col-span-2 space-y-3 rounded-lg border bg-muted/30 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Are you GST Registered?</p>
                        <RadioGroup defaultValue="no" className="flex gap-6">
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="yes" />
                            Yes
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="no" />
                            No
                          </label>
                        </RadioGroup>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-primary">
                          <CheckSquare className="h-4 w-4" />
                          Enable e-Invoicing
                        </div>
                        <Switch />
                      </div>
                      <div>
                        <Label>PAN Number</Label>
                        <Input placeholder="Enter your PAN Number" className="mt-2" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                  <div className="space-y-4">
                    <div>
                      <Label>Business Registration Type</Label>
                      <Select>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Business Not Registered" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unregistered">Business Not Registered</SelectItem>
                          <SelectItem value="registered">Registered</SelectItem>
                          <SelectItem value="gst">GST Registered</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Industry Type</Label>
                      <Input placeholder="Agriculture" className="mt-2" />
                    </div>
                    <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                      Note: Terms & Conditions and Signature added below will be shown on your invoices.
                    </div>
                    <div>
                      <Label>Signature</Label>
                      <label className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-4 text-center">
                        <input type="file" className="hidden" />
                        <span className="text-sm font-medium text-primary">+ Add Signature</span>
                      </label>
                    </div>
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
                        <Input placeholder="Website" />
                        <span className="text-xs text-muted-foreground text-center">=</span>
                        <Input placeholder="www.website.com" />
                        <Button size="sm">Add</Button>
                      </div>
                    </CardContent>
                  </Card>
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
