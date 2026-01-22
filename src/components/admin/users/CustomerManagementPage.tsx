
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Query,
  DocumentData,
  CollectionReference,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { PlusCircle, UserX, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { User } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';


interface CustomerManagementPageProps {
  title: string;
  description: string;
  customerType?: 'ONLINE' | 'LOCAL';
  displayColumns: ('simple' | 'detailed')[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canBlock: boolean;
}


export function CustomerManagementPage({
  title,
  description,
  customerType,
  displayColumns,
  canCreate,
  canEdit,
  canDelete,
  canBlock,
}: CustomerManagementPageProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'delete' | 'block' | 'unblock'>('delete');
  const [selectedItem, setSelectedItem] = useState<User | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);

  const usersQuery = useMemo((): Query<DocumentData> | CollectionReference<DocumentData> | null => {
    if (!firestore) return null;
    const usersCollection = collection(firestore, 'users');
    if (customerType) {
        return query(usersCollection, where('customerType', '==', customerType));
    }
    return usersCollection;
  }, [firestore, customerType]);

  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const handleOpenAlert = (item: User, type: 'delete' | 'block' | 'unblock') => {
    setSelectedItem(item);
    setAlertType(type);
    setIsAlertOpen(true);
  };

  const handleConfirmAlert = async () => {
    if (!firestore || !selectedItem) return;

    try {
        if (alertType === 'delete') {
            const docRef = doc(firestore, 'users', selectedItem.id);
            await deleteDoc(docRef).catch(async (error) => {
              const contextualError = await FirestorePermissionError.create({ path: docRef.path, operation: 'delete' });
              errorEmitter.emit('permission-error', contextualError);
              throw error; // Re-throw to be caught by the outer try/catch
            });
            toast({ title: 'Success', description: `User "${selectedItem.name}" deleted.` });
        } else {
            const newStatus = alertType === 'block' ? 'blocked' : 'active';
            const docRef = doc(firestore, 'users', selectedItem.id);
            const dataToUpdate = { accountStatus: newStatus, updatedAt: new Date().toISOString() };
            await updateDoc(docRef, dataToUpdate).catch(async (error) => {
                const contextualError = await FirestorePermissionError.create({ path: docRef.path, operation: 'update', requestResourceData: dataToUpdate });
                errorEmitter.emit('permission-error', contextualError);
                throw error; // Re-throw
            });
            toast({ title: 'Success', description: `User account status changed to ${newStatus}.` });
        }
    } catch(e: any) {
        // This will now only catch re-thrown errors. If it's not our specific error, show a generic toast.
        if (!(e instanceof FirestorePermissionError)) {
             toast({ variant: 'destructive', title: 'Error', description: 'Operation failed. Please try again.' });
        }
    } finally {
        setIsAlertOpen(false);
    }
  };
  
  const alertContent = {
      delete: {
          title: "Are you absolutely sure?",
          description: "This action cannot be undone. This will permanently delete the user account.",
          actionText: "Delete"
      },
      block: {
          title: "Block this user?",
          description: "This will block the user's account, preventing them from logging in.",
          actionText: "Block"
      },
      unblock: {
          title: "Unblock this user?",
          description: "This will reactivate the user's account, allowing them to log in again.",
          actionText: "Unblock"
      }
  }

  const columns = useMemo(() => {
    const baseCols: ColumnDef<User>[] = [
        {
            accessorKey: 'name',
            header: 'Name',
            cell: ({ row }) => <div className="font-medium">{row.original.name}</div>
        },
    ];

    if (displayColumns.includes('detailed')) {
      baseCols.push(
        { 
            accessorKey: 'email', 
            header: 'Email'
        },
        {
          accessorKey: 'billingAddress',
          header: 'Billing Address',
        },
         {
          accessorKey: 'creditLimit',
          header: 'Credit Limit',
          cell: ({row}) => row.original.creditLimit ? `$${row.original.creditLimit.toFixed(2)}` : 'N/A'
        },
        {
          accessorKey: 'updatedAt',
          header: 'Last Updated',
          cell: ({ row }) => new Date(row.original.updatedAt).toLocaleString(),
        }
      );
    } else { // 'simple' view
        baseCols.push(
             {
                accessorKey: 'email',
                header: 'Email',
            },
            {
                accessorKey: 'roles',
                header: 'Role',
                cell: ({ row }) => <Badge variant="outline">{(row.original.roles || []).join(', ') || 'N/A'}</Badge>,
            },
             {
                accessorKey: 'customerType',
                header: 'Customer Type',
                cell: ({ row }) => row.original.customerType ? <Badge variant={row.original.customerType === 'ONLINE' ? 'default' : 'secondary'}>{row.original.customerType}</Badge> : null,
            },
            {
                accessorKey: 'accountStatus',
                header: 'Status',
                cell: ({ row }) => <Badge variant={row.original.accountStatus === 'active' ? 'default' : 'destructive'}>{row.original.accountStatus}</Badge>,
            },
            {
                accessorKey: 'createdAt',
                header: 'Joined',
                cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
            }
        )
    }

    baseCols.push({
        id: 'actions',
        cell: ({ row }) => {
            const user = row.original;
            const isBlocked = user.accountStatus === 'blocked';
            return (
                <div className="flex gap-2 justify-end">
                    {canEdit && user.customerType && (
                        <Button asChild variant="outline" size="sm" className="h-7">
                            <Link href={`/admin/users/${user.customerType.toLowerCase()}/${user.id}/edit`}>Edit</Link>
                        </Button>
                    )}
                   {canBlock && (
                        isBlocked ? (
                            <Button size="sm" variant="outline" onClick={() => handleOpenAlert(user, 'unblock')} className="h-7">
                               <UserCheck className="mr-2 h-4 w-4" /> Unblock
                            </Button>
                        ) : (
                            <Button size="sm" variant="destructive" onClick={() => handleOpenAlert(user, 'block')} className="h-7">
                                <UserX className="mr-2 h-4 w-4" /> Block
                            </Button>
                        )
                    )}
                    {canDelete && (
                        <Button size="sm" variant="destructive" onClick={() => handleOpenAlert(user, 'delete')} className="h-7">Delete</Button>
                    )}
                </div>
            )
        },
    });

    return baseCols;
  }, [displayColumns, canEdit, canDelete, canBlock]);


  const table = useReactTable({
    data: users || [],
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        {canCreate && (
            <Button asChild>
              <Link href="/admin/users/local/new">
                <PlusCircle className="mr-2 h-4 w-4" /> New Customer
              </Link>
            </Button>
        )}
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
              {isLoadingUsers ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((col, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
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
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {!isLoadingUsers && users && users.length > visibleCount && (
            <CardFooter className="flex justify-center border-t pt-6">
                <Button onClick={() => setVisibleCount(prev => prev + 20)}>View More</Button>
            </CardFooter>
        )}
      </Card>


      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertContent[alertType].title}</AlertDialogTitle>
            <AlertDialogDescription>{alertContent[alertType].description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAlert} className={alertType !== 'unblock' ? "bg-destructive hover:bg-destructive/90" : ""}>
              {alertContent[alertType].actionText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
