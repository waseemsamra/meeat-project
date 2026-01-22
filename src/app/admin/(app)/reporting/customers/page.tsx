
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, collectionGroup } from 'firebase/firestore';
import type { User, Order } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Printer } from 'lucide-react';
import printJS from 'print-js';
import { PrintableReport } from '../PrintableReport';
import { ColumnDef } from '@tanstack/react-table';
import { useSettings } from '@/hooks/useSettings';

function CustomerReportSkeleton() {
    return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-9 w-28" /></TableCell>
        </TableRow>
    ));
}

export default function CustomersReportPage() {
  const firestore = useFirestore();
  const { defaultCurrency } = useSettings();
  const currencySymbol = defaultCurrency?.symbol || '$';

  const usersQuery = useMemo(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const ordersQuery = useMemo(() => firestore ? query(collectionGroup(firestore, 'orders')) : null, [firestore]);
  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);
  
  const customerData = useMemo(() => {
    if (!users || !orders) return [];

    const orderMap = new Map<string, { count: number; total: number }>();
    orders.forEach(order => {
        const current = orderMap.get(order.userId) || { count: 0, total: 0 };
        current.count += 1;
        current.total += order.total;
        orderMap.set(order.userId, current);
    });

    return users
        .filter(user => user.roles?.includes('CUSTOMER'))
        .map(user => ({
            ...user,
            orderCount: orderMap.get(user.id)?.count || 0,
            totalSpent: `${currencySymbol}${(orderMap.get(user.id)?.total || 0).toFixed(2)}`,
    }));

  }, [users, orders, currencySymbol]);

  const reportColumns: ColumnDef<any>[] = [
    { accessorKey: 'name', header: 'Customer' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'customerType', header: 'Type' },
    { accessorKey: 'orderCount', header: 'Total Orders' },
    { accessorKey: 'totalSpent', header: 'Total Spent' },
  ];

  const handlePrint = () => {
    printJS({
        printable: 'printable-report',
        type: 'html',
        scanStyles: true,
        documentTitle: 'Customers Report',
        targetStyles: ['*'],
        style: `@page { size: A4; margin: 0; } body { -webkit-print-color-adjust: exact; margin: 20px !important; }`
    })
  }

  const isLoading = isLoadingUsers || isLoadingOrders;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Customers Report</h1>
        <p className="text-muted-foreground">View customer details and their lifetime order value.</p>
      </div>
      <Card>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>All Customers</CardTitle>
                    <CardDescription>A list of all customers and their order history summary.</CardDescription>
                </div>
                <Button onClick={handlePrint} variant="outline" disabled={isLoading}>
                    <Printer className="mr-2 h-4 w-4" /> Print Report
                </Button>
            </div>
        </CardHeader>
        <CardContent className="pt-6">
            <div className="hidden">
                 <PrintableReport
                    title="Customers Report"
                    columns={reportColumns}
                    data={customerData}
                    isLoading={isLoading}
                />
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Total Orders</TableHead>
                        <TableHead className="text-right">Total Spent</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? <CustomerReportSkeleton /> : (
                        customerData.map(customer => (
                            <TableRow key={customer.id}>
                                <TableCell className="font-medium">{customer.name}</TableCell>
                                <TableCell>{customer.email}</TableCell>
                                <TableCell>
                                    <Badge variant={customer.customerType === 'ONLINE' ? 'default' : 'secondary'}>
                                        {customer.customerType}
                                    </Badge>
                                </TableCell>
                                <TableCell>{customer.orderCount}</TableCell>
                                <TableCell className="text-right">{customer.totalSpent}</TableCell>
                                <TableCell className="text-right">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/admin/reporting/customers/${customer.id}`}>View Report</Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                    {!isLoading && customerData.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">No customers found.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
