
'use client';

import { z } from 'zod';
import { ColumnDef } from '@tanstack/react-table';
import { useCollection, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, collectionGroup, doc, updateDoc } from 'firebase/firestore';
import type { DeliveryChallan, Order, User } from '@/lib/types';
import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ExternalLink, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const deliverySchema = z.object({
  orderId: z.string().min(1, 'Order is required.'),
  challanDate: z.coerce.date({ required_error: 'Challan date is required.' }),
  dispatchedBy: z.string().min(1, 'Dispatched by is required.'),
  vehicleNumber: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['dispatched', 'in_transit', 'delivered'], { required_error: 'Status is required.' }),
  name: z.string().optional(),
});


export default function AdminDeliveriesPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const usersQuery = useMemo(() =>
    firestore ? collection(firestore, 'users') : null
  , [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
  
  const ordersQuery = useMemo(() =>
    firestore ? query(collectionGroup(firestore, 'orders')) : null
  , [firestore]);
  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);


  const enrichedOrders = useMemo(() => {
    if (orders && users) {
      const ordersWithData = orders.map(order => ({
        ...order,
        customer: users.find(u => u.id === order.userId)
      }));
      return ordersWithData.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  }, [orders, users])
  
  const handleStatusUpdate = async (delivery: DeliveryChallan, status: DeliveryChallan['status']) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'deliveries', delivery.id);
    try {
        await updateDoc(docRef, { status });
        toast({ title: 'Status Updated', description: `Delivery status set to ${status}.`});
    } catch(e: any) {
        const contextualError = await FirestorePermissionError.create({ path: docRef.path, operation: 'update', requestResourceData: { status } });
        errorEmitter.emit('permission-error', contextualError);
    }
  }


  const columns: ColumnDef<DeliveryChallan>[] = useMemo(() => [
    {
      accessorKey: 'orderId',
      header: 'Order ID',
      cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs">{row.original.orderId.substring(0, 8)}</span>
            <Button asChild variant="ghost" size="icon" className="h-6 w-6">
                <Link href={`/admin/orders/${row.original.orderId}?userId=${enrichedOrders.find(o => o.id === row.original.orderId)?.userId || ''}`} target="_blank">
                    <ExternalLink className="h-3 w-3" />
                </Link>
            </Button>
          </div>
      )
    },
    {
        id: 'customer',
        header: 'Customer',
        cell: ({ row }) => {
            const order = enrichedOrders.find(o => o.id === row.original.orderId);
            const customer = order?.customer;

            if (!customer) {
                return isLoadingOrders || isLoadingUsers ? '...' : 'N/A';
            }

            return (
                <div>
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-muted-foreground">{customer.email}</div>
                </div>
            )
        }
    },
    {
        accessorKey: 'challanDate',
        header: 'Challan Date',
        cell: ({ row }) => new Date(row.original.challanDate).toLocaleDateString(),
    },
    {
      accessorKey: 'dispatchedBy',
      header: 'Dispatched By',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        let variant: "default" | "secondary" | "outline" | "destructive" = "secondary";
        if (status === 'delivered') variant = 'default';
        if (status === 'in_transit') variant = 'outline';
        
        return <Badge variant={variant} className="capitalize">{status}</Badge>
      }
    },
     {
        id: 'actions',
        cell: ({ row, ...props }) => {
            const delivery = row.original;
            return (
                <div className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                             <DropdownMenuItem asChild>
                                <Link href={`/admin/deliveries/${delivery.id}`}>View / Print Note</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => (props.table.options.meta as any)?.handleOpenForm(delivery)}
                            >
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                             <DropdownMenuItem
                                disabled={delivery.status === 'in_transit'}
                                onClick={() => handleStatusUpdate(delivery, 'in_transit')}
                            >
                                Mark as In Transit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                disabled={delivery.status === 'delivered'}
                                onClick={() => handleStatusUpdate(delivery, 'delivered')}
                            >
                                Mark as Delivered
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => (props.table.options.meta as any)?.handleOpenAlert(delivery)}
                            >
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            );
        },
    },
  ], [enrichedOrders, isLoadingOrders, isLoadingUsers]);

  const formFields = useMemo(() => [
    {
      name: 'orderId' as const,
      label: 'Order',
      placeholder: 'Select an order',
      type: 'select' as const,
      options: enrichedOrders.map(o => {
          const customerName = o.customer?.name || 'Unknown';
          return { value: o.id, label: `#${o.id.substring(0, 8)} (${customerName})` };
      }),
      isLoading: isLoadingOrders
    },
    { name: 'name', label: 'Challan Name', placeholder: 'Auto-filled from Order ID', type: 'hidden' as const },
    { name: 'challanDate', label: 'Challan Date', placeholder: 'Select date', type: 'date' as const, description: 'e.g., MM/DD/YYYY' },
    { name: 'dispatchedBy', label: 'Dispatched By', placeholder: 'e.g., John Doe' },
    { name: 'vehicleNumber', label: 'Vehicle Number', placeholder: 'e.g., AB-1234' },
    { name: 'description', label: 'Description', placeholder: 'Add delivery notes...' },
    {
        name: 'status' as const,
        label: 'Status',
        placeholder: 'Select a status',
        type: 'select' as const,
        options: [
            { value: 'dispatched', label: 'Dispatched' },
            { value: 'in_transit', label: 'In Transit' },
            { value: 'delivered', label: 'Delivered' }
        ]
    }
  ], [enrichedOrders, isLoadingOrders]);

  const useFormWithOrderIdEffect = () => {
    const form = useForm({
      resolver: zodResolver(deliverySchema),
      defaultValues: {
        orderId: '',
        name: '',
        challanDate: new Date(),
        dispatchedBy: '',
        vehicleNumber: '',
        description: '',
        status: 'dispatched',
      }
    });

    const orderId = form.watch('orderId');

    useEffect(() => {
      if (orderId) {
        form.setValue('name', orderId, { shouldValidate: true });
      }
    }, [orderId, form]);

    return form;
  };

  return (
      <AttributeManagementPage<DeliveryChallan>
        collectionName="deliveries"
        title="Delivery Notes"
        description="Manage all delivery challans for orders."
        columns={columns}
        formSchema={deliverySchema}
        formFields={formFields}
        useCustomFormHook={useFormWithOrderIdEffect}
        showAddNewButton={true}
      />
  );
}
