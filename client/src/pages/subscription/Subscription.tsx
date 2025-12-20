import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Check, Crown, Zap, Building2, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";

const PLAN_FEATURES = {
  FREE: {
    icon: Zap,
    color: "text-muted-foreground",
    features: [
      "10 bills per month",
      "1 user login",
      "1 invoice template",
      "Basic inventory",
    ],
  },
  BASIC: {
    icon: Crown,
    color: "text-blue-500",
    features: [
      "Unlimited bills",
      "1 user login",
      "1 invoice template",
      "Proforma invoices",
      "Stock transfers",
    ],
  },
  PRO: {
    icon: Crown,
    color: "text-purple-500",
    features: [
      "Unlimited bills",
      "4 user logins",
      "Unlimited templates",
      "Proforma invoices",
      "Stock transfers",
      "Priority support",
    ],
  },
  ENTERPRISE: {
    icon: Building2,
    color: "text-orange-500",
    features: [
      "Unlimited bills",
      "Unlimited logins",
      "Unlimited templates",
      "Proforma invoices",
      "Stock transfers",
      "GST filing support",
      "Dedicated support",
    ],
  },
};

export default function Subscription() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [location] = useLocation();
  const [yearly, setYearly] = useState(false);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => api.subscription.getPlans(),
  });

  const { data: currentSub } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: () => api.subscription.current(),
  });

  const checkoutMutation = useMutation({
    mutationFn: (priceId: string) => api.subscription.checkout(priceId),
    onSuccess: (data: any) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to start checkout",
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => api.subscription.portal(),
    onSuccess: (data: any) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to open portal",
      });
    },
  });

  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  if (searchParams.get('success') === 'true') {
    toast({
      title: "Payment Successful",
      description: "Your subscription has been activated!",
    });
  }

  const currentPlan = user?.plan || 'FREE';

  const handleUpgrade = (plan: any) => {
    const price = plan.prices.find((p: any) => 
      yearly ? p.recurring?.interval === 'year' : p.recurring?.interval === 'month'
    );
    if (price) {
      checkoutMutation.mutate(price.id);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
        <p className="text-muted-foreground">
          Choose the plan that best fits your business needs
        </p>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Label htmlFor="billing-toggle" className={!yearly ? 'font-semibold' : ''}>Monthly</Label>
        <Switch
          id="billing-toggle"
          checked={yearly}
          onCheckedChange={setYearly}
          data-testid="switch-billing-toggle"
        />
        <Label htmlFor="billing-toggle" className={yearly ? 'font-semibold' : ''}>
          Yearly <Badge variant="secondary" className="ml-1">Save 17%</Badge>
        </Label>
      </div>

      {currentPlan !== 'FREE' && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => portalMutation.mutate()}
            disabled={portalMutation.isPending}
            data-testid="button-manage-subscription"
          >
            {portalMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Manage Subscription
          </Button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className={`relative ${currentPlan === 'FREE' ? 'border-primary' : ''}`}>
          {currentPlan === 'FREE' && (
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Current Plan</Badge>
          )}
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Free</CardTitle>
            </div>
            <CardDescription>For trying out Salemate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">
              ₹0 <span className="text-sm font-normal text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-2 text-sm">
              {PLAN_FEATURES.FREE.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>
              {currentPlan === 'FREE' ? 'Current Plan' : 'Downgrade'}
            </Button>
          </CardFooter>
        </Card>

        {plansLoading ? (
          <div className="col-span-3 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          plans?.map((plan: any) => {
            const planKey = plan.metadata?.plan as keyof typeof PLAN_FEATURES;
            const features = PLAN_FEATURES[planKey] || PLAN_FEATURES.BASIC;
            const Icon = features.icon;
            const price = plan.prices.find((p: any) => 
              yearly ? p.recurring?.interval === 'year' : p.recurring?.interval === 'month'
            );
            const isCurrentPlan = currentPlan === planKey;

            return (
              <Card 
                key={plan.id} 
                className={`relative ${isCurrentPlan ? 'border-primary' : ''} ${planKey === 'PRO' ? 'border-purple-500 shadow-lg' : ''}`}
              >
                {isCurrentPlan && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Current Plan</Badge>
                )}
                {planKey === 'PRO' && !isCurrentPlan && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500">Most Popular</Badge>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${features.color}`} />
                    <CardTitle>{plan.name.replace(' Plan', '')}</CardTitle>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold">
                    {price ? formatPrice(price.unit_amount) : '—'}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{yearly ? 'year' : 'month'}
                    </span>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {features.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className={`w-full ${planKey === 'PRO' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                    onClick={() => handleUpgrade(plan)}
                    disabled={isCurrentPlan || checkoutMutation.isPending}
                    data-testid={`button-upgrade-${planKey.toLowerCase()}`}
                  >
                    {checkoutMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {isCurrentPlan ? 'Current Plan' : 'Upgrade'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
