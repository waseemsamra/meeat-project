"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import Link from "next/link";

export default function PaymentGatewayPage() {
  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto bg-primary/10 rounded-full h-16 w-16 flex items-center justify-center">
            <CreditCard className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline mt-4">
            Payment Gateway
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This is a placeholder page. In a real application, this is where
            you would be redirected to your payment provider (like Stripe or
            PayPal) to complete your purchase.
          </p>
          <Button asChild className="mt-8 w-full" size="lg">
            <Link href="/checkout">Return to Checkout</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
