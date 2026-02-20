
'use client';

import { useMemo } from 'react';
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
import { DollarSign, ShoppingCart, Users, BarChart, AlertTriangle } from 'lucide-react';
import { useFirestore, useCollection } from '@/firebase';
import {
  collection,
  query,
  orderBy,
  collectionGroup,
} from 'firebase/firestore';
import type { Order, User, Product, InventoryLot } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { format, parseISO, isValid } from 'date-fns';
import { useSettings } from '@/hooks/useSettings';
import { useTranslation } from '@/hooks/useTranslation';

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
  const { t } = useTranslation();

  const usersQuery = useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  // Use collectionGroup to fetch all orders (root + legacy)
  const ordersQuery = useMemo(() => firestore ? query(collectionGroup(firestore, 'orders'), orderBy('createdAt', 'desc')) : null, [firestore]);
  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);

  const productsQuery = useMemo(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

  const lotsQuery = useMemo(() => firestore ? collection(firestore, 'inventoryLots') : null, [firestore]);
  const { data: lots, isLoading: isLoadingLots } = useCollection<InventoryLot>(lotsQuery);

  const lowStockAlerts = useMemo(() => {
    if (!products || !lots) return [];
    
    const stockMap = new Map<string, number>();
    lots.forEach(lot => {
        stockMap.set(lot.productId, (stockMap.get(lot.productId) || 0) + lot.quantity);
    });

    return products.filter(p => (stockMap.get(p.id) || 0) < 10).map(p => ({
        id: p.id,
        name: t(p.name),
        quantity: stockMap.get(p.id) || 0,
    }));
  }, [products, lots, t]);

  const recentOrders = useMemo(() => {
    if (!orders) return [];
    return orders.slice(0, 5);
  }, [orders]);

  const chartData = useMemo(() => {
    if (!orders) return [];
    const monthlyRevenue: { [key: string]: number } = {};

    orders.forEach(order => {
        if (!order.createdAt) return;
        try {
            const date = parseISO(order.createdAt);
            if (!isValid(date)) return;
            const monthKey = format(date, 'yyyy-MM');
            monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + order.total;
        } catch (e) {
            // Skip invalid dates
        }
    });

    return Object.keys(monthlyRevenue)
        .sort()
        .map(monthKey => {
            const [year, month] = monthKey.split('-').map(Number);
            const date = new Date(year, month - 1, 1);
            return {
                name: format(date, 'MMM'),
                revenue: monthlyRevenue[monthKey],
            };
        });
  }, [orders]);


  const isLoading = isLoadingUsers || isLoadingOrders || isLoadingProducts || isLoadingLots;

  const totalRevenue = orders?.reduce((acc, order) => acc + order.total, 0) ?? 0;
  const totalOrders = orders?.length ?? 0;
  const totalCustomers = users?.filter((u) => u.roles?.includes('CUSTOMER')).length ?? 0;
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
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currencySymbol}{totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">+20.1% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+{totalOrders}</div>
                <p className="text-xs text-muted-foreground">+180.1% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+{totalCustomers}</div>
                <p className="text-xs text-muted-foreground">+19% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                 <div className="text-2xl font-bold">
                    {currencySymbol}{averageOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">+2.5% from last month</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
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
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis tickFormatter={(value) => `${currencySymbol}${value / 1000}k`} tickLine={false} axisLine={false} />
                       <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                      <Line dataKey="revenue" type="monotone" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
           )}

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
                            <div className="font-medium">{customer?.name || 'Guest'}</div>
                            <div className="text-sm text-muted-foreground">{customer?.email || order.userId}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={order.fulfillmentStatus === 'delivered' ? 'default' : 'secondary'}>{order.fulfillmentStatus}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{currencySymbol}{order.total.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                  {!isLoading && recentOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-24">No recent orders.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>

        <div className="space-y-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="text-destructive h-6 w-6" /> Low Stock Alerts
            </h2>
            <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : lowStockAlerts.length > 0 ? (
                        <div className="space-y-4">
                            {lowStockAlerts.map(alert => (
                                <div key={alert.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                    <div>
                                        <p className="font-semibold text-sm">{alert.name}</p>
                                        <p className="text-xs text-muted-foreground">Qty Remaining: {alert.quantity}</p>
                                    </div>
                                    <Badge variant="destructive">Low Stock</Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-sm text-muted-foreground">All stock levels are healthy.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
