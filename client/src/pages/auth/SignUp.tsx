import { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Store, Upload, Loader2, Camera } from "lucide-react";

const signupSchema = z.object({
  ownerName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  name: z.string().min(2, "Business name must be at least 2 characters"),
  gstin: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignUp() {
  const [, setLocation] = useLocation();
  const { signup } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [logoPhoto, setLogoPhoto] = useState<string | null>(null);
  const [ownerPhoto, setOwnerPhoto] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [phoneExists, setPhoneExists] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const lastWarnedPhone = useRef<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const ownerInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      ownerName: "",
      phone: "",
      password: "",
      confirmPassword: "",
      name: "",
      gstin: "",
      email: "",
      address: "",
    },
  });

  const handlePhotoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ variant: "destructive", title: "Invalid File", description: "Please select an image file." });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setter(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      if (!otpVerified) {
        toast({ variant: "destructive", title: "Verify OTP", description: "Please verify your OTP before signing up." });
        return;
      }
      const { confirmPassword, ...signupData } = data;
      await signup({
        ...signupData,
        logo: logoPhoto || undefined,
        ownerPhoto: ownerPhoto || undefined,
        otp,
      });
      toast({ title: "Welcome!", description: "Your account has been created successfully." });
      setLocation("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sign Up Failed", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    const phone = form.getValues("phone");
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      toast({ variant: "destructive", title: "Invalid phone", description: "Enter a valid 10-digit mobile number." });
      return;
    }
    if (phoneExists) {
      toast({ variant: "destructive", title: "Number already registered", description: "Please sign in instead." });
      return;
    }
    setOtpLoading(true);
    try {
      const response = await api.auth.signupOtp(phone);
      setOtpSent(true);
      setOtpVerified(false);
      setDevOtp(response?.otp || null);
      toast({ title: "OTP sent", description: response?.otp ? "Dev OTP shown below." : "Check your phone for the code." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to send OTP", description: error.message });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const phone = form.getValues("phone");
    if (!otp || !/^\d{6}$/.test(otp)) {
      toast({ variant: "destructive", title: "Invalid OTP", description: "Enter the 6-digit OTP." });
      return;
    }
    setOtpVerifyLoading(true);
    try {
      await api.auth.signupVerify(phone, otp);
      setOtpVerified(true);
      toast({ title: "OTP verified", description: "You can now create your account." });
    } catch (error: any) {
      setOtpVerified(false);
      toast({ variant: "destructive", title: "OTP failed", description: error.message });
    } finally {
      setOtpVerifyLoading(false);
    }
  };

  const phoneValue = form.watch("phone");

  useEffect(() => {
    const phone = phoneValue || "";
    setOtp("");
    setOtpSent(false);
    setOtpVerified(false);
    setDevOtp(null);
    setPhoneExists(false);
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return;
    }
    setCheckingPhone(true);
    const timer = setTimeout(async () => {
      try {
        const result = await api.auth.checkPhone(phone);
        const exists = !!result?.exists;
        setPhoneExists(exists);
        if (exists && lastWarnedPhone.current !== phone) {
          lastWarnedPhone.current = phone;
          toast({
            variant: "destructive",
            title: "Number already registered",
            description: "Please sign in instead.",
          });
        }
      } catch (error: any) {
        toast({ variant: "destructive", title: "Check failed", description: error.message });
      } finally {
        setCheckingPhone(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [phoneValue, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img 
              src="/assets/salemate-logo.png" 
              alt="Salemate" 
              className="h-16 w-16 object-contain mx-auto"
            />
          </div>
          <CardTitle className="text-2xl">Create your business</CardTitle>
          <CardDescription>Start managing your business with Salemate</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 mb-2">
                <div>
                  <div
                    className="relative w-full h-24 rounded-lg border-2 border-dashed border-border bg-muted flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {logoPhoto ? (
                      <img src={logoPhoto} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handlePhotoUpload(event, setLogoPhoto)}
                    data-testid="input-logo-photo"
                  />
                  <p className="mt-2 text-center text-xs text-muted-foreground">Add business logo (optional)</p>
                </div>
                <div>
                  <div
                    className="relative w-full h-24 rounded-full border-2 border-dashed border-border bg-muted flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden"
                    onClick={() => ownerInputRef.current?.click()}
                  >
                    {ownerPhoto ? (
                      <img src={ownerPhoto} alt="Owner" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <input
                    ref={ownerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handlePhotoUpload(event, setOwnerPhoto)}
                    data-testid="input-owner-photo"
                  />
                  <p className="mt-2 text-center text-xs text-muted-foreground">Add owner photo (optional)</p>
                </div>
              </div>

              <FormField
                control={form.control}
                name="ownerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your full name" {...field} data-testid="input-owner-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground">
                          +91
                        </span>
                        <Input
                          placeholder="9876543210"
                          className="rounded-l-none"
                          {...field}
                          data-testid="input-phone"
                        />
                      </div>
                    </FormControl>
                    {checkingPhone && (
                      <p className="mt-1 text-xs text-muted-foreground">Checking number...</p>
                    )}
                    {phoneExists && (
                      <p className="mt-1 text-xs text-destructive">Number already registered.</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="rounded-lg border border-dashed border-primary/30 p-3">
                <p className="text-xs text-muted-foreground mb-2">Verify your mobile number</p>
                <div className="flex flex-wrap gap-2">
                  <Input
                    placeholder="Enter OTP"
                    className="h-10 text-sm flex-1 min-w-[140px]"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    maxLength={6}
                  />
                  <Button type="button" variant="outline" onClick={handleSendOtp} disabled={otpLoading || phoneExists}>
                    {otpLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {otpSent ? "Resend OTP" : "Send OTP"}
                  </Button>
                  <Button type="button" onClick={handleVerifyOtp} disabled={otpVerifyLoading || !otp}>
                    {otpVerifyLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Verify OTP
                  </Button>
                </div>
                {devOtp && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Dev OTP: <span className="font-semibold text-foreground">{devOtp}</span>
                  </p>
                )}
                {otpVerified && (
                  <p className="mt-2 text-xs text-green-600 font-medium">OTP verified</p>
                )}
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Business" {...field} data-testid="input-store-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••" {...field} data-testid="input-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••" {...field} data-testid="input-confirm-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gstin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="22AAAAA0000A1Z5" {...field} data-testid="input-gstin" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Address (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street, City" {...field} data-testid="input-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" size="lg" disabled={isLoading || !otpVerified || phoneExists} data-testid="button-signup">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/signin" className="text-primary font-medium hover:underline" data-testid="link-signin">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
