
'use client';

import { useMemo, useEffect } from 'react';
import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { CreditNote, User } from '@/lib/types';
import { z } from 'zod';
import { ColumnDef } from '@tanstack/react-table';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useSettings } from '@/hooks/useSettings';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';


const creditNoteSchema = z.object({
  userId: z.string().min(1, 'Customer is required.'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0.'),
  reason: z.string().min(1, 'Reason is required.'),
  issueDate: z.date({ required_error: 'Issue date is required.' }),
  name: z.string().optional(),
});


export default function AdminCreditNotesPage() {
  const firestore = useFirestore();
  const { defaultCurrency } = useSettings();
  const currencySymbol = defaultCurrency?.symbol || '$';

  const usersQuery = useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);


  const columns: ColumnDef<CreditNote>[] = useMemo(() => [
    {
      id: 'customer',
      header: 'Customer',
      cell: ({ row }) => {
        const user = users?.find(u => u.id === row.original.userId);
        return user?.name || 'N/A';
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
  ], [users, currencySymbol]);

  const formFields = useMemo(() => [
    {
      name: 'userId' as const,
      label: 'Customer',
      placeholder: 'Select a customer',
      type: 'select' as const,
      options: users?.map(u => ({ value: u.id, label: u.name || u.email })) || [],
      isLoading: isLoadingUsers,
    },
    { name: 'reason' as const, label: 'Reason', placeholder: 'e.g., Return of goods' },
    { name: 'amount' as const, label: 'Amount', placeholder: '0.00', type: 'number' as const },
    { name: 'issueDate', label: 'Issue Date', placeholder: 'Select date', type: 'date' as const },
    { name: 'name' as const, label: 'Name (auto-filled)', placeholder: '', type: 'hidden' as const },
  ], [users, isLoadingUsers]);

  // Custom hook to sync reason with name
  const useFormWithReasonSync = () => {
    const form = useForm({
      resolver: zodResolver(creditNoteSchema),
      defaultValues: {
        userId: '',
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

  const CustomCreditNotePage = () => {
    return (
        <AttributeManagementPage<CreditNote>
            collectionName="creditNotes"
            title="Credit Notes"
            description="Manage credit notes issued to customers."
            columns={columns}
            formSchema={creditNoteSchema}
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
  
  return <CustomCreditNotePage />;
}
