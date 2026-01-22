
'use client';

import { useMemo, useState } from 'react';
import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { Payment, User, Invoice } from '@/lib/types';
import { z } from 'zod';
import { ColumnDef } from '@tanstack/react-table';
import { useCollection, useFirestore } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { ExternalLink, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useSettings } from '@/hooks/useSettings';


const paymentSchema = z.object({
  name: z.string().optional(),
  userId: z.string().min(1, 'Customer is required.'),
  invoiceId: z.string().min(1, 'Invoice is required.'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0.'),
  paymentDate: z.date({ required_error: 'Payment date is required.' }),
  paymentType: z.enum(['Cash', 'Cheque'], { required_error: 'Payment type is required.' }),
  payeeName: z.string().optional(),
  bankName: z.string().optional(),
  chequeNumber: z.string().optional(),
});


export default function AdminPaymentsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { defaultCurrency } = useSettings();
  const currencySymbol = defaultCurrency?.symbol || '$';

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Payment | null>(null);

  const usersQuery = useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const invoicesQuery = useMemo(() => firestore ? collection(firestore, 'invoices') : null, [firestore]);
  const { data: invoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(invoicesQuery);
  
  const handleOpenForm = (item: Payment | null = null) => {
    // This function will be passed to AttributeManagementPage, but we need to open the dialog from here
    // to handle form state properly. We'll pass a dummy function to the generic page.
    console.log("Edit requested for:", item);
  }

  const handleOpenAlert = (item: Payment) => {
    setSelectedItem(item);
    setIsAlertOpen(true);
  };
  
  const handleDelete = async () => {
    if (!firestore || !selectedItem) return;
    const docRef = doc(firestore, 'payments', selectedItem.id);
    try {
        await deleteDoc(docRef);
        toast({ title: 'Success', description: 'Payment deleted.' });
    } catch(e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete payment.' });
    } finally {
        setIsAlertOpen(false);
    }
  }


  const columns: ColumnDef<Payment>[] = useMemo(() => [
    {
      id: 'customer',
      header: 'Customer',
      cell: ({ row }) => {
        const user = users?.find(u => u.id === row.original.userId);
        return user?.name || 'N/A';
      },
    },
    {
      accessorKey: 'invoiceId',
      header: 'Invoice #',
      cell: ({ row }) => (
        <Link href={`/admin/invoices/${row.original.invoiceId}`} className="font-mono text-xs hover:underline">
            #{row.original.invoiceId.substring(0, 8)}
        </Link>
      )
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => `${currencySymbol}${row.original.amount.toFixed(2)}`,
    },
    {
      accessorKey: 'paymentDate',
      header: 'Payment Date',
      cell: ({ row }) => new Date(row.original.paymentDate).toLocaleDateString(),
    },
    {
      accessorKey: 'paymentType',
      header: 'Payment Type',
      cell: ({ row }) => (
        <div>
            <Badge variant="secondary">{row.original.paymentType}</Badge>
            {row.original.paymentType === 'Cash' && row.original.payeeName && (
                <p className="text-xs text-muted-foreground">Payee: {row.original.payeeName}</p>
            )}
            {row.original.paymentType === 'Cheque' && row.original.chequeNumber && (
                 <p className="text-xs text-muted-foreground">Cheque: {row.original.chequeNumber}</p>
            )}
        </div>
      ),
    },
    {
        id: 'actions',
        cell: ({ row }) => {
            const item = row.original;
            return (
                 <div className="flex justify-end items-center">
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                         <DropdownMenuItem asChild>
                            <Link href={`/admin/payments/${item.id}`}>View Voucher</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => alert('Edit is handled on the Invoices page.')} disabled>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenAlert(item)} className="text-destructive">
                        Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )
        }
    }
  ], [users, currencySymbol]);

  const formFields = useMemo(() => [
    { name: 'name' as const, label: 'Payment Name (use Invoice ID)', placeholder: 'Invoice ID' },
    {
      name: 'userId' as const,
      label: 'Customer',
      placeholder: 'Select a customer',
      type: 'select' as const,
      options: users?.map(u => ({ value: u.id, label: u.name || u.email })) || [],
      isLoading: isLoadingUsers,
    },
    {
      name: 'invoiceId' as const,
      label: 'Invoice',
      placeholder: 'Select an invoice',
      type: 'select' as const,
      options: invoices?.map(i => ({ value: i.id, label: `#${i.id.substring(0,8)} - ${currencySymbol}${i.totalAmount.toFixed(2)}` })) || [],
      isLoading: isLoadingInvoices,
    },
    { name: 'amount' as const, label: 'Amount', placeholder: '0.00', type: 'number' as const },
    { name: 'paymentDate', label: 'Payment Date', placeholder: 'Select date', type: 'date' as const },
    {
      name: 'paymentType' as const,
      label: 'Payment Type',
      placeholder: 'Select a payment type',
      type: 'select' as const,
      options: [
        { value: 'Cash', label: 'Cash' },
        { value: 'Cheque', label: 'Cheque' },
      ],
    },
    { name: 'payeeName' as const, label: 'Payee Name (for Cash)', placeholder: 'e.g., John Doe' },
    { name: 'bankName' as const, label: 'Bank Name (for Cheque)', placeholder: 'e.g., Bank of America' },
    { name: 'chequeNumber' as const, label: 'Cheque Number', placeholder: 'e.g., 123456' },
  ], [users, invoices, isLoadingUsers, isLoadingInvoices, currencySymbol]);

  const CustomAttributePage = () => {
    return (
        <>
        <AttributeManagementPage<Payment>
            collectionName="payments"
            title="Payments"
            description="Manage all customer payments."
            columns={columns}
            formSchema={paymentSchema}
            formFields={formFields}
            showAddNewButton={false} // Add button is removed, payments are created from invoices
            renderCustomFormField={({ field, form }) => {
                const paymentType = form.watch('paymentType');

                if (field.type === 'number') {
                    return (
                        <FormField
                            key={String(field.name)}
                            control={form.control}
                            name={field.name}
                            render={({ field: formField }) => (
                                <FormItem>
                                <FormLabel>{field.label}</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder={field.placeholder}
                                        type="number"
                                        step="0.01"
                                        {...form.register(field.name, { valueAsNumber: true })}
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )
                }

                if (field.name === 'payeeName' && paymentType !== 'Cash') return null;
                if ((field.name === 'bankName' || field.name === 'chequeNumber') && paymentType !== 'Cheque') return null;

                if (field.name === 'payeeName' || field.name === 'bankName' || field.name === 'chequeNumber') {
                     return (
                        <FormField
                            key={String(field.name)}
                            control={form.control}
                            name={field.name}
                            render={({ field: formField }) => (
                                <FormItem>
                                <FormLabel>{field.label}</FormLabel>
                                <FormControl>
                                    <Input placeholder={field.placeholder} {...formField} value={formField.value || ''} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                     )
                }


                return null;
            }}
        />
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the payment record.
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
    )
  };
  
  return <CustomAttributePage />;
}
