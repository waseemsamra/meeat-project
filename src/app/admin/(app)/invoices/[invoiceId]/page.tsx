
'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { useDoc, useCollection, useFirestore } from '@/firebase';
import { doc, collection, query, where, documentId, getDocs, collectionGroup } from 'firebase/firestore';
import type { Invoice, Order, User, Product, OrderItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MeeatLogo } from '@/components/icons';
import { Printer, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import printJS from 'print-js';
import { useSettings } from '@/hooks/useSettings';


function InvoicePageSkeleton() {
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


export default function InvoicePage() {
  const params = useParams();
  const invoiceId = params.invoiceId as string;
  const firestore = useFirestore();
  const { defaultCurrency } = useSettings();
  const currencySymbol = defaultCurrency?.symbol || '$';

  const invoiceRef = useMemo(() => (firestore && invoiceId ? doc(firestore, 'invoices', invoiceId) : null), [firestore, invoiceId]);
  const { data: invoice, isLoading: isLoadingInvoice } = useDoc<Invoice>(invoiceRef);
  
  const allOrdersQuery = useMemo(() => firestore ? query(collectionGroup(firestore, 'orders')) : null, [firestore]);
  const { data: allOrders, isLoading: isLoadingAllOrders } = useCollection<Order>(allOrdersQuery);
  
  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<User | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  
  const handlePrint = () => {
    if (!invoice) return;
    printJS({
        printable: 'invoice-to-print',
        type: 'html',
        scanStyles: true, // Scan the DOM for applied styles
        documentTitle: `Invoice-${invoice.id.substring(0,8)}`,
        targetStyles: ['*'], // Apply all found styles
        style: `@page { size: A4; margin: 0; } body { -webkit-print-color-adjust: exact; }` // Ensure correct page size and printing of backgrounds
    });
  }

  useEffect(() => {
    async function fetchDetails() {
        if (!firestore || !invoice || !allOrders) {
            if (!isLoadingInvoice && !isLoadingAllOrders) {
                setIsLoadingDetails(false);
            }
            return;
        }

        setIsLoadingDetails(true);

        const currentOrder = allOrders.find(o => o.id === invoice.orderId) || null;
        setOrder(currentOrder);

        if (currentOrder?.userId) {
            const userDocRef = doc(firestore, 'users', currentOrder.userId);
            const userDoc = await getDocs(query(collection(firestore, 'users'), where('id', '==', currentOrder.userId)));
            if (!userDoc.empty) {
                setCustomer(userDoc.docs[0].data() as User);
            }
        }
        
        if (currentOrder?.orderItemIds && currentOrder.orderItemIds.length > 0) {
            try {
                const productIds = [...new Set(currentOrder.orderItemIds.map(item => item.productId))];
                let productsData: Product[] = [];
                if (productIds.length > 0) {
                    const productsRef = collection(firestore, 'products');
                    const productsQuery = query(productsRef, where(documentId(), 'in', productIds));
                    const productsSnapshot = await getDocs(productsQuery);
                    productsData = productsSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Product));
                }

                const itemsWithProducts = currentOrder.orderItemIds.map(item => ({
                    ...item,
                    product: productsData.find(p => p.id === item.productId)
                }));
                setOrderItems(itemsWithProducts as OrderItem[]);
            } catch (e) {
                console.error('Error fetching order item products:', e);
                setOrderItems(currentOrder.orderItemIds as OrderItem[]);
            }
        } else {
            setOrderItems([]);
        }

        setIsLoadingDetails(false);
    }

    fetchDetails();

  }, [invoice, allOrders, firestore, isLoadingAllOrders, isLoadingInvoice]);
  
  
  const isLoading = isLoadingInvoice || isLoadingDetails;

  if (isLoading) {
    return (
        <div className="p-4 sm:p-6 md:p-8">
            <InvoicePageSkeleton />
        </div>
    );
  }

  if (!invoice) {
    return notFound();
  }

  return (
    <div className="bg-background p-4 sm:p-6 md:p-8">
        <div id="invoice-to-print">
            <Card className="max-w-4xl mx-auto my-auto print:bg-white print:m-0 print:shadow-none print:border-none">
                <CardHeader className="grid grid-cols-2 gap-4 bg-zinc-100 dark:bg-zinc-800/50 p-8 print:bg-transparent">
                <div>
                    <MeeatLogo className="h-16 w-auto" />
                    <p className="text-muted-foreground text-sm mt-2">
                        123 Butcher Block Blvd,<br/>
                        Meatpacking District, NY 10014
                    </p>
                </div>
                <div className="text-right">
                    <h1 className="text-4xl font-bold text-primary font-headline">INVOICE</h1>
                    <p className="text-muted-foreground"># {invoice.id.substring(0, 8)}</p>
                </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8 flex-grow">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <h3 className="font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Bill To</h3>
                            <div className="text-muted-foreground">
                                <p className="font-bold text-lg text-foreground">{customer?.name}</p>
                                <p>{customer?.billingAddress || customer?.deliveryAddress || 'No address on file.'}</p>
                                <p>{customer?.email}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="grid grid-cols-2 gap-1 justify-items-end">
                                <span className="font-semibold text-muted-foreground">Invoice Date:</span>
                                <span className="text-foreground">{new Date(invoice.invoiceDate).toLocaleDateString()}</span>
                                <span className="font-semibold text-muted-foreground">Due Date:</span>
                                <span className="text-foreground">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow className="bg-zinc-100 dark:bg-zinc-800/50">
                                <TableHead className="w-1/2">Description</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead className="text-right">Unit Price</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orderItems.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="font-medium">{item.product?.name || 'Item'}</div>
                                        <div className="text-xs text-muted-foreground">{item.selectedUnit}</div>
                                    </TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell className="text-right">{currencySymbol}{item.price.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-medium">{currencySymbol}{(item.quantity * item.price).toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    
                    <div className="flex justify-end">
                        <div className="w-full max-w-xs space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="font-medium">{currencySymbol}{invoice.totalAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Tax (0%)</span>
                                <span className="font-medium">{currencySymbol}0.00</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>{currencySymbol}{invoice.totalAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-xl text-destructive pt-2">
                                <span>Amount Due</span>
                                <span>{currencySymbol}{invoice.status === 'paid' ? '0.00' : invoice.totalAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="p-8 border-t mt-auto">
                    <div className="text-center text-sm text-muted-foreground w-full">
                        <h3 className="font-semibold text-foreground">Thank you for your business!</h3>
                        <p>Please make payment to the details provided separately. For any queries, contact us at accounts@primecuts.com</p>
                    </div>
                </CardFooter>
            </Card>
        </div>
        <div className="mt-4 text-right no-print">
            <Button onClick={handlePrint} className="flex items-center gap-2">
                <Download className="mr-2 h-4 w-4" />
                Save as PDF / Print
            </Button>
        </div>
    </div>
  );
}
