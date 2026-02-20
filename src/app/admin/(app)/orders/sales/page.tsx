
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
import { collection, query, collectionGroup, addDoc, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import type { Order, User, Invoice } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useSettings } from "@/hooks/useSettings";

function OrderRowSkeleton() {
    return (
        <TableRow>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32 mt-1" />
            </TableCell>
            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
            <TableCell>
                <div className="flex justify-end">
                    <Skeleton className="h-8 w-8" />
                </div>
            </TableCell>
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

  // Fetch ALL orders using collectionGroup to find both root and legacy subcollection orders
  const allOrdersQuery = useMemo(() => 
    firestore ? query(collectionGroup(firestore, "orders")) : null
  , [firestore]);
  const { data: allOrders, isLoading: isLoadingOrders } = useCollection<Order>(allOrdersQuery);
  
  const usersQuery = useMemo(() => 
    firestore ? collection(firestore, "users") : null
  , [firestore]);
  const { data: allUsers, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
  
  const invoicesQuery = useMemo(() =>
    firestore ? collection(firestore, 'invoices') : null
  , [firestore]);
  const { data: allInvoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(invoicesQuery);

  const enrichedOrders = useMemo(() => {
    if (allOrders && allUsers && allInvoices) {
      const customerMap = new Map(allUsers.map(u => [u.id, u]));
      // Filter for LOCAL orders on the client
      const localOrders = allOrders.filter(order => order.orderType === 'LOCAL');
      const enriched = localOrders.map(order => ({
        ...order,
        customer: customerMap.get(order.userId),
        hasInvoice: allInvoices?.some(inv => inv.orderId === order.id)
      }));
      // Client-side sorting
      enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return enriched;
    }
    return [];
  }, [allOrders, allUsers, allInvoices]);


  const handleCreateInvoice = async (order: Order) => {
    if (!firestore) return;

    try {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // Due 30 days from now

        const newInvoiceData: Omit<Invoice, 'id'> = {
            orderId: order.id,
            invoiceDate: new Date().toISOString(),
            dueDate: dueDate.toISOString(),
            totalAmount: order.total,
            status: 'unpaid',
            name: order.id, // for compatibility
        };

        const invoiceRef = await addDoc(collection(firestore, 'invoices'), newInvoiceData).catch(async (e) => {
            const contextualError = await FirestorePermissionError.create({ path: 'invoices', operation: 'create', requestResourceData: newInvoiceData });
            errorEmitter.emit('permission-error', contextualError);
            throw e;
        });
        
        toast({
            title: "Invoice Created",
            description: `Invoice for order #${order.id.substring(0,8)} has been created.`,
            action: (
                <Button variant="outline" size="sm" onClick={() => router.push('/admin/invoices')}>
                    View Invoices
                </Button>
            )
        });
    } catch (e) {
        console.error("Failed to create invoice:", e);
    }
  }
  
  const updatePaymentStatus = async (order: Order, newStatus: 'paid' | 'unpaid') => {
    if (!firestore || !order.__path) return;

    const orderRef = doc(firestore, order.__path);
    const updateData = { 
        paymentStatus: newStatus,
        updatedAt: new Date().toISOString(),
    };

    try {
        await updateDoc(orderRef, updateData).catch(async (e) => {
            const contextualError = await FirestorePermissionError.create({ path: orderRef.path, operation: 'update', requestResourceData: updateData });
            errorEmitter.emit('permission-error', contextualError);
            throw e;
        });
        
        toast({
            title: "Order Updated",
            description: `Order #${order.id.substring(0,8)} has been marked as ${newStatus}.`,
        });
    } catch (e) {
        console.error(`Failed to mark order as ${newStatus}:`, e);
    }
  };

  const handleFulfillmentStatusUpdate = async (order: Order, status: string) => {
    if (!firestore || !order.__path) return;
    const orderDocRef = doc(firestore, order.__path);
    
    // Sync multiple variations for mobile compatibility
    const updateData: { [key: string]: any } = { 
        fulfillmentStatus: status,
        Status: status.charAt(0).toUpperCase() + status.slice(1),
        status: status,
        updatedAt: new Date().toISOString() 
    };

    try {
        await updateDoc(orderDocRef, updateData);
        toast({ 
            title: 'Fulfillment Updated', 
            description: `Order set to ${status}.`,
            icon: <CheckCircle2 className="h-4 w-4 text-green-500" />
        });
    } catch (e: any) {
        const contextualError = await FirestorePermissionError.create({ path: orderDocRef.path, operation: 'update', requestResourceData: updateData });
        errorEmitter.emit('permission-error', contextualError);
    }
  }

  const handleOpenAlert = (order: Order) => {
    setSelectedOrder(order);
    setIsAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!firestore || !selectedOrder || !selectedOrder.__path) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Cannot delete order. Invalid data path.',
      });
      setIsAlertOpen(false);
      return;
    }

    const orderToDelete = selectedOrder;
    try {
      const batch = writeBatch(firestore);

      // 1. Delete the order document itself using its full path
      const orderDocRef = doc(firestore, orderToDelete.__path);
      batch.delete(orderDocRef);
      
      // 2. Delete associated order items
      if (orderToDelete.orderItemIds && Array.isArray(orderToDelete.orderItemIds)) {
        orderToDelete.orderItemIds.forEach(item => {
          if (typeof item === 'object' && item.id) {
            const itemDocRef = doc(firestore, 'orders_items', item.id);
            batch.delete(itemDocRef);
          }
        });
      }
      
      // 3. Commit the batch
      await batch.commit();

      toast({
        title: 'Success',
        description: `Order #${orderToDelete.id.substring(0, 8)} has been deleted.`,
      });

    } catch (error) {
      console.error('Failed to delete order:', error);
      const contextualError = await FirestorePermissionError.create({
        path: orderToDelete.__path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', contextualError);
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
                <p className="text-muted-foreground">
                    View and manage manually created sales orders for local customers.
                </p>
            </div>
            <Button asChild>
                <Link href="/admin/orders/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Sales Order
                </Link>
            </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Fulfillment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayLoading && Array.from({length: 5}).map((_, i) => <OrderRowSkeleton key={i} />)}
              {!displayLoading && enrichedOrders.slice(0, visibleCount).map((order) => {
                const customer = order.customer;
                const status = order.fulfillmentStatus;
                return (
                <TableRow key={order.id}>
                  <TableCell className="font-medium text-xs">#{order.id.substring(0, 8)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{customer?.name}</div>
                    <div className="text-sm text-muted-foreground">{customer?.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'destructive'}>{order.paymentStatus}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status === 'delivered' ? 'default' : 'secondary'} className="capitalize">
                        {status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(order.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">{currencySymbol}{order.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-haspopup="true"
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                            <Link href={`/admin/orders/${order.id}?userId=${order.userId}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Status & Payment</DropdownMenuLabel>
                         {order.paymentStatus !== 'paid' ? (
                            <DropdownMenuItem onClick={() => updatePaymentStatus(order, 'paid')}>Mark as Paid</DropdownMenuItem>
                         ) : (
                            <DropdownMenuItem onClick={() => updatePaymentStatus(order, 'unpaid')}>Mark as Unpaid</DropdownMenuItem>
                         )}
                        <DropdownMenuItem onClick={() => handleCreateInvoice(order)} disabled={order.hasInvoice}>
                            {order.hasInvoice ? 'Invoice Exists' : 'Create Invoice'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Fulfillment</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleFulfillmentStatusUpdate(order, 'shipped')}>Mark as Shipped</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleFulfillmentStatusUpdate(order, 'delivered')}>Mark as Delivered</DropdownMenuItem>
                        <DropdownMenuSeparator />
                         <DropdownMenuItem className="text-destructive" onClick={() => handleOpenAlert(order)}>
                            Delete Order
                         </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )})}
               {!displayLoading && (!enrichedOrders || enrichedOrders.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No sales orders found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {!displayLoading && enrichedOrders.length > visibleCount && (
            <CardFooter className="flex justify-center border-t pt-6">
                <Button onClick={() => setVisibleCount(prev => prev + 20)}>View More</Button>
            </CardFooter>
        )}
      </Card>
    </div>
     <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete order #{selectedOrder?.id.substring(0, 8)} and its related items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Accordion type="single" collapsible className="w-full">
                {/* Add a developer-facing path hint just in case */}
            </Accordion>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
