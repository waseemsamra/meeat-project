
'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, ShoppingCart, Users, BarChart } from 'lucide-react';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import {
  collection,
  query,
  onSnapshot,
  collectionGroup,
  FirestoreError,
} from 'firebase/firestore';
import type { Order, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { format, parseISO } from 'date-fns';
import { useSettings } from '@/hooks/useSettings';

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-3 w-32 mt-1" />
      </CardContent>
    </Card>
  );
}

function RecentOrdersSkeleton() {
  return Array.from({ length: 5 }).map((_, i) => (
    <TableRow key={i}>
      <TableCell>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-32 mt-1" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-20" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-4 w-16" />
      </TableCell>
    </TableRow>
  ));
}

function ChartSkeleton() {
    return (
        <Card>
            <CardHeader>
                <CardTitle><Skeleton className="h-6 w-32" /></CardTitle>
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[300px] w-full" />
            </CardContent>
        </Card>
    )
}

export default function AdminDashboard() {
  const firestore = useFirestore();
  const { defaultCurrency } = useSettings();
  const currencySymbol = defaultCurrency?.symbol || '$';

  const [users, setUsers] = useState<User[] | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const usersQuery = collection(firestore, 'users');
    const unsubscribeUsers = onSnapshot(
      usersQuery,
      (snapshot) => {
        const usersData = snapshot.docs.map(
          (doc) => ({ ...doc.data(), id: doc.id } as User)
        );
        setUsers(usersData);
        setIsLoadingUsers(false);
      },
      async (err: FirestoreError) => {
        console.error('Error fetching users:', err);
        const contextualError = await FirestorePermissionError.create({
          path: usersQuery.path,
          operation: 'list',
        });
        errorEmitter.emit('permission-error', contextualError);
        setIsLoadingUsers(false);
      }
    );

    const allOrdersQuery = query(collectionGroup(firestore, 'orders'));
    const unsubscribeOrders = onSnapshot(
      allOrdersQuery,
      (snapshot) => {
        const ordersData = snapshot.docs.map(
          (doc) => ({ ...doc.data(), id: doc.id } as Order)
        );
        setOrders(ordersData);
        setIsLoadingOrders(false);
      },
      async (err: FirestoreError) => {
        console.error('Error fetching orders:', err);
        const contextualError = await FirestorePermissionError.create({
          path: 'orders',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', contextualError);
        setIsLoadingOrders(false);
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeOrders();
    };
  }, [firestore]);

  const sortedOrders = useMemo(() => {
    if (!orders) return [];
    return [...orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [orders]);

  const recentOrders = useMemo(() => sortedOrders.slice(0, 5), [sortedOrders]);

  const chartData = useMemo(() => {
    if (!orders) return [];
    const monthlyRevenue: { [key: string]: number } = {};

    orders.forEach(order => {
        const month = format(parseISO(order.createdAt), 'MMM yyyy');
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + order.total;
    });

    const data = Object.keys(monthlyRevenue)
        .map(month => ({
            name: month.split(' ')[0],
            revenue: monthlyRevenue[month],
            // Create a sortable date key
            sortKey: new Date(month.split(' ')[1], ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month.split(' ')[0]))
        }))
        .sort((a,b) => a.sortKey.getTime() - b.sortKey.getTime());
    
    return data;
  }, [orders]);


  const isLoading = isLoadingUsers || isLoadingOrders;

  const totalRevenue = orders?.reduce((acc, order) => acc + order.total, 0) ?? 0;
  const totalOrders = orders?.length ?? 0;
  const totalCustomers =
    users?.filter((u) => u.roles?.includes('CUSTOMER')).length ?? 0;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  const chartConfig = {
      revenue: {
        label: "Revenue",
        color: "hsl(var(--primary))",
      },
    } satisfies import("@/components/ui/chart").ChartConfig;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currencySymbol}{totalRevenue.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  +20.1% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+{totalOrders}</div>
                <p className="text-xs text-muted-foreground">
                  +180.1% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Customers
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+{totalCustomers}</div>
                <p className="text-xs text-muted-foreground">
                  +19% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                 <div className="text-2xl font-bold">
                    {currencySymbol}{averageOrderValue.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}
                </div>
                <p className="text-xs text-muted-foreground">
                  +2.5% from last month
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
           {isLoading ? <ChartSkeleton /> : (
            <Card>
              <CardHeader>
                <CardTitle>Sales Overview</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <ResponsiveContainer>
                    <LineChart data={chartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis
                        tickFormatter={(value) => `${currencySymbol}${value / 1000}k`}
                        tickLine={false}
                        axisLine={false}
                      />
                       <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      <Line
                        dataKey="revenue"
                        type="monotone"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
           )}
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-4">Recent Orders</h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <RecentOrdersSkeleton />}
                {!isLoading &&
                  recentOrders?.map((order) => {
                    const customer = users?.find((u) => u.id === order.userId);
                    return (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="font-medium">{customer?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {customer?.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.fulfillmentStatus === 'shipped'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {order.fulfillmentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {currencySymbol}{order.total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                {!isLoading && recentOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">
                      No recent orders.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
