
'use client';

import { useMemo, useState } from 'react';
import { DateRange } from "react-day-picker";
import { addDays, format, startOfDay, endOfDay } from "date-fns";
import { Calendar as CalendarIcon, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCollection, useFirestore } from '@/firebase';
import { collection, collectionGroup, query } from 'firebase/firestore';
import type { Order, User } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PrintableReport } from '../PrintableReport';
import { ColumnDef } from '@tanstack/react-table';
import printJS from 'print-js';
import { useSettings } from '@/hooks/useSettings';


const ORDER_STATUSES: Order['fulfillmentStatus'][] = [
    'processing', 'shipped', 'delivered', 'unfulfilled', 'ready_for_pickup'
];

export default function OrdersReportPage() {
  const firestore = useFirestore();
  const { defaultCurrency } = useSettings();
  const currencySymbol = defaultCurrency?.symbol || '$';

  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfDay(addDays(new Date(), -30)),
    to: endOfDay(new Date()),
  });
  const [status, setStatus] = useState<string>('all');
  const [customerType, setCustomerType] = useState<string>('all');
  const [reportData, setReportData] = useState<any[] | null>(null);
  const [showReport, setShowReport] = useState(false);

  const ordersQuery = useMemo(() => firestore ? query(collectionGroup(firestore, 'orders')) : null, [firestore]);
  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);

  const usersQuery = useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const isLoading = isLoadingOrders || isLoadingUsers;

  const handleViewReport = () => {
    if (!orders || !users || !date?.from) {
        setReportData([]);
        setShowReport(true);
        return;
    };
    
    const startDate = startOfDay(date.from);
    const endDate = date.to ? endOfDay(date.to) : endOfDay(date.from);

    const userMap = new Map(users.map(u => [u.id, u]));

    const filtered = orders
        .filter(order => {
            if (!order.createdAt) return false;
            const orderDate = new Date(order.createdAt);
            const user = userMap.get(order.userId);

            const dateMatch = orderDate >= startDate && orderDate <= endDate;
            const statusMatch = status === 'all' || order.fulfillmentStatus === status;
            const customerTypeMatch = customerType === 'all' || (user && user.customerType === customerType);

            return dateMatch && statusMatch && customerTypeMatch;
        })
        .map(order => ({
            ...order,
            id: `#${order.id.substring(0,8)}`,
            customer: userMap.get(order.userId)?.name || 'N/A',
            type: userMap.get(order.userId)?.customerType || 'N/A',
            date: format(new Date(order.createdAt), "LLL dd, y"),
            status: order.fulfillmentStatus.replace(/_/g, ' '),
            total: `${currencySymbol}${order.total.toFixed(2)}`
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    setReportData(filtered);
    setShowReport(true);
  };
  
  const reportColumns: ColumnDef<any>[] = [
    { accessorKey: 'id', header: 'Order ID' },
    { accessorKey: 'customer', header: 'Customer' },
    { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'date', header: 'Date' },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'total', header: 'Total' },
  ];
  
  const handlePrint = () => {
    printJS({
        printable: 'printable-report',
        type: 'html',
        scanStyles: true,
        documentTitle: 'Orders Report',
        targetStyles: ['*'],
        style: `@page { size: A4; margin: 0; } body { -webkit-print-color-adjust: exact; margin: 20px !important; }`
    })
  }

  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold">Orders Report</h1>
        <p className="text-muted-foreground">
          Filter and analyze your orders by date range and status.
        </p>
      </div>
      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>
                        Select your criteria and click "View Report".
                    </CardDescription>
                </div>
                 <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={customerType} onValueChange={setCustomerType}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="ONLINE">Online</SelectItem>
                            <SelectItem value="LOCAL">Local</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            {ORDER_STATUSES.map(s => (
                                <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
                    <Button onClick={handleViewReport} disabled={isLoading}>View Report</Button>
                </div>
            </div>
        </CardHeader>
        {showReport && (
            <CardContent>
                {reportData && (
                    <>
                        <div className="flex justify-end mb-4">
                            <Button onClick={handlePrint} variant="outline">
                                <Printer className="mr-2 h-4 w-4" /> Print Report
                            </Button>
                        </div>
                        <div className="hidden">
                            <PrintableReport 
                                title="Orders Report"
                                dateRange={date}
                                columns={reportColumns}
                                data={reportData}
                            />
                        </div>
                    </>
                )}
                 <PrintableReport 
                    columns={reportColumns}
                    data={reportData || []}
                    isLoading={isLoading}
                    isEmbedded={true}
                />
            </CardContent>
        )}
      </Card>
    </div>
  );
}
