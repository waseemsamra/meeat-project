
'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDoc, useFirestore, useUser } from '@/firebase';
import type { Order } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSettings } from '@/hooks/useSettings';

function ConfirmationPageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-12 text-center max-w-4xl">
            <Skeleton className="h-12 w-full mb-8" />
            <div className="grid grid-cols-4 gap-8 mb-8">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
            <Skeleton className="h-12 w-full mb-12" />
            <Skeleton className="h-8 w-1/3 mx-auto mb-8" />
            <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
    )
}

const getPaymentMethodDescription = (method?: Order['paymentMethod']) => {
    switch (method) {
        case 'direct-bank-transfer':
            return 'Please make your payment directly into our bank account.';
        case 'cash-on-delivery':
            return 'Pay with cash upon delivery.';
        case 'card-payments':
            return 'Your card will be charged shortly.';
        case 'paypal':
            return 'Your order will be processed once payment is confirmed by PayPal.';
        default:
            return 'Payment details will be confirmed via email.';
    }
}

const getPaymentMethodName = (method?: Order['paymentMethod']) => {
    switch (method) {
        case 'direct-bank-transfer': return 'Direct bank transfer';
        case 'cash-on-delivery': return 'Cash on delivery';
        case 'card-payments': return 'Card Payment';
        case 'paypal': return 'PayPal';
        default: return 'N/A';
    }
}

export function ConfirmationPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const firestore = useFirestore();
  const { user } = useUser();
  const { defaultCurrency } = useSettings();
  const currencySymbol = defaultCurrency?.symbol || '$';

  const orderRef = useMemo(() => {
    if (!firestore || !user?.id || !orderId) return null;
    return doc(firestore, `users/${user.id}/orders`, orderId);
  }, [firestore, user?.id, orderId]);

  const { data: order, isLoading } = useDoc<Order>(orderRef);
  const shippingFee = 10.00; // As per design

  if (isLoading) {
    return <ConfirmationPageSkeleton />;
  }

  if (!orderId || !order) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <p className="text-muted-foreground mt-2">We couldn't find the details for this order. Please check your account for your order history.</p>
        <Button asChild className="mt-6">
            <Link href="/account/orders">View My Orders</Link>
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 font-body text-foreground">
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 text-center py-4 mb-8">
            <p className="text-lg">Thank you. Your order has been received.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center border-b pb-8 mb-8">
            <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Order number:</p>
                <p className="font-bold text-lg mt-1">{order.id.substring(0, 8).toUpperCase()}</p>
            </div>
             <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Date:</p>
                <p className="font-bold text-lg mt-1">{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
             <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Total:</p>
                <p className="font-bold text-lg mt-1">{currencySymbol}{order.total.toFixed(2)}</p>
            </div>
             <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Payment method:</p>
                <p className="font-bold text-lg mt-1">{getPaymentMethodName(order.paymentMethod)}</p>
            </div>
        </div>

        <div className="bg-muted text-center py-4 rounded-md mb-12">
            <p>{getPaymentMethodDescription(order.paymentMethod)}</p>
        </div>

        <div className="text-center mb-8">
            <h2 className="text-2xl font-headline tracking-widest text-primary">ORDER DETAILS</h2>
        </div>

        <div className="border-b">
            <div className="flex justify-between items-center py-4">
                <h3 className="font-bold uppercase tracking-wider">Product</h3>
                <h3 className="font-bold uppercase tracking-wider">Total</h3>
            </div>

            {order.orderItemIds.map(item => (
                <div key={item.id} className="flex justify-between items-start py-4 border-t text-muted-foreground">
                    <div>
                        <p className="text-foreground">{item.product?.name || `Item ID: ${item.productId}`} &times; {item.quantity}</p>
                        <div className="text-xs">
                            {item.selectedUnit && <p>Unit: {item.selectedUnit}</p>}
                            {item.selectedStyle && <p>Style: {item.selectedStyle}</p>}
                            {item.selectedRub && <p>Rub: {item.selectedRub}</p>}
                        </div>
                    </div>
                    <p className="font-semibold text-foreground">{currencySymbol}{(item.price * item.quantity).toFixed(2)}</p>
                </div>
            ))}
        </div>
        
        <div className="space-y-4 py-4 border-b">
             <div className="flex justify-between items-center">
                <p className="text-muted-foreground">Subtotal:</p>
                <p className="font-semibold">{currencySymbol}{(order.total - shippingFee).toFixed(2)}</p>
            </div>
            <div className="flex justify-between items-center">
                <p className="text-muted-foreground">Shipping:</p>
                <p>{currencySymbol}{shippingFee.toFixed(2)} via Flat rate</p>
            </div>
            <div className="flex justify-between items-center">
                <p className="text-muted-foreground">Payment method:</p>
                <p>{getPaymentMethodName(order.paymentMethod)}</p>
            </div>
        </div>
         <div className="flex justify-between items-center py-4 text-xl font-bold">
            <p>Total:</p>
            <p>{currencySymbol}{order.total.toFixed(2)}</p>
        </div>
    </div>
  );
}
