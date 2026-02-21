
"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, PlusCircle, CheckCircle2 } from "lucide-react"
import { useCollection, useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import { collection, query, collectionGroup, addDoc, doc, updateDoc, deleteDoc, writeBatch, where, getDocs } from "firebase/firestore";
import type { Order, User, Invoice, Notification } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useSettings } from "@/hooks/useSettings";

function OrderRowSkeleton() {
    return (
        <TableRow>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
            <TableCell><div className="flex justify-end"><Skeleton className="h-8 w-8" /></div></TableCell>
        </TableRow>
    )
}

export default function SalesOrdersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { defaultCurrency } = useSettings();
  const currencySymbol = defaultCurrency?.symbol || '$';

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);

  const allOrdersQuery = useMemo(() => firestore ? query(collectionGroup(firestore, "orders")) : null, [firestore]);
  const { data: allOrders, isLoading: isLoadingOrders } = useCollection<Order>(allOrdersQuery);
  
  const usersQuery = useMemo(() => firestore ? collection(firestore, "users") : null, [firestore]);
  const { data: allUsers, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
  
  const invoicesQuery = useMemo(() => firestore ? collection(firestore, 'invoices') : null, [firestore]);
  const { data: allInvoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(invoicesQuery);

  const enrichedOrders = useMemo(() => {
    if (allOrders && allUsers && allInvoices) {
      const customerMap = new Map(allUsers.map(u => [u.id, u]));
      const localOrders = allOrders.filter(order => order.orderType === 'LOCAL');
      const enriched = localOrders.map(order => {
          const o = order as any;
          let totalValue = typeof o.total === 'number' ? o.total : 0;
          if (o.Total && typeof o.Total === 'string') {
              const parsed = parseFloat(o.Total.replace(/[^0-9.]/g, ''));
              if (!isNaN(parsed)) totalValue = parsed;
          }
          return {
            ...order,
            total: totalValue,
            customer: customerMap.get(order.userId),
            hasInvoice: allInvoices?.some(inv => inv.orderId === order.id)
          }
      });
      enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return enriched;
    }
    return [];
  }, [allOrders, allUsers, allInvoices]);


  const handleCreateInvoice = async (order: Order) => {
    if (!firestore) return;
    try {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        const newInvoiceData: Omit<Invoice, 'id'> = {
            orderId: order.id,
            invoiceDate: new Date().toISOString(),
            dueDate: dueDate.toISOString(),
            totalAmount: order.total,
            status: 'unpaid',
            name: order.id,
        };
        await addDoc(collection(firestore, 'invoices'), newInvoiceData);
        toast({ title: "Invoice Created" });
    } catch (e) {
        console.error("Invoice error:", e);
    }
  }
  
  const updatePaymentStatus = async (order: Order, newStatus: 'paid' | 'unpaid') => {
    if (!firestore || !order.__path) return;
    const orderRef = doc(firestore, order.__path);
    try {
        await updateDoc(orderRef, { paymentStatus: newStatus, updatedAt: new Date().toISOString() });
        toast({ title: "Payment Status Updated" });
    } catch (e) {
        console.error("Payment error:", e);
    }
  };

  const handleFulfillmentStatusUpdate = async (order: Order, status: string) => {
    if (!firestore || !status) return;
    
    try {
        const orderKey = order.orderNumber || (order as any).Order || order.id;
        const qRoot = query(collection(firestore, 'orders'), where('orderNumber', '==', orderKey));
        const qSub = query(collectionGroup(firestore, 'orders'), where('orderNumber', '==', orderKey));
        const qLegacy = query(collectionGroup(firestore, 'orders'), where('Order', '==', orderKey));
        
        const [rootSnap, subSnap, legacySnap] = await Promise.all([
            getDocs(qRoot),
            getDocs(qSub),
            getDocs(qLegacy)
        ]);

        const batch = writeBatch(firestore);
        const updateData: { [key: string]: any } = { 
            fulfillmentStatus: status,
            Status: status.charAt(0).toUpperCase() + status.slice(1),
            status: status,
            orderStatus: status,
            updatedAt: new Date().toISOString() 
        };

        const pathsToUpdate = new Set<string>();
        if (order.__path) pathsToUpdate.add(order.__path);
        rootSnap.docs.forEach(d => pathsToUpdate.add(d.ref.path));
        subSnap.docs.forEach(d => pathsToUpdate.add(d.ref.path));
        legacySnap.docs.forEach(d => pathsToUpdate.add(d.ref.path));

        pathsToUpdate.forEach(path => { batch.update(doc(firestore, path), updateData); });

        const notificationRef = doc(collection(firestore, 'notifications'));
        const safeStatusLabel = (status || 'updated').replace(/_/g, ' ');
        const notificationData: Omit<Notification, 'id'> = {
            userId: order.userId,
            title: "Order Updated",
            body: `Your order #${orderKey} is now ${safeStatusLabel}.`,
            type: 'order_update',
            relatedId: order.id,
            read: false,
            createdAt: new Date().toISOString(),
            scheduledAt: new Date().toISOString(),
        };
        batch.set(notificationRef, { ...notificationData, id: notificationRef.id });

        await batch.commit();
        toast({ title: 'Fulfillment Synced', icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Sync Failed' });
    }
  }

  const handleOpenAlert = (order: Order) => {
    setSelectedOrder(order);
    setIsAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!firestore || !selectedOrder || !selectedOrder.__path) return;
    try {
      const batch = writeBatch(firestore);
      batch.delete(doc(firestore, selectedOrder.__path));
      if (selectedOrder.orderItemIds) {
        selectedOrder.orderItemIds.forEach(item => { if (typeof item === 'object' && item.id) batch.delete(doc(firestore, 'orders_items', item.id)); });
      }
      await batch.commit();
      toast({ title: 'Success' });
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsAlertOpen(false);
      setSelectedOrder(null);
    }
  };

  const displayLoading = isLoadingOrders || isLoadingUsers || isLoadingInvoices;

  return (
    <>
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold">Sales Orders</h1>
                <p className="text-muted-foreground">Manage local sales and mobile sync.</p>
            </div>
            <Button asChild><Link href="/admin/orders/new"><PlusCircle className="mr-2 h-4 w-4" /> New Order</Link></Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Fulfillment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayLoading && Array.from({length: 5}).map((_, i) => <OrderRowSkeleton key={i} />)}
              {!displayLoading && enrichedOrders.slice(0, visibleCount).map((order) => {
                const customer = order.customer;
                const status = order.fulfillmentStatus || 'processing';
                return (
                <TableRow key={order.id}>
                  <TableCell className="font-medium text-xs">#{order.id.substring(0, 8)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{customer?.name}</div>
                    <div className="text-sm text-muted-foreground">{customer?.email}</div>
                  </TableCell>
                  <TableCell><Badge variant={order.paymentStatus === 'paid' ? 'default' : 'destructive'}>{order.paymentStatus}</Badge></TableCell>
                  <TableCell><Badge variant={status === 'delivered' ? 'default' : 'secondary'} className="capitalize">{(status || 'processing').replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">{currencySymbol}{order.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild><Link href={`/admin/orders/${order.id}?userId=${order.userId}`}>View Details</Link></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Sync Status</DropdownMenuLabel>
                         {order.paymentStatus !== 'paid' ? (
                            <DropdownMenuItem onClick={() => updatePaymentStatus(order, 'paid')}>Mark Paid</DropdownMenuItem>
                         ) : (
                            <DropdownMenuItem onClick={() => updatePaymentStatus(order, 'unpaid')}>Mark Unpaid</DropdownMenuItem>
                         )}
                        <DropdownMenuItem onClick={() => handleCreateInvoice(order)} disabled={order.hasInvoice}>Create Invoice</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Fulfillment</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleFulfillmentStatusUpdate(order, 'shipped')}>Mark Shipped</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleFulfillmentStatusUpdate(order, 'delivered')}>Mark Delivered</DropdownMenuItem>
                        <DropdownMenuSeparator />
                         <DropdownMenuItem className="text-destructive" onClick={() => handleOpenAlert(order)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </CardContent>
        {!displayLoading && enrichedOrders.length > visibleCount && (
            <CardFooter className="flex justify-center border-t pt-6"><Button onClick={() => setVisibleCount(prev => prev + 20)}>View More</Button></CardFooter>
        )}
      </Card>
    </div>
     <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirm Delete</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
