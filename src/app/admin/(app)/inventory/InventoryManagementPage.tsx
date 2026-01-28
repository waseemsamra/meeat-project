

'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { MoreHorizontal, PlusCircle, CalendarIcon, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { InventoryLot, Product } from '@/lib/types';
import { errorEmitter, FirestorePermissionError } from '@/firebase';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';

interface InventoryManagementPageProps {
  collectionName: string;
  title: string;
  description: string;
  columns: ColumnDef<InventoryLot>[];
  formSchema: z.ZodSchema<any>;
  products: Product[];
  isLoadingProducts: boolean;
}

export function InventoryManagementPage({
  collectionName,
  title,
  description,
  columns: propColumns,
  formSchema,
  products,
  isLoadingProducts,
}: InventoryManagementPageProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { t } = useTranslation();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryLot | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const queryRef = useMemo(
    () => (firestore ? collection(firestore, collectionName) : null),
    [firestore, collectionName]
  );
  const { data, isLoading: isLoadingLots } = useCollection<InventoryLot>(queryRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: '',
      unit: '',
      quantity: 0,
      purchasePrice: 0,
      shipmentId: '',
      purchaseDate: new Date(),
      shipmentDate: new Date(),
    },
  });

  const handleOpenForm = (item: InventoryLot | null = null) => {
    setSelectedItem(item);
    if (item) {
        form.reset({
            ...item,
            purchaseDate: new Date(item.purchaseDate),
            shipmentDate: new Date(item.shipmentDate),
        });
    } else {
        form.reset({
          productId: '',
          unit: '',
          quantity: 0,
          purchasePrice: 0,
          shipmentId: '',
          purchaseDate: new Date(),
          shipmentDate: new Date(),
        });
    }
    setIsFormOpen(true);
  };

  const handleOpenAlert = (item: InventoryLot) => {
    setSelectedItem(item);
    setIsAlertOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    setIsSaving(true);
    
    const dataToSave = {
        ...values,
        purchaseDate: values.purchaseDate.toISOString(),
        shipmentDate: values.shipmentDate.toISOString(),
    };

    try {
      if (selectedItem) {
        // Update
        const docRef = doc(firestore, collectionName, selectedItem.id);
        await updateDoc(docRef, dataToSave).catch(async (error) => {
          const contextualError = await FirestorePermissionError.create({ path: docRef.path, operation: 'update', requestResourceData: dataToSave });
          errorEmitter.emit('permission-error', contextualError);
          throw error;
        });
        toast({ title: 'Success', description: `Lot updated.` });
      } else {
        // Create
        const collectionRef = collection(firestore, collectionName);
        await addDoc(collectionRef, dataToSave).catch(async (error) => {
          const contextualError = await FirestorePermissionError.create({ path: collectionRef.path, operation: 'create', requestResourceData: dataToSave });
          errorEmitter.emit('permission-error', contextualError);
          throw error;
        });
        toast({ title: 'Success', description: `Lot added.` });
      }
      setIsFormOpen(false);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'Operation failed. Check permissions.' });
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!firestore || !selectedItem) return;

    const docRef = doc(firestore, collectionName, selectedItem.id);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: 'Success', description: `Lot deleted.` });
      })
      .catch(async (error) => {
        const contextualError = await FirestorePermissionError.create({ path: docRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', contextualError);
        toast({ variant: 'destructive', title: 'Error', description: 'Delete failed. Check permissions.' });
      })
      .finally(() => setIsAlertOpen(false));
  };

  const finalColumns: ColumnDef<InventoryLot>[] = [
    ...propColumns,
    {
      id: 'actions',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleOpenForm(item)}>Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleOpenAlert(item)} className="text-destructive">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: data || [],
    columns: finalColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const formFields = [
    { name: 'unit', label: 'Unit', placeholder: 'e.g., 12oz, Full Carcass'},
    { name: 'quantity', label: 'Quantity', placeholder: 'e.g., 100', type: 'number'},
    { name: 'purchasePrice', label: 'Purchase Price', placeholder: 'e.g., 12.50', type: 'number'},
    { name: 'shipmentId', label: 'Shipment ID', placeholder: 'e.g., SHP-12345'},
  ];
  
  const isLoading = isLoadingLots || isLoadingProducts;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Button onClick={() => handleOpenForm()} disabled={isLoadingProducts}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Lot
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {finalColumns.map((col, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={finalColumns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedItem ? 'Edit' : 'Add'} Inventory Lot</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
               <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoadingProducts}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select a product" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {products?.map(option => (
                            <SelectItem key={option.id} value={option.id}>{t(option.name)}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              {formFields.map((fieldInfo) => (
                <FormField
                  key={String(fieldInfo.name)}
                  control={form.control}
                  name={fieldInfo.name as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{fieldInfo.label}</FormLabel>
                      <FormControl>
                        <Input placeholder={fieldInfo.placeholder} {...field} type={fieldInfo.type || 'text'} onChange={e => field.onChange(fieldInfo.type === 'number' ? e.target.valueAsNumber || 0 : e.target.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
               <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="purchaseDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Purchase Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shipmentDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Shipment Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
               </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSaving}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected inventory lot.
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
    </div>
  );
}
