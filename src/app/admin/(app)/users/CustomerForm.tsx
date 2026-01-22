
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import type { User, Currency } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useCollection, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';


const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  code: z.string().optional(),
  creditLimit: z.coerce.number().optional(),
  currency: z.string().optional(),
  billingAddress: z.string().optional(),
  deliveryAddress: z.string().optional(),
  email: z.string().email('Invalid email address.'),
  telephone: z.string().optional(),
  accountStatus: z.enum(['active', 'blocked']),
});

type CustomerFormValues = z.infer<typeof formSchema>;

interface CustomerFormProps {
  customer?: User;
  isOnlineCustomer?: boolean;
}

export function CustomerForm({ customer, isOnlineCustomer = false }: CustomerFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const firestore = useFirestore();

  const currenciesQuery = useMemo(() => (firestore ? collection(firestore, 'currencies') : null), [firestore]);
  const { data: currencies, isLoading: isLoadingCurrencies } = useCollection<Currency>(currenciesQuery);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: customer
      ? {
          ...customer,
          name: customer.name || '',
          code: customer.code || '',
          creditLimit: customer.creditLimit || 0,
          currency: customer.currency || '',
          billingAddress: customer.billingAddress || '',
          deliveryAddress: customer.deliveryAddress || '',
          email: customer.email || '',
          telephone: customer.telephone || '',
          accountStatus: customer.accountStatus || 'active',
        }
      : {
          name: '',
          code: '',
          creditLimit: 0,
          currency: '',
          billingAddress: '',
          deliveryAddress: '',
          email: '',
          telephone: '',
          accountStatus: 'active',
        },
  });

  async function onSubmit(values: CustomerFormValues) {
    if (!firestore) return;
    setIsSaving(true);
    
    const destination = isOnlineCustomer ? '/admin/users/online' : '/admin/users/local';

    try {
      if (customer) {
        // Update logic
        const customerRef = doc(firestore, 'users', customer.id);
        const dataToUpdate = { ...values, updatedAt: new Date().toISOString() };
        await updateDoc(customerRef, dataToUpdate).catch(async (error) => {
          const contextualError = await FirestorePermissionError.create({ path: customerRef.path, operation: 'update', requestResourceData: dataToUpdate });
          errorEmitter.emit('permission-error', contextualError);
          throw error;
        });
        toast({ title: 'Customer Updated', description: `Customer "${values.name}" has been updated.` });
      } else {
        // Create logic for local customers
        const customerRef = collection(firestore, 'users');
        const newCustomerData = {
          ...values,
          id: '', // Will be set after creation
          customerType: 'LOCAL' as const,
          roles: ['CUSTOMER'] as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const docRef = await addDoc(customerRef, newCustomerData).catch(async (error) => {
          const contextualError = await FirestorePermissionError.create({ path: customerRef.path, operation: 'create', requestResourceData: newCustomerData });
          errorEmitter.emit('permission-error', contextualError);
          throw error;
        });
        // Now update the document with its own ID
        await updateDoc(doc(firestore, 'users', docRef.id), { id: docRef.id });
        toast({ title: 'Customer Created', description: `Customer "${values.name}" has been created.` });
      }
      router.push(destination);
      router.refresh();
    } catch (e: any) {
       if (!(e instanceof FirestorePermissionError)) {
          toast({ variant: 'destructive', title: 'Error', description: 'Operation failed. Please try again.' });
       }
    } finally {
      setIsSaving(false);
    }
  }

  const handleDelete = async () => {
    if (!firestore || !customer) return;
    setIsSaving(true);
    try {
      const docRef = doc(firestore, 'users', customer.id);
      await deleteDoc(docRef).catch(async (error) => {
        const contextualError = await FirestorePermissionError.create({ path: docRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', contextualError);
        throw error;
      });
      toast({ title: 'Customer Deleted', description: `Customer "${customer.name}" has been deleted.` });
      router.push('/admin/users/local');
      router.refresh();
    } catch (e: any) {
       if (!(e instanceof FirestorePermissionError)) {
          toast({ variant: 'destructive', title: 'Error', description: 'Delete failed. Check permissions.' });
       }
    } finally {
       setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Alfreds Futterkiste" {...field} disabled={isSaving} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} disabled={isSaving || isOnlineCustomer} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="creditLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit Limit</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="7000" {...field} onChange={e => field.onChange(e.target.valueAsNumber || 0)} disabled={isSaving || isOnlineCustomer} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCurrencies || isSaving || isOnlineCustomer}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {currencies?.map((c) => (
                        <SelectItem key={c.id} value={c.code}>
                          {c.name} ({c.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="billingAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Obere Str. 57, Berlin..." {...field} className="min-h-[120px]" disabled={isSaving} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deliveryAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="If different from billing address..." {...field} className="min-h-[120px]" disabled={isSaving} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="customer@example.com" {...field} disabled={isSaving || !!customer} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountStatus"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value === 'blocked'}
                      onCheckedChange={(checked) => field.onChange(checked ? 'blocked' : 'active')}
                      disabled={isSaving}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Inactive / Blocked</FormLabel>
                    <FormDescription>Mark the customer account as inactive to block them.</FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custom Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="telephone"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Telephone</FormLabel>
                  <FormControl>
                    <Input placeholder="030-0074321" {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-start gap-2">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (customer ? 'Update' : 'Save')}
          </Button>
           {customer && !isOnlineCustomer && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" disabled={isSaving}>Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the customer account for &quot;{customer.name}&quot;.
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
           )}
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

    