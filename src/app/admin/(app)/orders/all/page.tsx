
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, AlertCircle } from "lucide-react"
import { useCollection, useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import { collection, query, orderBy, doc, deleteDoc, writeBatch, updateDoc, collectionGroup } from "firebase/firestore";
import type { Order, User } from "@/lib/types";
import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";
import { createShipdayOrder } from "@/ai/flows/create-shipday-order";
import { OrderRowSkeleton } from "./OrderRowSkeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AllOrdersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { defaultCurrency } = useSettings();
  const currencySymbol = defaultCurrency?.symbol || '$';
  
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [shipdayIdInput, setShipdayIdInput] = useState("");

  const usersQuery = useMemo(() => firestore ? collection(firestore, "users") : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
  
  const allOrdersQuery = useMemo(() => {
    if (!firestore) return null;
    // Querying all "orders" collections (root and subcollections)
    return query(collectionGroup(firestore, "orders"), orderBy("createdAt", "desc"));
  }, [firestore]);
  
  const { data: allOrders, isLoading: isLoadingOrders, error: ordersError } = useCollection<Order>(allOrdersQuery);
  
  const enrichedOrders = useMemo(() => {
    if (allOrders && users) {
      const userMap = new Map(users.map(u => [u.id, u]));
      return allOrders.map(order => ({
          ...order,
          customer: userMap.get(order.userId),
      }));
    }
    return allOrders || [];
  }, [allOrders, users]);

  const displayLoading = isLoadingOrders || (isLoadingUsers && !allOrders);
  
  const handleStatusUpdate = async (order: Order, status: string) => {
    if (!firestore || !order.__path) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update status. Invalid order data path.' });
        return;
    }
    const orderDocRef = doc(firestore, order.__path);
    const updateData: { [key: string]: any } = { 
        fulfillmentStatus: status,
        updatedAt: new Date().toISOString() 
    };

    if (status === 'shipped' || status === 'ready_for_pickup') {
        const customer = users?.find(u => u.id === order.userId);
        const address = order.shippingAddress;
        if (customer) {
            const shipdayResult = await createShipdayOrder({
                orderId: order.id,
                customerName: customer.name || 'N/A',
                customerAddress: address ? `${address.street}, ${address.city}` : customer.deliveryAddress || 'N/A',
                customerEmail: customer.email,
                customerPhoneNumber: customer.telephone,
                orderItemsText: order.orderItemIds.map(item => `${item.product?.name || 'Item'} x${item.quantity}`).join('\n'),
                total: order.total
            });

            if (shipdayResult.success && shipdayResult.shipdayOrderId) {
                updateData.shipdayOrderId = shipdayResult.shipdayOrderId;
                toast({ title: 'Shipday Order Created', description: `Order successfully dispatched to Shipday ID: ${shipdayResult.shipdayOrderId}` });
            } else {
                 toast({ variant: 'destructive', title: 'Shipday Dispatch Failed', description: shipdayResult.errorMessage || 'An unknown error occurred.' });
            }
        }
    }

    try {
        await updateDoc(orderDocRef, updateData);
        toast({ title: 'Status Updated', description: `Order status updated to ${status}.` });
    } catch (e: any) {
        const contextualError = await FirestorePermissionError.create({ path: orderDocRef.path, operation: 'update', requestResourceData: updateData });
        errorEmitter.emit('permission-error', contextualError);
    }
  }

  const handleOpenAlert = (order: Order) => {
    setSelectedOrder(order);
    setIsAlertOpen(true);
  };
  
  const handleOpenLinkModal = (order: Order) => {
    setSelectedOrder(order);
    setShipdayIdInput(""); 
    setIsLinkModalOpen(true);
  }

  const handleLinkShipdayOrder = async () => {
    if (!firestore || !selectedOrder || !shipdayIdInput || !selectedOrder.__path) return;

    const orderDocRef = doc(firestore, selectedOrder.__path);
    const shipdayOrderId = parseInt(shipdayIdInput, 10);

    if (isNaN(shipdayOrderId)) {
        toast({ variant: 'destructive', title: 'Invalid ID', description: 'Shipday Order ID must be a number.' });
        return;
    }

    try {
        await updateDoc(orderDocRef, { shipdayOrderId });
        toast({ title: 'Success', description: 'Shipday order linked successfully.' });
        setIsLinkModalOpen(false);
    } catch (e: any) {
        const contextualError = await FirestorePermissionError.create({ path: orderDocRef.path, operation: 'update', requestResourceData: { shipdayOrderId } });
        errorEmitter.emit('permission-error', contextualError);
    }
  }

  const handleDelete = async () => {
    if (!firestore || !selectedOrder || !selectedOrder.__path) return;

    try {
      const batch = writeBatch(firestore);
      batch.delete(doc(firestore, selectedOrder.__path));
      
      if (selectedOrder.orderItemIds) {
        selectedOrder.orderItemIds.forEach(item => {
          if (item.id) {
            batch.delete(doc(firestore, 'orders_items', item.id));
          }
        });
      }

      await batch.commit();
      toast({ title: 'Success', description: `Order deleted.` });
    } catch (error: any) {
      const contextualError = await FirestorePermissionError.create({ path: selectedOrder.__path, operation: 'delete' });
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
      
      {ordersError && (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Firestore Error</AlertTitle>
            <AlertDescription>
                {ordersError.message}
                {ordersError.message.includes('index') && (
                    <div className="mt-2">
                        <strong>Note:</strong> CollectionGroup queries require indexes. Please run <code>npm run firebase:deploy</code> to apply them.
                    </div>
                )}
            </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>
            View and manage all customer orders (including legacy subcollection orders).
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
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayLoading ? (
                Array.from({length: 5}).map((_, i) => <OrderRowSkeleton key={i} />)
              ) : enrichedOrders.length > 0 ? (
                enrichedOrders.slice(0, visibleCount).map((order) => {
                    const customer = order.customer;
                    return (
                        <TableRow key={order.id}>
                        <TableCell className="font-medium text-xs">#{order.id.substring(0, 8)}</TableCell>
                        <TableCell>
                            <div className="font-medium">{customer?.name || 'Guest'}</div>
                            <div className="text-sm text-muted-foreground">{customer?.email || order.userId}</div>
                        </TableCell>
                        <TableCell>
                            <Badge variant={order.orderType === 'ONLINE' ? 'outline' : 'secondary'}>{order.orderType}</Badge>
                        </TableCell>
                        <TableCell>
                            <Badge className="capitalize">{order.fulfillmentStatus}</Badge>
                        </TableCell>
                        <TableCell>
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">{currencySymbol}{order.total.toFixed(2)}</TableCell>
                        <TableCell>
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                    <Link href={`/admin/orders/${order.id}?userId=${order.userId}`}>View Details</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenLinkModal(order)} disabled={!!order.shipdayOrderId}>
                                    Link Shipday ID
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Fulfillment</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleStatusUpdate(order, 'shipped')}>Mark as Shipped</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusUpdate(order, 'delivered')}>Mark as Delivered</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleOpenAlert(order)}>Delete Order</DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">No orders found.</TableCell>
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
    <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Link Shipday Order</DialogTitle></DialogHeader>
            <div className="py-4">
                <Label htmlFor="shipday-id">Shipday Order ID</Label>
                <Input id="shipday-id" value={shipdayIdInput} onChange={(e) => setShipdayIdInput(e.target.value)} placeholder="e.g., 12345678" type="number" />
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleLinkShipdayOrder}>Link Order</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the order and related items.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
