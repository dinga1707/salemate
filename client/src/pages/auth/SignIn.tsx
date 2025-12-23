import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Single schema for both modes
const authSchema = z.object({
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  password: z.string().min(1, "Password is required"),
});

type AuthFormData = z.infer<typeof authSchema>;

export default function SignIn() {
  const [, setLocation] = useLocation();
  const { signin } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [savedUser, setSavedUser] = useState<{
    phone: string;
    name: string;
    logo?: string;
    ownerPhoto?: string;
  } | null>(null);
  const [isQuickLogin, setIsQuickLogin] = useState(false);

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: { phone: "", password: "" },
  });

  // Load saved user on mount
  useEffect(() => {
    const stored = localStorage.getItem("lastUser");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setSavedUser(user);
        setIsQuickLogin(true);
        // Pre-fill the hidden phone field
        form.setValue("phone", user.phone);
      } catch (e) {
        localStorage.removeItem("lastUser");
      }
    }
  }, [form]);

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true);
    try {
      await signin(data);
      toast({ title: "Welcome back!", description: "Signed in successfully." });
      setLocation("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: error.message || "Invalid credentials",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchUser = () => {
    localStorage.removeItem("lastUser");
    setSavedUser(null);
    setIsQuickLogin(false);
    form.reset({ phone: "", password: "" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {isQuickLogin && savedUser ? (
            <>
              <div className="mx-auto mb-4">
                <Avatar className="h-20 w-20 mx-auto">
                  <AvatarImage src={savedUser.ownerPhoto || savedUser.logo} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {savedUser.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-2xl">
                Welcome back, {savedUser.name}
              </CardTitle>
              <CardDescription>+91 {savedUser.phone}</CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4">
                <img
                  src="/assets/salemate-logo.png"
                  alt="Salemate"
                  className="h-16 w-16 mx-auto"
                />
              </div>
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <CardDescription>
                Enter your details to access your account
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Phone Field: Only show if NOT quick login */}
              {!isQuickLogin && (
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
                            {...field}
                            className="rounded-l-none"
                            placeholder="9876543210"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Password Field: Always show */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••"
                        autoComplete="current-password"
                        autoFocus={isQuickLogin}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          {isQuickLogin && (
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={handleSwitchUser}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign in as different user
            </Button>
          )}
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="text-primary font-medium hover:underline"
            >
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
