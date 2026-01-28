'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Check,
  Dumbbell,
  Ticket,
  Loader2,
  ShoppingBag,
  Infinity as InfinityIcon,
  Clock,
  Sparkles,
} from 'lucide-react';

interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  priceAmount: number;
  priceCurrency: string;
  billingInterval: string;
  bonusCount: number;
  guestPasses: number;
  features: string[];
  isCurrent: boolean;
}

interface PassProduct {
  id: string;
  name: string;
  description: string | null;
  priceAmount: number;
  type: 'CLASS_PACK' | 'DROP_IN' | 'COMBO';
  bonusCount: number | null;
  validityDays: number | null;
}

const BILLING_LABELS: Record<string, string> = {
  WEEKLY: '/week',
  MONTHLY: '/month',
  QUARTERLY: '/quarter',
  YEARLY: '/year',
};

const TYPE_LABELS: Record<string, string> = {
  CLASS_PACK: 'Classes',
  DROP_IN: 'Open Gym',
  COMBO: 'Both',
};

const TYPE_COLORS: Record<string, string> = {
  CLASS_PACK: 'bg-indigo-100 text-indigo-700',
  DROP_IN: 'bg-emerald-100 text-emerald-700',
  COMBO: 'bg-purple-100 text-purple-700',
};

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function ShopPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [products, setProducts] = useState<PassProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [plansRes, productsRes] = await Promise.all([
        fetch('/api/portal/plans'),
        fetch('/api/portal/products'),
      ]);

      const [plansData, productsData] = await Promise.all([
        plansRes.json(),
        productsRes.json(),
      ]);

      if (plansData.success) {
        setPlans(plansData.data);
      }
      if (productsData.success) {
        setProducts(productsData.data);
      }
    } catch {
      setError('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchasePass = async (productId: string, productName: string) => {
    setPurchaseLoading(productId);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/portal/products/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage(`Successfully purchased "${productName}"! Check your Membership page to see your new pass.`);
        // Refresh data
        fetchData();
      } else {
        setError(data.error?.message || 'Failed to purchase');
      }
    } catch {
      setError('Failed to process purchase');
    } finally {
      setPurchaseLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShoppingBag className="h-8 w-8" />
          Shop
        </h1>
        <p className="text-muted-foreground mt-1">
          Browse membership plans and passes
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="h-5 w-5" />
          {successMessage}
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-emerald-600 hover:text-emerald-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Membership Plans */}
      {plans.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Membership Plans
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative ${plan.isCurrent ? 'ring-2 ring-primary' : ''}`}
              >
                {plan.isCurrent && (
                  <div className="absolute -top-3 left-4">
                    <Badge className="bg-primary">Current Plan</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.description && (
                    <CardDescription>{plan.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      {formatCurrency(Number(plan.priceAmount), plan.priceCurrency)}
                    </span>
                    <span className="text-muted-foreground">
                      {BILLING_LABELS[plan.billingInterval] || '/month'}
                    </span>
                  </div>

                  {/* Bonuses */}
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">
                        {plan.bonusCount === -1 ? 'Unlimited' : plan.bonusCount} Bonuses
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {plan.bonusCount === -1 ? 'Book as many classes as you want' : 'Per billing period'}
                      </p>
                    </div>
                    {plan.bonusCount === -1 && (
                      <InfinityIcon className="h-6 w-6 text-primary ml-auto" />
                    )}
                  </div>

                  {/* Guest Passes */}
                  {plan.guestPasses > 0 && (
                    <p className="text-sm text-muted-foreground">
                      + {plan.guestPasses} guest pass{plan.guestPasses > 1 ? 'es' : ''} per month
                    </p>
                  )}

                  {/* Features */}
                  {plan.features && plan.features.length > 0 && (
                    <div className="space-y-2">
                      {(plan.features as string[]).slice(0, 4).map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action */}
                  <Button
                    className="w-full"
                    disabled={plan.isCurrent}
                    variant={plan.isCurrent ? 'secondary' : 'default'}
                  >
                    {plan.isCurrent ? 'Your Current Plan' : 'Contact Us to Switch'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Passes / Class Packs */}
      {products.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Passes & Class Packs
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card key={product.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{product.name}</CardTitle>
                      {product.description && (
                        <CardDescription>{product.description}</CardDescription>
                      )}
                    </div>
                    <Badge className={TYPE_COLORS[product.type]}>
                      {TYPE_LABELS[product.type]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Price */}
                  <div className="text-3xl font-bold">
                    {formatCurrency(Number(product.priceAmount))}
                  </div>

                  {/* Bonuses */}
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{product.bonusCount} Bonuses</p>
                      <p className="text-sm text-muted-foreground">
                        {product.type === 'DROP_IN'
                          ? 'For open gym sessions'
                          : product.type === 'CLASS_PACK'
                            ? 'For class bookings'
                            : 'For classes or open gym'}
                      </p>
                    </div>
                  </div>

                  {/* Validity */}
                  {product.validityDays && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Valid for {product.validityDays} days after purchase
                    </div>
                  )}
                  {!product.validityDays && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <InfinityIcon className="h-4 w-4" />
                      Never expires
                    </div>
                  )}

                  {/* Buy Button */}
                  <Button
                    className="w-full"
                    onClick={() => handlePurchasePass(product.id, product.name)}
                    disabled={purchaseLoading === product.id}
                  >
                    {purchaseLoading === product.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        Buy Now
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {plans.length === 0 && products.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Products Available</h3>
            <p className="text-muted-foreground text-center">
              There are no membership plans or passes available at the moment.
              Please check back later.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
