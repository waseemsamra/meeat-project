
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
import { MoreHorizontal, AlertCircle, Loader2, CheckCircle2 } from "lucide-react"
import { useCollection, useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import { collection, query, orderBy, doc, deleteDoc, writeBatch, updateDoc, collectionGroup, getDocs, where } from "firebase/firestore";
import type { Order, User, Notification } from "@/lib/types";
import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";
import { createShipdayOrder } from "@/ai/flows/create-shipday-order";
import { OrderRowSkeleton } from "./OrderRowSkeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Robust date parsing for mobile sync (Handles Timestamps, Strings, and Objects)
function parseSyncDate(date: any): string {
    if (!date) return new Date().toISOString();
    if (typeof date === 'string') return date;
    if (date.toISOString) return date.toISOString();
    if (date.toDate && typeof date.toDate === 'function') return date.toDate().toISOString();
    if (date.seconds) return new Date(date.seconds * 1000).toISOString();
    try {
        const d = new Date(date);
        return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    } catch (e) {
        return new Date().toISOString();
    }
}

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
  
  // Real-time listener for all orders across all collection paths
  const allOrdersQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, "orders"));
  }, [firestore]);
  
  const { data: allOrders, isLoading: isLoadingOrders, error: ordersError } = useCollection<Order>(allOrdersQuery);
  
  const enrichedOrders = useMemo(() => {
    if (allOrders && users) {
      const userMap = new Map(users.map(u => [u.id, u]));
      
      const normalized = allOrders.map(order => {
          const o = order as any;
          
          // Handle Total (Mobile often sends as string like "50.00 DH")
          let totalValue = typeof o.total === 'number' ? o.total : 0;
          if (o.Total && typeof o.Total === 'string') {
              const parsed = parseFloat(o.Total.replace(/[^0-9.]/g, ''));
              if (!isNaN(parsed)) totalValue = parsed;
          }

          // Handle Status synchronization
          let status = o.fulfillmentStatus;
          if (!status && o.Status && typeof o.Status === 'string') {
              status = o.Status.toLowerCase();
          }
          if (!status) status = 'processing';

          // Robust Date Synchronization
          const createdAt = parseSyncDate(o.createdAt || o.date || o.Date);
          const updatedAt = parseSyncDate(o.updatedAt || o.createdAt || o.date || o.Date);

          return {
              ...order,
              total: totalValue,
              fulfillmentStatus: status,
              createdAt,
              updatedAt,
              customer: userMap.get(order.userId),
          };
      });

      // Group and Deduplicate (Mobile app might write to both root and subcollection)
      const deduplicated = new Map<string, any>();
      normalized.forEach(order => {
          const orderKey = order.orderNumber || (order as any).Order || order.id;
          const existing = deduplicated.get(orderKey);
          
          if (!existing) {
              deduplicated.set(orderKey, order);
          } else {
              // Priority: Choose the one with the latest update or the root path
              const existingDate = new Date(existing.updatedAt).getTime();
              const currentDate = new Date(order.updatedAt).getTime();
              
              if (currentDate > existingDate) {
                  deduplicated.set(orderKey, order);
              }
          }
      });

      return Array.from(deduplicated.values()).sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
      });
    }
    return allOrders || [];
  }, [allOrders, users]);

  const displayLoading = isLoadingOrders || (isLoadingUsers && !allOrders);
  
  const handleStatusUpdate = async (order: Order, status: string) => {
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

        pathsToUpdate.forEach(path => {
            batch.update(doc(firestore, path), updateData);
        });

        // Sync Notification to Mobile Tray
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
        toast({ 
            title: 'Order Synced', 
            description: `Order #${orderKey} updated across all mobile devices.`,
            icon: <CheckCircle2 className="h-4 w-4 text-green-500" />
        });
    } catch (e: any) {
        console.error("Sync error:", e);
        toast({ variant: 'destructive', title: 'Sync Failed' });
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
        toast({ variant: 'destructive', title: 'Invalid ID' });
        return;
    }
    try {
        await updateDoc(orderDocRef, { shipdayOrderId });
        toast({ title: 'Success' });
        setIsLinkModalOpen(false);
    } catch (e: any) {
        errorEmitter.emit('permission-error', await FirestorePermissionError.create({ path: orderDocRef.path, operation: 'update' }));
    }
  }

  const handleDelete = async () => {
    if (!firestore || !selectedOrder || !selectedOrder.__path) return;
    try {
      const batch = writeBatch(firestore);
      batch.delete(doc(firestore, selectedOrder.__path));
      if (selectedOrder.orderItemIds) {
        selectedOrder.orderItemIds.forEach(item => { if (item.id) batch.delete(doc(firestore, 'orders_items', item.id)); });
      }
      await batch.commit();
      toast({ title: 'Success' });
    } catch (error: any) {
      errorEmitter.emit('permission-error', await FirestorePermissionError.create({ path: selectedOrder.__path, operation: 'delete' }));
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
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>{ordersError.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Global Live Sync</CardTitle>
          <CardDescription>
            Orders from both the web shop and mobile app are synced here in real-time.
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
                    const orderIdDisplay = order.orderNumber || (order as any).Order || order.id.substring(0, 8);
                    const status = order.fulfillmentStatus || 'processing';
                    return (
                        <TableRow key={order.id}>
                        <TableCell className="font-medium text-xs">#{orderIdDisplay}</TableCell>
                        <TableCell>
                            <div className="font-medium">{customer?.name || 'Guest'}</div>
                            <div className="text-sm text-muted-foreground">{customer?.email || order.userId}</div>
                        </TableCell>
                        <TableCell>
                            <Badge variant={order.orderType === 'ONLINE' ? 'outline' : 'secondary'}>{order.orderType || 'MOBILE'}</Badge>
                        </TableCell>
                        <TableCell>
                            <Badge className="capitalize" variant={status === 'delivered' ? 'default' : status === 'shipped' ? 'outline' : 'secondary'}>
                                {(status || 'processing').replace(/_/g, ' ')}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            {new Date(order.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">{currencySymbol}{(order.total || 0).toFixed(2)}</TableCell>
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
                                <DropdownMenuLabel>Sync Status</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleStatusUpdate(order, 'processing')}>Mark Processing</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusUpdate(order, 'shipped')}>Mark Shipped</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusUpdate(order, 'delivered')}>Mark Delivered</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleOpenAlert(order)}>Delete</DropdownMenuItem>
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
          <AlertDialogHeader><AlertDialogTitle>Delete Order?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
