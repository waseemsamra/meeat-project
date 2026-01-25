'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { useDoc, useFirestore, useCollection } from '@/firebase';
import { doc, collection, query, where, getDocs, collectionGroup } from 'firebase/firestore';
import type { DeliveryChallan, Order, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MeeatLogo } from '@/components/icons';
import { Printer } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import printJS from 'print-js';
import { useTranslation } from '@/hooks/useTranslation';


function DeliveryNoteSkeleton() {
    return (
        <div className="p-4 sm:p-6 md:p-8">
            <Card className="max-w-4xl mx-auto">
                <CardHeader className="grid grid-cols-2">
                    <div><Skeleton className="h-12 w-32" /></div>
                    <div className="text-right space-y-2">
                        <Skeleton className="h-8 w-48 ml-auto" />
                        <Skeleton className="h-4 w-32 ml-auto" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="grid grid-cols-2">
                        <div className="space-y-1">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="text-right space-y-1">
                            <Skeleton className="h-4 w-24 ml-auto" />
                            <Skeleton className="h-4 w-28 ml-auto" />
                        </div>
                    </div>
                    <Skeleton className="h-40 w-full" />
                </CardContent>
                <CardFooter><Skeleton className="h-10 w-28 ml-auto" /></CardFooter>
            </Card>
        </div>
    )
}

export default function DeliveryNotePage() {
  const params = useParams();
  const deliveryId = params.deliveryId as string;
  const firestore = useFirestore();
  const { t } = useTranslation();

  const deliveryRef = useMemo(() => (firestore && deliveryId ? doc(firestore, 'deliveries', deliveryId) : null), [firestore, deliveryId]);
  const { data: delivery, isLoading: isLoadingDelivery } = useDoc<DeliveryChallan>(deliveryRef);
  
  const allOrdersQuery = useMemo(() => firestore ? query(collectionGroup(firestore, 'orders')) : null, [firestore]);
  const { data: allOrders, isLoading: isLoadingAllOrders } = useCollection<Order>(allOrdersQuery);
  
  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<User | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  
  const handlePrint = () => {
    printJS({
        printable: 'delivery-note-to-print',
        type: 'html',
        scanStyles: true,
        documentTitle: `DeliveryNote-${delivery?.id.substring(0,8)}`,
        targetStyles: ['*'],
        style: `@page { size: A4; margin: 0; } body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center;}`
    });
  }

  useEffect(() => {
    async function fetchDetails() {
        if (!firestore || !delivery || !allOrders) {
            if (!isLoadingDelivery && !isLoadingAllOrders) {
                setIsLoadingDetails(false);
            }
            return;
        }

        setIsLoadingDetails(true);

        const currentOrder = allOrders.find(o => o.id === delivery.orderId) || null;
        setOrder(currentOrder);

        if (currentOrder?.userId) {
            const userDocRef = doc(firestore, 'users', currentOrder.userId);
            const userDoc = await getDocs(query(collection(firestore, 'users'), where('id', '==', currentOrder.userId)));
            if (!userDoc.empty) {
                setCustomer(userDoc.docs[0].data() as User);
            }
        }
        
        setIsLoadingDetails(false);
    }

    fetchDetails();

  }, [delivery, allOrders, firestore, isLoadingAllOrders, isLoadingDelivery]);
  
  
  const isLoading = isLoadingDelivery || isLoadingDetails;

  if (isLoading) {
    return (
        <div className="p-4 sm:p-6 md:p-8 flex items-center justify-center">
            <DeliveryNoteSkeleton />
        </div>
    );
  }

  if (!delivery || !order) {
    return notFound();
  }

  return (
    <div className="bg-background p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center">
        <div id="delivery-note-to-print" className="w-full max-w-4xl bg-white print:bg-white print:m-0 print:shadow-none print:border-none">
            <Card className="my-auto shadow-lg print:shadow-none print:border-none">
                <CardHeader className="flex flex-row justify-between items-start bg-zinc-100 dark:bg-zinc-800/50 p-8 print:bg-transparent">
                    <div>
                        <MeeatLogo className="h-16 w-auto" />
                        <p className="text-muted-foreground text-sm mt-2">
                            123 Butcher Block Blvd,<br/>
                            Meatpacking District, NY 10014
                        </p>
                    </div>
                    <div className="text-right">
                        <h1 className="text-4xl font-bold text-primary font-headline">DELIVERY NOTE</h1>
                        <p className="text-muted-foreground"># {delivery.id.substring(0, 8)}</p>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8 flex-grow">
                    <div className="space-y-8 text-sm">
                        <div>
                            <h3 className="font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Deliver To</h3>
                            <div className="text-muted-foreground">
                                <p className="font-bold text-lg text-foreground">{customer?.name}</p>
                                <p>{order.shippingAddress?.street}, {order.shippingAddress?.city}</p>
                                <p>{customer?.email}</p>
                            </div>
                        </div>
                        <div className="border rounded-lg p-4">
                             <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2">
                                <span className="font-semibold text-muted-foreground">Challan Date:</span>
                                <span className="text-foreground">{new Date(delivery.challanDate).toLocaleDateString()}</span>
                                
                                <span className="font-semibold text-muted-foreground">Order ID:</span>
                                <span className="text-foreground font-mono text-xs">#{delivery.orderId.substring(0,8)}</span>
                                
                                <span className="font-semibold text-muted-foreground">Status:</span>
                                <span><Badge variant={delivery.status === 'delivered' ? 'default' : 'secondary'} className="capitalize">{delivery.status}</Badge></span>
                             </div>
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow className="bg-zinc-100 dark:bg-zinc-800/50">
                                <TableHead className="w-2/3">Description</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {order.orderItemIds.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="font-medium">{item.product?.name ? t(item.product.name) : 'Item'}</div>
                                        <div className="text-xs text-muted-foreground">{item.selectedUnit}</div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    
                    {delivery.description && (
                        <div>
                            <h3 className="font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Notes</h3>
                            <p className="text-sm text-muted-foreground p-4 border rounded-md">{delivery.description}</p>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-8 pt-8">
                        <div className="text-center border-t pt-4">
                            <p className="font-semibold">Received By</p>
                            <p className="text-sm text-muted-foreground mt-8">(Signature)</p>
                        </div>
                         <div className="text-center border-t pt-4">
                            <p className="font-semibold">Dispatched By</p>
                            <p className="text-sm text-muted-foreground mt-2">{delivery.dispatchedBy}</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="p-8 border-t mt-auto">
                    <div className="text-center text-sm text-muted-foreground w-full">
                        <p>Thank you for your business! Please confirm receipt of the goods listed above.</p>
                    </div>
                </CardFooter>
            </Card>
        </div>
        <div className="mt-4 flex justify-center no-print max-w-4xl mx-auto w-full">
            <Button onClick={handlePrint} className="flex items-center gap-2">
                <Printer className="mr-2 h-4 w-4" />
                Print Delivery Note
            </Button>
        </div>
    </div>
  );
}
