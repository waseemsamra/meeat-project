
'use client';

import { useParams, notFound } from 'next/navigation';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc, collection, query, where, getDocs, documentId } from 'firebase/firestore';
import type { Order, OrderItem, Product } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { getPlaceholderImage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import printJS from 'print-js';
import { useSettings } from '@/hooks/useSettings';

function OrderDetailsSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-1/3" />
      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { defaultCurrency } = useSettings();
  const currencySymbol = defaultCurrency?.symbol || '$';

  const orderRef = useMemo(
    () => (firestore && user?.id && orderId ? doc(firestore, `users/${user.id}/orders`, orderId) : null),
    [firestore, user?.id, orderId]
  );
  const { data: order, isLoading: isLoadingOrder, error } = useDoc<Order>(orderRef);
  
  const [orderItemsWithProducts, setOrderItemsWithProducts] = useState<OrderItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);

  useEffect(() => {
    async function fetchProductDetails() {
      if (!firestore || !order || !order.orderItemIds || order.orderItemIds.length === 0) {
        setOrderItemsWithProducts([]);
        setIsLoadingItems(false);
        return;
      }

      setIsLoadingItems(true);
      
      const productIds = Array.from(new Set(order.orderItemIds.map(item => item.productId)));

      if (productIds.length > 0) {
        const productsRef = collection(firestore, 'products');
        const productsQuery = query(productsRef, where(documentId(), 'in', productIds));
        const productSnapshots = await getDocs(productsQuery);
        const productsMap = new Map(productSnapshots.docs.map(doc => [doc.id, doc.data() as Product]));
        
        const enrichedItems = order.orderItemIds.map(item => ({
            ...item,
            product: productsMap.get(item.productId)
        }));

        setOrderItemsWithProducts(enrichedItems as OrderItem[]);
      } else {
        setOrderItemsWithProducts(order.orderItemIds as OrderItem[]);
      }

      setIsLoadingItems(false);
    }

    fetchProductDetails();
  }, [order, firestore]);

  const isLoading = isUserLoading || isLoadingOrder || isLoadingItems;
  
  if (!isLoading && !order) {
    notFound();
  }
  
  const handlePrint = () => {
    printJS({
      printable: 'order-details-to-print',
      type: 'html',
      scanStyles: true,
      documentTitle: `Order-${order?.id.substring(0, 8)}`,
      targetStyles: ['*'],
      style: `@page { size: A4; margin: 0; } body { -webkit-print-color-adjust: exact; }`
    });
  };

  return (
    <div className="container mx-auto px-4 py-12">
       {isLoading ? (
         <OrderDetailsSkeleton />
       ) : order ? (
        <>
          <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4 no-print">
            <div>
              <h1 className="text-4xl font-bold font-headline">Order Details</h1>
              <p className="text-muted-foreground text-sm">
                Order #{order.id.substring(0, 8)} &bull; Placed on{' '}
                {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-4">
                <Badge variant={order.fulfillmentStatus === 'shipped' ? 'default' : 'secondary'} className="capitalize text-base px-4 py-2">
                    {order.fulfillmentStatus}
                </Badge>
                <Button onClick={handlePrint} variant="outline">
                    <Printer className="mr-2 h-4 w-4" />
                    Print Order
                </Button>
            </div>
          </div>
          
          <div id="order-details-to-print">
            <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-2">
                <Card>
                    <CardHeader>
                    <CardTitle>Order Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orderItemsWithProducts.map((item: any) => (
                            <TableRow key={item.id}>
                            <TableCell>
                                <div className="flex items-center gap-4">
                                    <div className="hidden sm:block relative w-16 h-16 rounded-md bg-muted flex-shrink-0">
                                        {item.product && item.product.images?.[0] ? (
                                            <Image
                                                src={getPlaceholderImage(item.product.images[0])}
                                                alt={item.product.name || 'Product Image'}
                                                fill
                                                className="object-contain"
                                                data-ai-hint={`${item.product.category?.toLowerCase() || ''} ${item.product.cutType?.toLowerCase() || ''}`}
                                            />
                                        ) : <Skeleton className="h-16 w-16 rounded-md" />}
                                    </div>
                                <div>
                                    <p className="font-medium">
                                        {item.product ? (
                                            <Link href={`/products/${item.product.slug}`} className="hover:underline">{item.product.name}</Link>
                                        ) : 'Product information unavailable'}
                                    </p>
                                    <div className="text-sm text-muted-foreground">
                                        <p>{item.selectedUnit}</p>
                                        {item.selectedStyle && <p>Style: {item.selectedStyle}</p>}
                                        {item.selectedRub && <p>Rub: {item.selectedRub}</p>}
                                    </div>
                                </div>
                                </div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell className="text-right">{currencySymbol}{item.price.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">
                                {currencySymbol}{(item.price * item.quantity).toFixed(2)}
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    </CardContent>
                </Card>
                </div>

                <div className="space-y-8">
                <Card>
                    <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{currencySymbol}{order.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>{currencySymbol}0.00</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Taxes</span>
                        <span>{currencySymbol}0.00</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>{currencySymbol}{order.total.toFixed(2)}</span>
                    </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                    <CardTitle>Shipping Address</CardTitle>
                    </CardHeader>
                    <CardContent>
                    {order.shippingAddress ? (
                        <div className="text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">{order.shippingAddress.fullName}</p>
                        <p>{order.shippingAddress.street}</p>
                        <p>
                            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                        </p>
                        <p>{order.shippingAddress.country}</p>
                        </div>
                    ) : "No address provided."}
                    </CardContent>
                </Card>
                </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
