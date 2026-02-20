'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy, where, collectionGroup } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useMemo } from 'react';
import { useSettings } from '@/hooks/useSettings';

function OrderRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-20" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-4 w-16" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-9 w-28" />
      </TableCell>
    </TableRow>
  );
}

export default function AccountOrdersPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { defaultCurrency } = useSettings();
  const currencySymbol = defaultCurrency?.symbol || '$';

  const ordersQuery = useMemo(() => {
    if (!firestore || !user) return null;
    // Use collectionGroup to find orders for the user across root and potential legacy subcollections
    return query(
        collectionGroup(firestore, 'orders'),
        where('userId', '==', user.id),
        orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);

  const isLoading = isUserLoading || isLoadingOrders;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold font-headline mb-8">My Orders</h1>
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <OrderRowSkeleton key={i} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : orders && orders.length > 0 ? (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium text-sm">
                      #{order.id.substring(0, 8)}
                    </TableCell>
                    <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          order.fulfillmentStatus === 'shipped' ? 'default' : 'secondary'
                        }
                        className="capitalize"
                      >
                        {order.fulfillmentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{currencySymbol}{order.total.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/account/orders/${order.id}`}>View Details</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h2 className="mt-6 text-2xl font-headline">No orders yet</h2>
            <p className="mt-2 text-muted-foreground">Looks like you haven't placed an order.</p>
            <Button asChild className="mt-6">
                <Link href="/products">Start Shopping <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
        </div>
      )}
    </div>
  );
}
