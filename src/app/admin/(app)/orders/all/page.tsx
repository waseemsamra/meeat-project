
"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { MoreHorizontal } from "lucide-react"
import { useCollection, useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import { collection, collectionGroup, query, doc, deleteDoc, writeBatch, updateDoc } from "firebase/firestore";
import type { Order, User } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";
import { createShipdayOrder } from "@/ai/flows/create-shipday-order";

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

export default function AllOrdersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { defaultCurrency } = useSettings();
  const currencySymbol = defaultCurrency?.symbol || '$';
  
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);

  const usersQuery = useMemo(() => firestore ? collection(firestore, "users") : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
  
  const allOrdersQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, "orders"));
  }, [firestore]);
  const { data: allOrders, isLoading: isLoadingOrders, error: ordersError } = useCollection<Order>(allOrdersQuery);
  
  const enrichedOrders = useMemo(() => {
    if (allOrders && users) {
      const userMap = new Map(users.map(u => [u.id, u]));
      const enriched = allOrders.map(order => ({
          ...order,
          customer: userMap.get(order.userId),
      }));
      // Client-side sorting
      enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return enriched;
    }
    return [];
  }, [allOrders, users]);


  const displayLoading = isLoadingOrders || isLoadingUsers;
  
  const handleStatusUpdate = async (order: Order, status: string) => {
    if (!firestore || !order.userId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update status. Invalid order data.' });
        return;
    }
    const orderDocRef = doc(firestore, `users/${order.userId}/orders`, order.id);
    const updateData: { [key: string]: any } = { fulfillmentStatus: status, updatedAt: new Date().toISOString() };

    // If marking as shipped, also trigger Shipday integration
    if (status === 'shipped' && !order.shipdayOrderId) {
        try {
            const customer = users?.find(u => u.id === order.userId);
            if (!customer) {
                toast({ variant: 'destructive', title: 'Error', description: 'Customer details not found for Shipday integration.'});
                return;
            }

            const orderItemsText = order.orderItemIds.map(item => {
                const productName = item.product?.name?.en || 'Item';
                return `${productName} x${item.quantity}`;
            }).join('\n');

            const shipdayResult = await createShipdayOrder({
                orderId: order.id,
                customerName: customer.name || 'N/A',
                customerAddress: `${order.shippingAddress?.street}, ${order.shippingAddress?.city}, ${order.shippingAddress?.country}`,
                customerEmail: customer.email,
                customerPhoneNumber: customer.telephone,
                orderItemsText: orderItemsText.trim(),
                total: order.total,
            });

            if (shipdayResult.success && shipdayResult.shipdayOrderId) {
                updateData.shipdayOrderId = shipdayResult.shipdayOrderId;
                toast({ title: 'Shipday Order Created', description: `Delivery task created in Shipday with ID: ${shipdayResult.shipdayOrderId}`});
            } else {
                toast({ variant: 'destructive', title: 'Shipday Error', description: shipdayResult.errorMessage || 'Failed to create Shipday order.' });
            }
        } catch (shipdayError) {
            console.error("Shipday integration failed:", shipdayError);
            toast({ variant: 'destructive', title: 'Shipday Integration Failed', description: 'Could not create delivery task.' });
        }
    }


    try {
        await updateDoc(orderDocRef, updateData);
        toast({ title: 'Status Updated', description: `Order #${order.id.substring(0,8)} marked as ${status}.` });
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
    if (!firestore || !selectedOrder || !selectedOrder.userId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Cannot delete order. Invalid data.',
      });
      setIsAlertOpen(false);
      return;
    }

    const orderToDelete = selectedOrder;

    try {
      const batch = writeBatch(firestore);
      
      const orderDocRef = doc(firestore, `users/${orderToDelete.userId}/orders`, orderToDelete.id);
      batch.delete(orderDocRef);
      
      if (orderToDelete.orderItemIds && Array.isArray(orderToDelete.orderItemIds)) {
        orderToDelete.orderItemIds.forEach(item => {
          if (typeof item === 'object' && item.id) {
            const itemDocRef = doc(firestore, 'orders_items', item.id);
            batch.delete(itemDocRef);
          }
        });
      }

      await batch.commit();

      toast({
        title: 'Success',
        description: `Order #${orderToDelete.id.substring(0, 8)} has been deleted.`,
      });

    } catch (error: any) {
      console.error('Failed to delete order:', error);
      const contextualError = await FirestorePermissionError.create({
        path: `users/${orderToDelete.userId}/orders/${orderToDelete.id}`,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', contextualError);
    } finally {
      setIsAlertOpen(false);
      setSelectedOrder(null);
    }
  };


  return (
    <>
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">All Orders</h1>
      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>
            View and manage all customer orders across all channels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayLoading && Array.from({length: 10}).map((_, i) => <OrderRowSkeleton key={i} />)}
              {!displayLoading && enrichedOrders.slice(0, visibleCount).map((order) => {
                const customer = order.customer;
                let fulfillmentBadgeVariant: "default" | "secondary" | "outline" | "destructive" = "secondary";
                if (order.fulfillmentStatus === 'shipped' || order.fulfillmentStatus === 'delivered' || order.fulfillmentStatus === 'ready_for_pickup') {
                    fulfillmentBadgeVariant = 'default';
                } else if (order.fulfillmentStatus === 'unfulfilled') {
                    fulfillmentBadgeVariant = 'destructive';
                }
                
                return (
                <TableRow key={order.id}>
                  <TableCell className="font-medium text-xs">#{order.id.substring(0, 8)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{customer?.name}</div>
                    <div className="text-sm text-muted-foreground">{customer?.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={order.orderType === 'ONLINE' ? 'outline' : 'secondary'}>{order.orderType}</Badge>
                  </TableCell>
                   <TableCell>
                    <Badge variant={fulfillmentBadgeVariant}>{order.fulfillmentStatus}</Badge>
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
                        {order.shipdayOrderId && (
                            <DropdownMenuItem asChild>
                                <Link href={`/admin/orders/${order.id}?userId=${order.userId}`}>View Shipping Details</Link>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                            onClick={() => handleStatusUpdate(order, 'shipped')}
                            disabled={order.fulfillmentStatus === 'shipped' || !!order.shipdayOrderId}
                        >
                            Mark as Shipped
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusUpdate(order, 'ready_for_pickup')}>Ready for Pickup</DropdownMenuItem>
                         <DropdownMenuSeparator />
                         <DropdownMenuItem className="text-destructive" onClick={() => handleOpenAlert(order)}>
                            Delete Order
                         </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )})}
               {!displayLoading && enrichedOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    {ordersError ? `Error: ${ordersError.message}` : 'No orders found.'}
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
