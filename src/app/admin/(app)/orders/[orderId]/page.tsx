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
import { useToast } from '@/hooks/use-toast';

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
  const fromCustomerReport = searchParams.get('from') === 'customer-report';
  const firestore = useFirestore();
  const { t } = useTranslation();
  const { toast } = useToast();

  const orderRef = useMemo(() => {
    if (!firestore || !orderId) return null;
    return doc(firestore, 'orders', orderId);
  }, [firestore, orderId]);
  
  const { data: order, isLoading: isLoadingOrder, error } = useDoc<Order>(orderRef);

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [shipdayDetails, setShipdayDetails] = useState<ShipdayOrderDetails | null>(null);
  const [isLoadingShipday, setIsLoadingShipday] = useState(false);
  const [shipdayError, setShipdayError] = useState<string | null>(null);

  useEffect(() => {
    if (order?.shipdayOrderId) {
        setIsLoadingShipday(true);
        setShipdayError(null);
        getShipdayOrderDetails({ shipdayOrderId: order.shipdayOrderId })
            .then(result => {
                if (result.success && result.details) {
                    setShipdayDetails(result.details);
                } else {
                    setShipdayError(result.errorMessage || 'An error occurred while fetching data from Shipday.');
                }
            })
            .catch(err => {
                setShipdayError('Could not communicate with the server to get delivery details.');
            })
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
        const o = order as any;
        // Compatibility: Mobile app uses 'items', Web app uses 'orderItemIds'
        const rawItems = o.orderItemIds || o.items || [];
        
        // If items are in mobile format (with embedded product data)
        if (o.items && !o.orderItemIds) {
             const mappedItems = o.items.map((item: any, index: number) => ({
                 id: `mobile-item-${index}`,
                 productId: item.productId || 'N/A',
                 quantity: item.Quantity || item.quantity || 1,
                 price: item.Price || item.price || 0,
                 selectedUnit: item.unit || 'Unit',
                 product: {
                     name: { en: item.Name || item.name || 'Unknown' },
                     images: [item.imageUrl || ''],
                     category: item.category || '',
                     cutType: item.cutType || '',
                 }
             }));
             setOrderItems(mappedItems);
             setIsLoadingItems(false);
             return;
        }

        const productIds = [...new Set(rawItems.map((item: any) => item.productId))];
        if (productIds.length > 0) {
            const productsRef = collection(firestore, 'products');
            const productsQuery = query(productsRef, where(documentId(), 'in', productIds));
            const productsSnapshot = await getDocs(productsQuery);
            const productsData = productsSnapshot.docs.map(
              (d) => ({ ...d.data(), id: d.id } as Product)
            );
            
            const itemsWithProducts = rawItems.map((item: any) => ({
                ...item,
                product: productsData.find(p => p.id === item.productId)
            }));

            setOrderItems(itemsWithProducts as OrderItem[]);
        } else {
             setOrderItems(rawItems as OrderItem[]);
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
    router.back();
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <OrderDetailsSkeleton />
      </div>
    );
  }

  if (!order) {
    return notFound();
  }

  const o = order as any;
  const totalDisplay = typeof o.total === 'number' ? o.total : (o.Total ? parseFloat(o.Total.replace(/[^0-9.]/g, '')) : 0);
  const statusDisplay = o.fulfillmentStatus || (o.Status ? o.Status.toLowerCase() : 'processing');
  const dateDisplay = o.createdAt || o.date || o.Date;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4 no-print">
        <div>
          <h1 className="text-4xl font-bold font-headline">Order Details</h1>
          <p className="text-muted-foreground text-sm">
            Order #{o.orderNumber || order.id.substring(0, 8)} &bull; Placed on{' '}
            {dateDisplay ? new Date(dateDisplay).toLocaleDateString() : 'N/A'}
          </p>
        </div>
         <div className="flex items-center gap-4">
            <Button onClick={handleGoBack} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
            <Badge variant={statusDisplay === 'delivered' ? 'default' : 'secondary'} className="capitalize">{statusDisplay}</Badge>
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
                    {orderItems.map((item, index) => (
                        <TableRow key={item.id || index}>
                        <TableCell>
                            <div className="flex items-center gap-4">
                                <div className="relative hidden sm:block bg-muted w-16 h-16 rounded-md flex-shrink-0">
                                {item.product && item.product.images && item.product.images[0] && (
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
                                        <span className="font-semibold">{t(item.product.name)}</span>
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
                    <span>${totalDisplay.toFixed(2)}</span>
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
                    <span>${totalDisplay.toFixed(2)}</span>
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
                ) : <p className="text-muted-foreground text-sm italic">No address provided.</p>}
                </CardContent>
            </Card>
            </div>
        </div>
        
        {order.shipdayOrderId && (
            <ShipdayDetailsCard details={shipdayDetails} isLoading={isLoadingShipday} error={shipdayError} />
        )}
      </div>
    </div>
  );
}
