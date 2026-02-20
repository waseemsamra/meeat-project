'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCollection, useFirestore, errorEmitter, FirestorePermissionError, useUser } from '@/firebase';
import { collection, query, where, writeBatch, doc } from 'firebase/firestore';
import type { User, Product, MeasurementUnit, InventoryLot, Order as OrderType, OrderItem, Address } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Form } from '@/components/ui/form';
import { useTranslation } from '@/hooks/useTranslation';

const lineItemSchema = z.object({
  inventoryLotId: z.string().min(1, 'Lot is required.'),
  productId: z.string(),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unit is required.'),
  quantity: z.coerce.number().min(1, 'Qty must be at least 1.'),
  unitPrice: z.coerce.number().min(0, 'Price must be positive.'),
  taxCode: z.string().optional(),
});

const salesOrderSchema = z.object({
  date: z.date(),
  reference: z.string().optional(),
  customerId: z.string().min(1, 'Customer is required.'),
  billingAddress: z.string().optional(),
  description: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one item is required.'),
});

type SalesOrderFormValues = z.infer<typeof salesOrderSchema>;

export default function NewSalesOrderPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const { user: adminUser } = useUser();
  const { t } = useTranslation();

  const form = useForm<SalesOrderFormValues>({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: {
      date: new Date(),
      lineItems: [{ inventoryLotId: '', productId: '', description: '', unit: '', quantity: 1, unitPrice: 0 }],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems"
  });

  const usersQuery = useMemo(() =>
    firestore ? query(collection(firestore, 'users'), where('customerType', '==', 'LOCAL')) : null
  , [firestore]);
  const { data: customers, isLoading: isLoadingCustomers } = useCollection<User>(usersQuery);

  const productsQuery = useMemo(() =>
    firestore ? collection(firestore, 'products') : null
  , [firestore]);
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);
  
  const measurementUnitsQuery = useMemo(() =>
    firestore ? collection(firestore, 'measurementUnits') : null
  , [firestore]);
  const { data: measurementUnits, isLoading: isLoadingMeasurementUnits } = useCollection<MeasurementUnit>(measurementUnitsQuery);
  
  const inventoryLotsQuery = useMemo(() =>
    firestore ? collection(firestore, 'inventoryLots') : null
  , [firestore]);
  const { data: inventoryLots, isLoading: isLoadingInventoryLots } = useCollection<InventoryLot>(inventoryLotsQuery);


  const selectedCustomerId = form.watch('customerId');
  const lineItems = form.watch('lineItems');

  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers?.find(c => c.id === selectedCustomerId);
      if (customer?.billingAddress) {
        form.setValue('billingAddress', customer.billingAddress);
      } else {
        form.setValue('billingAddress', '');
      }
    }
  }, [selectedCustomerId, customers, form]);
  
  const handleLotChange = (lotId: string, index: number) => {
    const lot = inventoryLots?.find(l => l.id === lotId);
    const product = products?.find(p => p.id === lot?.productId);
    if (lot && product) {
      form.setValue(`lineItems.${index}.productId`, product.id);
      form.setValue(`lineItems.${index}.description`, t(product.name));
      form.setValue(`lineItems.${index}.unit`, lot.unit);
      form.setValue(`lineItems.${index}.unitPrice`, product.price); 
    }
  }
  
  const total = useMemo(() => {
      return lineItems.reduce((acc, item) => {
          const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
          return acc + itemTotal;
      }, 0);
  }, [lineItems]);

  const onSubmit = async (data: SalesOrderFormValues) => {
    if (!firestore || !adminUser || !adminUser.roles?.includes('ADMIN')) {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'You do not have permission to create sales orders.' });
      return;
    }
    setIsSaving(true);
    
    try {
        const batch = writeBatch(firestore);
        
        // Write to root /orders collection
        const orderRef = doc(collection(firestore, 'orders'));
        
        const orderItemsData = data.lineItems.map((item) => {
            const orderItemRef = doc(collection(firestore, 'orders_items'));
            const newOrderItem = {
                id: orderItemRef.id,
                orderId: orderRef.id,
                productId: item.productId,
                quantity: item.quantity,
                price: item.unitPrice,
                selectedUnit: item.unit,
            }
            batch.set(orderItemRef, newOrderItem);
            return newOrderItem;
        });

        const customer = customers?.find(c => c.id === data.customerId);
        const shippingAddressObject: Omit<Address, "id" | "userId" | "isDefault"> | null = customer?.deliveryAddress
            ? {
                fullName: customer?.name || '',
                street: customer.deliveryAddress,
                city: '',
                state: '',
                zipCode: '',
                country: customer?.country || '',
            }
            : null;

        const orderData: Omit<OrderType, 'id'> = {
            userId: data.customerId,
            orderType: 'LOCAL',
            orderItemIds: orderItemsData.map(item => ({ id: item.id, productId: item.productId, quantity: item.quantity, price: item.price, selectedUnit: item.selectedUnit })),
            total: total,
            shippingAddress: shippingAddressObject,
            paymentStatus: 'unpaid',
            fulfillmentStatus: 'processing',
            stripePaymentIntentId: null,
            createdAt: data.date.toISOString(),
            updatedAt: new Date().toISOString(),
            description: data.description,
            qtyToDeliver: data.lineItems.reduce((acc, item) => acc + item.quantity, 0),
        };
        
        batch.set(orderRef, { id: orderRef.id, ...orderData });
        
        await batch.commit();
        
        toast({ title: 'Sales Order Created', description: 'The new sales order has been saved.' });
        router.push('/admin/orders/sales');
        router.refresh();

    } catch (e: any) {
        console.error("Failed to save sales order:", e);
        const contextualError = await FirestorePermissionError.create({
            path: 'orders',
            operation: 'create',
            requestResourceData: data,
        });
        errorEmitter.emit('permission-error', contextualError);
        toast({ variant: 'destructive', title: 'Error Saving Order', description: e.message || 'An unknown error occurred.' });
    } finally {
        setIsSaving(false);
    }
  }

  const isLoading = isLoadingCustomers || isLoadingProducts || isLoadingMeasurementUnits || isLoadingInventoryLots;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">New Sales Order</h1>
          <p className="text-muted-foreground">Create a new sales order for a local customer.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()} disabled={isSaving}>Cancel</Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isSaving}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Sales Order'}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <div className="space-y-8">
          <Card>
            <CardHeader><CardTitle>Sales Order</CardTitle></CardHeader>
            <CardContent className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                      <Label>Date</Label>
                      <Controller
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                           <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                            </Popover>
                        )}
                      />
                  </div>
                  <div className="space-y-2">
                      <Label>Reference</Label>
                      <Input {...form.register('reference')} placeholder="Optional" />
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Customer</Label>
                        <Controller
                            control={form.control}
                            name="customerId"
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCustomers}>
                                    <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
                                    <SelectContent>
                                        {customers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                         {form.formState.errors.customerId && <p className="text-destructive text-sm">{form.formState.errors.customerId.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label>Billing Address</Label>
                        <Textarea {...form.register('billingAddress')} placeholder="Customer's billing address" />
                    </div>
               </div>
               <div className="space-y-2">
                    <Label>Description</Label>
                    <Input {...form.register('description')} placeholder="Optional description for the order" />
                </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>Items</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-1/4">Inventory Lot</TableHead>
                            <TableHead className="w-1/3">Description</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.map((field, index) => {
                            const item = lineItems[index];
                            const itemTotal = (item?.quantity || 0) * (item?.unitPrice || 0);
                            return (
                                <TableRow key={field.id}>
                                    <TableCell>
                                        <Controller
                                            control={form.control}
                                            name={`lineItems.${index}.inventoryLotId`}
                                            render={({ field: controllerField }) => (
                                                <Select onValueChange={(value) => { controllerField.onChange(value); handleLotChange(value, index); }} value={controllerField.value} disabled={isLoading}>
                                                    <SelectTrigger><SelectValue placeholder="Select a lot" /></SelectTrigger>
                                                    <SelectContent>
                                                        {inventoryLots?.map(l => {
                                                            const p = products?.find(prod => prod.id === l.productId);
                                                            return <SelectItem key={l.id} value={l.id}>{t(p?.name)} - {l.unit} (Lot: {l.id.substring(0,6)})</SelectItem>
                                                        })}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell><Input {...form.register(`lineItems.${index}.description`)} placeholder="Item description" readOnly /></TableCell>
                                    <TableCell>
                                        <Controller
                                            control={form.control}
                                            name={`lineItems.${index}.quantity`}
                                            render={({ field: controllerField }) => (
                                                <Input
                                                type="number"
                                                {...controllerField}
                                                className="w-20"
                                                onChange={e => controllerField.onChange(e.target.valueAsNumber || 0)}
                                                />
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Controller
                                            control={form.control}
                                            name={`lineItems.${index}.unit`}
                                            render={({ field: controllerField }) => (
                                                <Select onValueChange={controllerField.onChange} value={controllerField.value} disabled={isLoadingMeasurementUnits}>
                                                    <SelectTrigger className="w-28"><SelectValue placeholder="Unit" /></SelectTrigger>
                                                    <SelectContent>
                                                        {measurementUnits?.map(unit => <SelectItem key={unit.id} value={unit.name}>{unit.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell>
                                         <Controller
                                            control={form.control}
                                            name={`lineItems.${index}.unitPrice`}
                                            render={({ field: controllerField }) => (
                                                <Input
                                                type="number"
                                                step="0.01"
                                                {...controllerField}
                                                className="w-24"
                                                onChange={e => controllerField.onChange(e.target.valueAsNumber || 0)}
                                                />
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right font-medium">${itemTotal.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
                {form.formState.errors.lineItems && <p className="text-destructive text-sm mt-2">{form.formState.errors.lineItems.message || form.formState.errors.lineItems.root?.message}</p>}
                <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ inventoryLotId: '', productId: '', description: '', unit: '', quantity: 1, unitPrice: 0 })}>Add Line</Button>
                <div className="mt-6 flex justify-end">
                    <div className="w-full max-w-sm space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
          </Card>
        </div>
      </Form>
    </div>
  );
}
