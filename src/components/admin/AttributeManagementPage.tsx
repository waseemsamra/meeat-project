
'use client';

import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
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
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { MoreHorizontal, PlusCircle, Loader2, CalendarIcon } from 'lucide-react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { Attribute, LocalizedString } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useTranslation } from '@/hooks/useTranslation';


type FormFieldConfig = {
  name: keyof z.infer<any>;
  label: string;
  placeholder: string;
  type?: 'text' | 'select' | 'date' | 'checkbox' | 'number' | 'hidden';
  options?: { value: string; label: string | LocalizedString }[];
  isLoading?: boolean;
  description?: string;
};

interface AttributeManagementPageProps<T extends Attribute> {
  collectionName: string;
  title: string;
  description: string;
  columns: ColumnDef<T>[];
  formSchema: z.ZodSchema<any>;
  formFields: FormFieldConfig[];
  data?: T[] | null;
  isLoading?: boolean;
  useCustomFormHook?: () => UseFormReturn<any>;
  showAddNewButton?: boolean;
  customHeaderContent?: (handleOpenForm: (item?: T | null) => void) => React.ReactNode;
  renderCustomFormField?: (props: {field: FormFieldConfig, form: UseFormReturn<any>}) => React.ReactNode;
}

export function AttributeManagementPage<T extends Attribute>({
  collectionName,
  title,
  description,
  columns: propColumns,
  formSchema,
  formFields,
  data: propData,
  isLoading: propIsLoading,
  useCustomFormHook,
  showAddNewButton = true,
  customHeaderContent,
  renderCustomFormField,
}: AttributeManagementPageProps<T>) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { t } = useTranslation();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  
  const queryRef = useMemo(
    () => (firestore && !propData ? collection(firestore, collectionName) : null),
    [firestore, collectionName, propData]
  );
  const { data: collectionData, isLoading: isCollectionLoading } = useCollection<T>(queryRef);
  
  const data = propData ?? collectionData;
  const isLoading = propIsLoading ?? isCollectionLoading;

  const defaultFormValues = useMemo(() => {
    return formFields.reduce((acc, field) => {
      if (field.type === 'checkbox') {
        acc[field.name as string] = [];
      } else if (field.type === 'number') {
        acc[field.name as string] = 0;
      } else if (field.type === 'date') {
        acc[field.name as string] = new Date();
      } else {
        acc[field.name as string] = '';
      }
      return acc;
    }, {} as { [key: string]: any });
  }, [formFields]);

  const defaultForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues,
  });
  
  const formHook = useCustomFormHook || (() => defaultForm);
  const form = formHook();

  const handleOpenForm = (item: T | null = null) => {
    setSelectedItem(item);
    if (item) {
        let initialValues: { [key: string]: any } = { ...defaultFormValues, ...item };
        formFields.forEach(field => {
            if (field.type === 'date' && item[field.name] && typeof item[field.name] === 'string') {
                initialValues[field.name as string] = new Date(item[field.name] as string);
            }
             // Ensure even undefined fields from 'item' are set to a defined default
            if (item[field.name] === undefined) {
                 initialValues[field.name as string] = defaultFormValues[field.name as string];
            }
        });
        form.reset(initialValues);
    } else {
      // Adding a new item
      const nextOrder = data ? Math.max(0, ...data.map(d => (d as any).order || 0)) + 1 : 1;

      if (useCustomFormHook) {
        form.reset(); // Resets to the default values specified in the custom hook
        // Now, if there's an 'order' field, update it.
        if (form.getValues().hasOwnProperty('order')) {
            form.setValue('order', nextOrder);
        }
      } else {
        const newDefaults = { ...defaultFormValues };
        if (newDefaults.hasOwnProperty('order')) {
            (newDefaults as any).order = nextOrder;
        }
        form.reset(newDefaults);
      }
    }
    setIsFormOpen(true);
  };

  const handleOpenAlert = (item: T) => {
    setSelectedItem(item);
    setIsAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!firestore || !selectedItem) return;
    try {
        const docRef = doc(firestore, collectionName, selectedItem.id);
        await deleteDoc(docRef);
        toast({ title: 'Success', description: `${title.slice(0, -1)} deleted.` });
    } catch(e: any) {
        const contextualError = await FirestorePermissionError.create({ path: `/${collectionName}/${selectedItem.id}`, operation: 'delete' });
        errorEmitter.emit('permission-error', contextualError);
    } finally {
        setIsAlertOpen(false);
        setSelectedItem(null);
    }
  };
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      const nameValue = values.name?.en || values.name; // Handle both LocalizedString and string
      if (!selectedItem && nameValue) {
        const q = query(collection(firestore, collectionName), where("name.en", "==", nameValue));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          toast({
            variant: "destructive",
            title: "Duplicate Item",
            description: `An item named "${nameValue}" already exists in ${title}.`,
          });
          setIsSaving(false);
          return;
        }
      }
      
      const dataToSave: {[key: string]: any} = { ...values };

      // Convert undefined to null for Firestore compatibility
      Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key] === undefined) {
          dataToSave[key] = null;
        }
      });
      
      formFields.forEach(field => {
        if (field.type === 'date' && dataToSave[field.name] instanceof Date) {
          dataToSave[field.name] = (dataToSave[field.name] as Date).toISOString();
        }
      });
      
      if (selectedItem) {
        const docRef = doc(firestore, collectionName, selectedItem.id);
        await updateDoc(docRef, dataToSave).catch(async (e) => {
          const contextualError = await FirestorePermissionError.create({ path: docRef.path, operation: 'update', requestResourceData: dataToSave });
          errorEmitter.emit('permission-error', contextualError);
          throw e;
        });
        toast({ title: 'Success', description: `${title.slice(0, -1)} updated.` });
      } else {
        const docRef = doc(collection(firestore, collectionName));
        const finalData = { ...dataToSave, id: docRef.id };
        await setDoc(docRef, finalData).catch(async (e) => {
          const contextualError = await FirestorePermissionError.create({ path: `/${collectionName}`, operation: 'create', requestResourceData: finalData });
          errorEmitter.emit('permission-error', contextualError);
          throw e;
        });
        toast({ title: 'Success', description: `${title.slice(0, -1)} added.` });
      }
    } catch (e: any) {
       if (!(e instanceof FirestorePermissionError)) {
          toast({ variant: 'destructive', title: 'Error', description: e.message || 'Operation failed. Check permissions.' });
       }
    } finally {
      setIsSaving(false);
      setIsFormOpen(false);
      setSelectedItem(null);
    }
  };


  const finalColumns: ColumnDef<T>[] = useMemo(() => {
    const hasActionsColumn = propColumns.some(col => col.id === 'actions');
    const actionColumn: ColumnDef<T> = {
      id: 'actions',
      cell: ({ row, table }) => {
        const item = row.original;
        const meta = table.options.meta as {
          handleOpenForm: (item: T) => void,
          handleOpenAlert: (item: T) => void
        };
        return (
          <div className="flex justify-end items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => meta.handleOpenForm(item)}>Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => meta.handleOpenAlert(item)} className="text-destructive">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    };
    return hasActionsColumn ? propColumns : [...propColumns, actionColumn];
  }, [propColumns]);

  const table = useReactTable({
    data: data || [],
    columns: finalColumns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    meta: {
        handleOpenForm: handleOpenForm,
        handleOpenAlert: handleOpenAlert,
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
         {customHeaderContent ? customHeaderContent(handleOpenForm) : (showAddNewButton && (
          <Button onClick={() => handleOpenForm()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                     return (
                        <TableHead key={header.id}>
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                     )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {finalColumns.map((col, j) => {
                       const key = (col as any).id || (col as any).accessorKey || j;
                       return (<TableCell key={key}><Skeleton className="h-5 w-full" /></TableCell>)
                    })}
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.slice(0, visibleCount).map((row) => (
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
        {!isLoading && data && data.length > visibleCount && (
            <CardFooter className="flex justify-center border-t pt-6">
                <Button onClick={() => setVisibleCount(prev => prev + 20)}>View More</Button>
            </CardFooter>
        )}
      </Card>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem ? 'Edit' : 'Add'} {title.slice(0, -1)}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {formFields.map((field) => {
                if (renderCustomFormField) {
                    const customElement = renderCustomFormField({ field, form });
                    if (customElement) {
                        return <React.Fragment key={String(field.name)}>{customElement}</React.Fragment>;
                    }
                }

                if (field.type === 'hidden') return null;

                return (
                  <FormField
                    key={String(field.name)}
                    control={form.control}
                    name={field.name}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel>{field.label}</FormLabel>
                        {field.type === 'select' ? (
                          <Select onValueChange={formField.onChange} value={formField.value || ''} disabled={field.isLoading}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={field.placeholder} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {field.options?.map(option => (
                                <SelectItem key={option.value} value={option.value}>{t(option.label)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.type === 'date' ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn("w-full pl-3 text-left font-normal", !formField.value && "text-muted-foreground")}
                                >
                                  {formField.value ? format(formField.value, "PPP") : <span>{field.placeholder}</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={formField.value} onSelect={formField.onChange} initialFocus />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <FormControl>
                            <Input placeholder={field.placeholder} {...formField} value={formField.value || ''} type={field.type} />
                          </FormControl>
                        )}
                        {field.description && <FormDescription>{field.description}</FormDescription>}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                );
              })}
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
              This action cannot be undone. This will permanently delete the selected item.
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
