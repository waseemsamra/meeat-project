
'use client';

import { useMemo, useState } from 'react';
import { DateRange } from "react-day-picker";
import { addDays, format, startOfDay, endOfDay, eachDayOfInterval } from "date-fns";
import { Calendar as CalendarIcon, DollarSign, ShoppingCart, Users, BarChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCollection, useFirestore } from '@/firebase';
import { collection, collectionGroup, query } from 'firebase/firestore';
import type { Order, User } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from '@/components/ui/skeleton';
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

export default function SalesReportPage() {
  const firestore = useFirestore();
  const { defaultCurrency } = useSettings();
  const currencySymbol = defaultCurrency?.symbol || '$';

  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfDay(addDays(new Date(), -30)),
    to: endOfDay(new Date()),
  });

  const ordersQuery = useMemo(() => firestore ? query(collectionGroup(firestore, 'orders')) : null, [firestore]);
  const { data: allOrders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);

  const usersQuery = useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: allUsers, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const isLoading = isLoadingOrders || isLoadingUsers;
  
  const filteredData = useMemo(() => {
    if (!allOrders || !allUsers || !date?.from) {
        return {
            orders: [],
            totalRevenue: 0,
            totalOrders: 0,
            newCustomers: 0,
            averageOrderValue: 0,
            chartData: []
        };
    };
    
    const startDate = startOfDay(date.from);
    const endDate = date.to ? endOfDay(date.to) : endOfDay(date.from);

    const ordersInDateRange = allOrders.filter(order => {
        if (!order.createdAt) return false;
        const orderDate = new Date(order.createdAt);
        return orderDate >= startDate && orderDate <= endDate;
    });

    const totalRevenue = ordersInDateRange.reduce((acc, order) => acc + order.total, 0);
    const totalOrders = ordersInDateRange.length;
    
    const newCustomers = allUsers.filter(user => {
        if (!user.createdAt) return false;
        const joinDate = new Date(user.createdAt);
        return joinDate >= startDate && joinDate <= endDate;
    }).length;

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    const dailyRevenue: { [key: string]: number } = {};
    const interval = eachDayOfInterval({ start: startDate, end: endDate });
    interval.forEach(day => {
        dailyRevenue[format(day, 'yyyy-MM-dd')] = 0;
    });

    ordersInDateRange.forEach(order => {
        if (!order.createdAt) return;
        const day = format(new Date(order.createdAt), 'yyyy-MM-dd');
        if (dailyRevenue[day] !== undefined) {
             dailyRevenue[day] += order.total;
        }
    });

    const chartData = Object.keys(dailyRevenue).map(dateStr => ({
        date: format(new Date(dateStr), 'MMM d'),
        revenue: dailyRevenue[dateStr],
    })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
        orders: ordersInDateRange,
        totalRevenue,
        totalOrders,
        newCustomers,
        averageOrderValue,
        chartData
    };

  }, [allOrders, allUsers, date]);
  
  const chartConfig = {
      revenue: {
        label: "Revenue",
        color: "hsl(var(--primary))",
      },
    } satisfies import("@/components/ui/chart").ChartConfig;

  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold">Sales Report</h1>
        <p className="text-muted-foreground">
          An overview of your sales performance for the selected date range.
        </p>
      </div>
      
       <div className="flex justify-end">
            <Popover>
                <PopoverTrigger asChild>
                <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                    "w-full sm:w-[300px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                    date.to ? (
                        <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                        </>
                    ) : (
                        format(date.from, "LLL dd, y")
                    )
                    ) : (
                    <span>Pick a date</span>
                    )}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                />
                </PopoverContent>
            </Popover>
       </div>

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
                <div className="text-2xl font-bold">{currencySymbol}{filteredData.totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
              </CardContent>
            </Card>
             <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+{filteredData.totalOrders}</div>
              </CardContent>
            </Card>
             <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+{filteredData.newCustomers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                 <div className="text-2xl font-bold">{currencySymbol}{filteredData.averageOrderValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
          <CardDescription>
            A chart showing total revenue per day for the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
            {isLoading ? <ChartSkeleton /> : (
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                  <ResponsiveContainer>
                    <LineChart data={filteredData.chartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="date"
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
                        dot={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
            )}
        </CardContent>
      </Card>

    </div>
  );
}
