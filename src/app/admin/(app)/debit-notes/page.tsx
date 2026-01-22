
'use client';

import { useMemo, useEffect } from 'react';
import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { DebitNote, Vendor } from '@/lib/types';
import { z } from 'zod';
import { ColumnDef } from '@tanstack/react-table';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSettings } from '@/hooks/useSettings';


const debitNoteSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required.'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0.'),
  reason: z.string().min(1, 'Reason is required.'),
  issueDate: z.date({ required_error: 'Issue date is required.' }),
  name: z.string().optional(),
});


export default function AdminDebitNotesPage() {
  const firestore = useFirestore();
  const { defaultCurrency } = useSettings();
  const currencySymbol = defaultCurrency?.symbol || '$';

  const vendorsQuery = useMemo(() => firestore ? collection(firestore, 'vendors') : null, [firestore]);
  const { data: vendors, isLoading: isLoadingVendors } = useCollection<Vendor>(vendorsQuery);


  const columns: ColumnDef<DebitNote>[] = useMemo(() => [
    {
      id: 'vendor',
      header: 'Vendor',
      cell: ({ row }) => {
        const vendor = vendors?.find(v => v.id === row.original.vendorId);
        return vendor?.name || 'N/A';
      },
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => `${currencySymbol}${row.original.amount.toFixed(2)}`,
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
    },
    {
      accessorKey: 'issueDate',
      header: 'Issue Date',
      cell: ({ row }) => new Date(row.original.issueDate).toLocaleDateString(),
    },
  ], [vendors, currencySymbol]);

  const formFields = useMemo(() => [
    {
      name: 'vendorId' as const,
      label: 'Vendor',
      placeholder: 'Select a vendor',
      type: 'select' as const,
      options: vendors?.map(v => ({ value: v.id, label: v.name || 'Unknown Vendor' })) || [],
      isLoading: isLoadingVendors,
    },
    { name: 'reason' as const, label: 'Reason', placeholder: 'e.g., Return of faulty goods' },
    { name: 'amount' as const, label: 'Amount', placeholder: '0.00', type: 'number' as const },
    { name: 'issueDate' as const, label: 'Issue Date', placeholder: 'Select date', type: 'date' as const },
    { name: 'name' as const, label: 'Name (auto-filled)', placeholder: '', type: 'hidden' as const },
  ], [vendors, isLoadingVendors]);

  // Custom hook to sync reason with name
  const useFormWithReasonSync = () => {
    const form = useForm({
      resolver: zodResolver(debitNoteSchema),
      defaultValues: {
        vendorId: '',
        amount: 0,
        reason: '',
        issueDate: new Date(),
        name: '',
      }
    });

    const reason = form.watch('reason');

    useEffect(() => {
      if (reason) {
        form.setValue('name', reason, { shouldValidate: true });
      }
    }, [reason, form]);

    return form;
  };

  const CustomDebitNotePage = () => {
    return (
        <AttributeManagementPage<DebitNote>
            collectionName="debitNotes"
            title="Debit Notes"
            description="Manage debit notes issued to vendors."
            columns={columns}
            formSchema={debitNoteSchema}
            useCustomFormHook={useFormWithReasonSync}
            formFields={formFields}
            renderCustomFormField={({ field, form }) => {
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
                return null;
            }}
        />
    )
  };
  
  return <CustomDebitNotePage />;
}
