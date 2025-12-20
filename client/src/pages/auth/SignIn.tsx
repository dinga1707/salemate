import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Store, Loader2, User, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SavedUser {
  phone: string;
  name: string;
  shopPhoto?: string;
}

const signinSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  password: z.string().min(1, "Password is required"),
});

const quickLoginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

type SigninFormData = z.infer<typeof signinSchema>;
type QuickLoginFormData = z.infer<typeof quickLoginSchema>;

export default function SignIn() {
  const [, setLocation] = useLocation();
  const { signin } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [savedUser, setSavedUser] = useState<SavedUser | null>(null);
  const [showFullLogin, setShowFullLogin] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("lastUser");
    if (stored) {
      try {
        setSavedUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("lastUser");
      }
    }
  }, []);

  const form = useForm<SigninFormData>({
    resolver: zodResolver(signinSchema),
    defaultValues: {
      phone: "",
      password: "",
    },
  });

  const quickForm = useForm<QuickLoginFormData>({
    resolver: zodResolver(quickLoginSchema),
    defaultValues: {
      password: "",
    },
  });

  const onSubmit = async (data: SigninFormData) => {
    setIsLoading(true);
    try {
      await signin(data);
      toast({ title: "Welcome back!", description: "You have signed in successfully." });
      setLocation("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sign In Failed", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const onQuickLogin = async (data: QuickLoginFormData) => {
    if (!savedUser) return;
    setIsLoading(true);
    try {
      await signin({ phone: savedUser.phone, password: data.password });
      toast({ title: "Welcome back!", description: "You have signed in successfully." });
      setLocation("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sign In Failed", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchUser = () => {
    localStorage.removeItem("lastUser");
    setSavedUser(null);
    setShowFullLogin(true);
  };

  if (savedUser && !showFullLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Avatar className="h-20 w-20 mx-auto">
                {savedUser.shopPhoto ? (
                  <AvatarImage src={savedUser.shopPhoto} alt={savedUser.name} />
                ) : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {savedUser.name?.charAt(0)?.toUpperCase() || <User className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription className="space-y-1">
              <div className="font-medium text-foreground" data-testid="text-saved-user-name">{savedUser.name}</div>
              <div className="text-sm" data-testid="text-saved-user-phone">+91 {savedUser.phone}</div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...quickForm}>
              <form onSubmit={quickForm.handleSubmit(onQuickLogin)} className="space-y-4">
                <FormField
                  control={quickForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your password" {...field} data-testid="input-quick-password" autoFocus />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" size="lg" disabled={isLoading} data-testid="button-quick-signin">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground" 
              onClick={handleSwitchUser}
              data-testid="button-switch-user"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign in as different user
            </Button>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary font-medium hover:underline" data-testid="link-signup">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
            <Store className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your Salemate account</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              <Button type="submit" className="w-full" size="lg" disabled={isLoading} data-testid="button-signin">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/signup" className="text-primary font-medium hover:underline" data-testid="link-signup">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
