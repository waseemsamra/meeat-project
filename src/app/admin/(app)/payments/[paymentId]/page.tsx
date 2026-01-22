

'use client';

import React, { useMemo } from 'react';
import { useParams, notFound } from 'next/navigation';
import { useDoc, useFirestore, useCollection } from '@/firebase';
import { doc, collection, query, where, documentId, getDocs, collectionGroup } from 'firebase/firestore';
import type { Payment, Invoice, Order, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MeeatLogo } from '@/components/icons';
import { Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function PaymentVoucherSkeleton() {
    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader className="grid grid-cols-2">
                <div><Skeleton className="h-12 w-32" /></div>
                <div className="text-right space-y-2">
                    <Skeleton className="h-8 w-48 ml-auto" />
                    <Skeleton className="h-4 w-32 ml-auto" />
                </div>
            </CardHeader>
            <CardContent className="space-y-8">
                 <div className="grid grid-cols-2">
                    <div className="space-y-1">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="text-right space-y-1">
                        <Skeleton className="h-4 w-24 ml-auto" />
                    </div>
                </div>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-32" />
            </CardContent>
            <CardFooter><Skeleton className="h-10 w-44 ml-auto" /></CardFooter>
        </Card>
    )
}

export default function PaymentVoucherPage() {
  const params = useParams();
  const paymentId = params.paymentId as string;
  const firestore = useFirestore();

  const paymentRef = useMemo(() => (firestore && paymentId ? doc(firestore, 'payments', paymentId) : null), [firestore, paymentId]);
  const { data: payment, isLoading: isLoadingPayment } = useDoc<Payment>(paymentRef);
  
  const [customer, setCustomer] = React.useState<User | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(true);
  
  const usersQuery = useMemo(() => {
    if (!firestore || !payment?.userId) return null;
    return query(collection(firestore, 'users'), where('id', '==', payment.userId));
  }, [firestore, payment]);
  
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  React.useEffect(() => {
    if (users && users.length > 0) {
      setCustomer(users[0]);
    }
     if (!isLoadingPayment && !isLoadingUsers) {
      setIsLoadingDetails(false);
    }
  }, [users, isLoadingPayment, isLoadingUsers]);


  if (isLoadingPayment || isLoadingDetails) {
    return (
      <div className="bg-muted p-4 sm:p-6 md:p-8 print:bg-white">
          <PaymentVoucherSkeleton />
      </div>
    );
  }

  if (!payment) {
    return notFound();
  }
  
  return (
    <div className="bg-muted p-4 sm:p-6 md:p-8 print:bg-white">
      <Card className="max-w-2xl mx-auto print:shadow-none print:border-none">
        <CardHeader className="grid grid-cols-2 gap-4 bg-zinc-100 dark:bg-zinc-800/50 p-8 print:bg-transparent">
          <div>
            <MeeatLogo className="h-12 w-auto text-primary" />
            <p className="text-muted-foreground text-sm mt-2">
                123 Butcher Block Blvd,<br/>
                Meatpacking District, NY 10014
            </p>
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-bold text-primary font-headline">PAYMENT VOUCHER</h1>
            <p className="text-muted-foreground"># {payment.id.substring(0, 8)}</p>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <h3 className="font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Received From</h3>
                    <div className="text-muted-foreground">
                        <p className="font-bold text-lg text-foreground">{customer?.name}</p>
                        <p>{customer?.billingAddress || 'No address on file.'}</p>
                        <p>{customer?.email}</p>
                    </div>
                </div>
                <div className="text-right">
                     <div className="grid grid-cols-2 gap-1 justify-items-end">
                        <span className="font-semibold text-muted-foreground">Payment Date:</span>
                        <span className="text-foreground">{new Date(payment.paymentDate).toLocaleDateString()}</span>
                     </div>
                </div>
            </div>

             <div className="text-center bg-green-50 dark:bg-green-900/20 py-4 rounded-md">
                <p className="text-muted-foreground">Amount Received</p>
                <p className="text-4xl font-bold text-green-700 dark:text-green-400">${payment.amount.toFixed(2)}</p>
            </div>
            
            <div>
                 <h3 className="font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Payment Details</h3>
                 <div className="border rounded-lg p-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="font-medium text-foreground">Payment Method</p>
                        <p className="text-muted-foreground">{payment.paymentType}</p>
                    </div>
                     {payment.paymentType === 'Cash' && payment.payeeName && (
                        <div>
                            <p className="font-medium text-foreground">Received By</p>
                            <p className="text-muted-foreground">{payment.payeeName}</p>
                        </div>
                     )}
                     {payment.paymentType === 'Cheque' && (
                         <>
                            <div>
                                <p className="font-medium text-foreground">Bank Name</p>
                                <p className="text-muted-foreground">{payment.bankName || 'N/A'}</p>
                            </div>
                             <div>
                                <p className="font-medium text-foreground">Cheque Number</p>
                                <p className="text-muted-foreground">{payment.chequeNumber || 'N/A'}</p>
                            </div>
                         </>
                     )}
                     <div>
                        <p className="font-medium text-foreground">Related Invoice</p>
                        <p className="text-muted-foreground font-mono text-xs">#{payment.invoiceId.substring(0,8)}</p>
                    </div>
                 </div>
            </div>

            <Separator />
            <div className="text-center text-sm text-muted-foreground">
                <p>This is an automatically generated receipt. For any queries, contact us at accounts@primecuts.com</p>
            </div>

        </CardContent>
         <CardFooter className="p-8 border-t print:hidden">
            <Button onClick={() => window.print()} className="ml-auto">
                <Download className="mr-2 h-4 w-4" />
                Save as PDF / Print
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
