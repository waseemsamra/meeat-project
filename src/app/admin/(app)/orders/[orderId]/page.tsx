

'use client';

import { useParams, notFound, useSearchParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore } from '@/firebase';
import {
  collection,
  doc,
  query,
  where,
  getDocs,
  documentId,
} from 'firebase/firestore';
import type { Order, OrderItem, Product, ShipdayOrderDetails } from '@/lib/types';
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
import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { getPlaceholderImage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import printJS from 'print-js';
import { getShipdayOrderDetails } from '@/ai/flows/get-shipday-order-details';
import { ShipdayDetailsCard } from '@/components/admin/orders/ShipdayDetailsCard';
import { useTranslation } from '@/hooks/useTranslation';

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

export default function AdminOrderDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const userId = searchParams.get('userId');
  const fromCustomerReport = searchParams.get('from') === 'customer-report';
  const firestore = useFirestore();
  const { t } = useTranslation();

  const orderRef = useMemo(() => {
    if (!firestore || !orderId || !userId) return null;
    return doc(firestore, `users/${userId}/orders`, orderId);
  }, [firestore, orderId, userId]);
  
  const { data: order, isLoading: isLoadingOrder, error } = useDoc<Order>(orderRef);

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [shipdayDetails, setShipdayDetails] = useState<ShipdayOrderDetails | null>(null);
  const [isLoadingShipday, setIsLoadingShipday] = useState(false);

  useEffect(() => {
    if (order?.shipdayOrderId) {
        setIsLoadingShipday(true);
        getShipdayOrderDetails({ shipdayOrderId: order.shipdayOrderId })
            .then(details => setShipdayDetails(details))
            .catch(err => console.error("Failed to fetch shipday details", err))
            .finally(() => setIsLoadingShipday(false));
    }
  }, [order]);

  useEffect(() => {
    async function fetchOrderItems() {
      if (!firestore || !order) {
        setIsLoadingItems(false);
        return;
      }
      setIsLoadingItems(true);
      try {
        const productIds = [...new Set(order.orderItemIds.map((item: any) => item.productId))];
        if (productIds.length > 0) {
            const productsRef = collection(firestore, 'products');
            const productsQuery = query(productsRef, where(documentId(), 'in', productIds));
            const productsSnapshot = await getDocs(productsQuery);
            const productsData = productsSnapshot.docs.map(
              (d) => ({ ...d.data(), id: d.id } as Product)
            );
            
            const itemsWithProducts = order.orderItemIds.map((item: any) => ({
                ...item,
                product: productsData.find(p => p.id === item.productId)
            }));

            setOrderItems(itemsWithProducts as OrderItem[]);
        } else {
             setOrderItems(order.orderItemIds as OrderItem[]);
        }

      } catch (error) {
        console.error('Error fetching order items:', error);
      } finally {
        setIsLoadingItems(false);
      }
    }

    fetchOrderItems();
  }, [order, firestore]);

  const isLoading = isLoadingOrder || isLoadingItems;
  
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
  
  const handleGoBack = () => {
    if (userId) {
        router.push(`/admin/reporting/customers/${userId}`);
    } else {
        router.back();
    }
  }

  if (!userId && !isLoading) {
    return (
        <div className="container mx-auto px-4 py-12 text-center">
            <h1 className="text-2xl font-bold">Invalid Order Link</h1>
            <p className="text-muted-foreground mt-2">The user ID is missing from the URL. Please go back to the orders list and try again.</p>
        </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <OrderDetailsSkeleton />
      </div>
    );
  }

  if (!order) {
    // If there was a docRef but no order and not loading, it's a 404
    return notFound();
  }


  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4 no-print">
        <div>
          <h1 className="text-4xl font-bold font-headline">Order Details</h1>
          <p className="text-muted-foreground text-sm">
            Order #{order.id.substring(0, 8)} &bull; Placed on{' '}
            {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>
         <div className="flex items-center gap-4">
            <Button onClick={handleGoBack} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Report
            </Button>
            <Badge variant={order.fulfillmentStatus === 'delivered' ? 'default' : 'secondary'} className="capitalize">{order.fulfillmentStatus}</Badge>
            <Button onClick={handlePrint} variant="outline">
                <Printer className="mr-2 h-4 w-4" />
                Print Order
            </Button>
        </div>
      </div>
        
      <div id="order-details-to-print" className="space-y-8">
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
                    {orderItems.map((item) => (
                        <TableRow key={item.id}>
                        <TableCell>
                            <div className="flex items-center gap-4">
                                <div className="relative hidden sm:block bg-muted w-16 h-16 rounded-md flex-shrink-0">
                                {item.product && item.product.images && (
                                    <Image
                                        src={getPlaceholderImage(item.product.images[0])}
                                        alt={t(item.product.name)}
                                        fill
                                        className="object-contain"
                                        data-ai-hint={`${item.product.category.toLowerCase()} ${item.product.cutType.toLowerCase()}`}
                                    />
                                )}
                                </div>
                            <div>
                                <p className="font-medium">
                                    {item.product ? (
                                        <Link href={`/products/${item.product.slug}`} className="hover:underline">{t(item.product.name)}</Link>
                                    ) : 'Product not found'}
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
                        <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">
                            ${(item.price * item.quantity).toFixed(2)}
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
                    <span>${order.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>$0.00</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxes</span>
                    <span>$0.00</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${order.total.toFixed(2)}</span>
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
        
        {order.shipdayOrderId && (
            <ShipdayDetailsCard details={shipdayDetails} isLoading={isLoadingShipday} />
        )}
      </div>
    </div>
  );
}
