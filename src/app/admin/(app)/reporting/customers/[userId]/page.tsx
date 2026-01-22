
'use client';

import { useMemo, useState } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { useCollection, useDoc, useFirestore } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import type { Order, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PrintableReport } from '../../PrintableReport';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSettings } from '@/hooks/useSettings';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import printJS from 'print-js';

const reportColumns: ColumnDef<any>[] = [
  { accessorKey: 'id', header: 'Order ID' },
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'total', header: 'Total' },
];

function CustomerReportDetailSkeleton() {
    return (
        <div className="space-y-8">
             <div>
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-1/4 mt-2" />
            </div>
            <Card>
                <CardHeader>
                    <div className="flex justify-end">
                        <Skeleton className="h-10 w-32" />
                    </div>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        </div>
    )
}

export default function CustomerReportDetailPage() {
  const params = useParams();
  const userId = params.userId as string;
  const firestore = useFirestore();
  const router = useRouter();
  const { defaultCurrency } = useSettings();
  const currencySymbol = defaultCurrency?.symbol || '$';
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const userRef = useMemo(() => (firestore && userId ? doc(firestore, 'users', userId) : null), [firestore, userId]);
  const { data: user, isLoading: isLoadingUser } = useDoc<User>(userRef);

  const ordersQuery = useMemo(
    () => (firestore && userId ? query(collection(firestore, `users/${userId}/orders`), orderBy('createdAt', 'desc')) : null),
    [firestore, userId]
  );
  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);

  const reportData = useMemo(() => {
    if (!orders) return [];
    return orders.map(order => ({
      ...order,
      orderIdForLink: order.id,
      id: `#${order.id.substring(0, 8)}`,
      date: format(new Date(order.createdAt), "LLL dd, y"),
      status: order.fulfillmentStatus.replace(/_/g, ' '),
      total: `${currencySymbol}${order.total.toFixed(2)}`,
    }));
  }, [orders, currencySymbol]);

  const handlePrint = () => {
    printJS({
      printable: 'printable-report',
      type: 'html',
      scanStyles: true,
      documentTitle: `Customer Report - ${user?.name || ''}`,
    });
  };
  
  const isLoading = isLoadingUser || isLoadingOrders;

  if (isLoading) {
      return <CustomerReportDetailSkeleton />;
  }

  if (!user) {
    return notFound();
  }

  return (
    <>
      <div className="space-y-8 no-print">
        <div>
          <h1 className="text-3xl font-bold">Customer Order Report</h1>
          <p className="text-muted-foreground">A complete order history for {user.name}.</p>
        </div>
        <Card>
              <CardHeader>
                  <div className="flex justify-between items-start">
                      <div>
                          <CardTitle>{user.name}</CardTitle>
                          <CardDescription>{user.email}</CardDescription>
                      </div>
                      <Button onClick={() => setIsPreviewOpen(true)} variant="outline">
                          <Printer className="mr-2 h-4 w-4" /> Print / Preview
                      </Button>
                  </div>
              </CardHeader>
              <CardContent>
                  <div className="relative w-full overflow-auto">
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  {reportColumns.map(col => (
                                      <TableHead key={col.id || (col as any).accessorKey}>
                                          {col.header as string}
                                      </TableHead>
                                  ))}
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {isLoading ? (
                                  Array.from({ length: 5 }).map((_, i) => (
                                  <TableRow key={i}>
                                      {reportColumns.map((_, j) => (
                                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                                      ))}
                                  </TableRow>
                                  ))
                              ) : reportData?.length ? (
                                  reportData.map((row) => (
                                  <TableRow 
                                      key={row.id} 
                                      className="cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/20"
                                      onClick={() => router.push(`/admin/orders/${row.orderIdForLink}?userId=${userId}&from=customer-report`)}
                                  >
                                      <TableCell>{row.id}</TableCell>
                                      <TableCell>{row.date}</TableCell>
                                      <TableCell>{row.status}</TableCell>
                                      <TableCell>{row.total}</TableCell>
                                  </TableRow>
                                  ))
                              ) : (
                                  <TableRow>
                                  <TableCell colSpan={reportColumns.length} className="h-24 text-center">
                                      No data available for the selected criteria.
                                  </TableCell>
                                  </TableRow>
                              )}
                          </TableBody>
                      </Table>
                  </div>
              </CardContent>
        </Card>
      </div>

       <div className="hidden">
          <PrintableReport
            id="printable-report"
            title={`Order Report: ${user.name}`}
            columns={reportColumns}
            data={reportData}
          />
       </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Print Preview: Order Report for {user.name}</DialogTitle>
            <DialogDescription>
              Review your report before printing. The final output may vary slightly based on your printer settings.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto">
            <PrintableReport
              columns={reportColumns}
              data={reportData}
              isEmbedded={true}
            />
          </div>
           <DialogFooter className="no-print">
            <Button onClick={handlePrint} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download as PDF
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
