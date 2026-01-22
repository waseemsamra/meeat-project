
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
import { useCollection, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, orderBy, collectionGroup, doc, updateDoc, writeBatch, addDoc, deleteDoc } from 'firebase/firestore';
import type { Invoice, Order, User, Payment, PaymentType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useMemo, useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useSettings } from '@/hooks/useSettings';


function InvoiceRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><div className="flex justify-end"><Skeleton className="h-8 w-8" /></div></TableCell>
    </TableRow>
  );
}

export default function AdminInvoicesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { defaultCurrency } = useSettings();
  const currencySymbol = defaultCurrency?.symbol || '$';
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>('Cash');
  const [payeeName, setPayeeName] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);


  const invoicesQuery = useMemo(() => firestore ? query(collection(firestore, 'invoices'), orderBy('invoiceDate', 'desc')) : null, [firestore]);
  const { data: invoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(invoicesQuery);

  const ordersQuery = useMemo(() => firestore ? query(collectionGroup(firestore, 'orders')) : null, [firestore]);
  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);

  const usersQuery = useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const enrichedInvoices = useMemo(() => {
    if (!invoices || !orders || !users) return [];
    
    const orderMap = new Map(orders.map(o => [o.id, o]));
    const userMap = new Map(users.map(u => [u.id, u]));

    const enriched = invoices.map(invoice => {
      const order = orderMap.get(invoice.orderId);
      const customer = order ? userMap.get(order.userId) : undefined;
      return { ...invoice, order, customer };
    });
    // Sort client-side
    return enriched.sort((a,b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
  }, [invoices, orders, users]);
  
  const handleOpenModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
    // Reset form fields
    setPaymentType('Cash');
    setPayeeName('');
    setBankName('');
    setChequeNumber('');
  }

  const handleConfirmPayment = async () => {
    if (!firestore || !selectedInvoice || !selectedInvoice.order?.userId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not process payment. Missing data.' });
        return;
    };

    const batch = writeBatch(firestore);

    // 1. Update invoice status
    const invoiceRef = doc(firestore, 'invoices', selectedInvoice.id);
    batch.update(invoiceRef, { status: 'paid' });

    // 2. Create payment record
    const paymentRef = doc(collection(firestore, 'payments'));
    
    const paymentData: Omit<Payment, 'id'> = {
        userId: selectedInvoice.order.userId,
        invoiceId: selectedInvoice.id,
        amount: selectedInvoice.totalAmount,
        paymentDate: new Date().toISOString(),
        paymentType: paymentType,
        name: paymentRef.id,
        ...(paymentType === 'Cash' && { payeeName }),
        ...(paymentType === 'Cheque' && { bankName, chequeNumber }),
    };

    batch.set(paymentRef, { ...paymentData, id: paymentRef.id });

    try {
        await batch.commit();
        toast({ title: 'Success', description: `Invoice marked as paid and payment recorded.` });
    } catch(e: any) {
         console.error("Failed to confirm payment:", e);
         const contextualError = await FirestorePermissionError.create({ path: 'batch-write', operation: 'write', requestResourceData: { invoiceUpdate: {status: 'paid'}, paymentCreate: paymentData } });
         errorEmitter.emit('permission-error', contextualError);
    } finally {
        setIsModalOpen(false);
        setSelectedInvoice(null);
    }
  }
  
  const updateInvoiceStatus = async (invoiceId: string, status: Invoice['status']) => {
    if (!firestore) return;
    const invoiceRef = doc(firestore, 'invoices', invoiceId);
    try {
        await updateDoc(invoiceRef, { status: status });
        toast({
            title: "Invoice Updated",
            description: `Invoice status changed to ${status}.`
        });
    } catch(e: any) {
        const contextualError = await FirestorePermissionError.create({ path: invoiceRef.path, operation: 'update', requestResourceData: { status } });
        errorEmitter.emit('permission-error', contextualError);
        console.error("Failed to update invoice status:", e);
    }
  }

  const handleOpenAlert = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!firestore || !selectedInvoice) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete invoice. Missing data.' });
      return;
    };
    const docRef = doc(firestore, 'invoices', selectedInvoice.id);
    try {
      await deleteDoc(docRef);
      toast({ title: 'Success', description: 'Invoice deleted.'});
    } catch (e: any) {
      const contextualError = await FirestorePermissionError.create({ path: docRef.path, operation: 'delete' });
      errorEmitter.emit('permission-error', contextualError);
    } finally {
      setIsAlertOpen(false);
      setSelectedInvoice(null);
    }
  }

  const isLoading = isLoadingInvoices || isLoadingOrders || isLoadingUsers;

  return (
    <>
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold">Invoices</h1>
            <p className="text-muted-foreground">Manage all order invoices.</p>
        </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <InvoiceRowSkeleton key={i} />)
              ) : enrichedInvoices.length > 0 ? (
                enrichedInvoices.slice(0, visibleCount).map((invoice) => {
                    const status = invoice.status;
                    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
                    if (status === 'paid') variant = 'default';
                    if (status === 'overdue') variant = 'destructive';
                    if (status === 'sent') variant = 'outline';
                  return (
                    <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-xs">#{invoice.id.substring(0, 8)}</TableCell>
                        <TableCell className="font-mono text-xs">#{invoice.orderId.substring(0, 8)}</TableCell>
                        <TableCell>
                            <div className="font-medium">{invoice.customer?.name || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{invoice.customer?.email}</div>
                        </TableCell>
                        <TableCell>{new Date(invoice.invoiceDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell><Badge variant={variant} className="capitalize">{invoice.status}</Badge></TableCell>
                        <TableCell className="text-right">{currencySymbol}{invoice.totalAmount.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  aria-haspopup="true"
                                  size="icon"
                                  variant="ghost"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Toggle menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                    <Link href={`/admin/invoices/${invoice.id}`}>View Invoice</Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Status</DropdownMenuLabel>
                                {status !== 'sent' && status !== 'paid' && <DropdownMenuItem onClick={() => updateInvoiceStatus(invoice.id, 'sent')}>Mark as Sent</DropdownMenuItem>}
                                {status !== 'paid' && <DropdownMenuItem onClick={() => handleOpenModal(invoice)}>Mark as Paid</DropdownMenuItem>}
                                {status === 'paid' && <DropdownMenuItem onClick={() => updateInvoiceStatus(invoice.id, 'unpaid')}>Mark as Unpaid</DropdownMenuItem>}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleOpenAlert(invoice)}>Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No invoices found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {!isLoading && enrichedInvoices.length > visibleCount && (
            <CardFooter className="flex justify-center border-t pt-6">
                <Button onClick={() => setVisibleCount(prev => prev + 20)}>View More</Button>
            </CardFooter>
        )}
      </Card>
    </div>
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Confirm Payment</DialogTitle>
                <DialogDescription>
                    Record payment details for invoice #{selectedInvoice?.id.substring(0,8)}.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor='payment-type'>Payment Method</Label>
                    <Select onValueChange={(value: PaymentType) => setPaymentType(value)} defaultValue={paymentType}>
                        <SelectTrigger id="payment-type">
                            <SelectValue placeholder="Select a method" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Cheque">Cheque</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {paymentType === 'Cash' && (
                     <div className="space-y-2">
                        <Label htmlFor="payee-name">Payee Name</Label>
                        <Input id="payee-name" value={payeeName} onChange={(e) => setPayeeName(e.target.value)} placeholder="Enter name of person paying" />
                     </div>
                )}
                 {paymentType === 'Cheque' && (
                     <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="bank-name">Bank Name</Label>
                            <Input id="bank-name" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Enter bank name" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cheque-number">Cheque Number</Label>
                            <Input id="cheque-number" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} placeholder="Enter cheque number" />
                        </div>
                     </div>
                )}
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleConfirmPayment}>Confirm & Record Payment</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
     <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete invoice #{selectedInvoice?.id.substring(0, 8)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
