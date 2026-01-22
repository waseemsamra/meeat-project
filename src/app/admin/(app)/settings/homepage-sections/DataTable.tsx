

'use client';

import { useState } from 'react';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import type { HomepageSection } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { FirebaseError } from 'firebase/app';

interface DataTableProps {
  data: HomepageSection[];
  isLoading: boolean;
  onEdit: (item: HomepageSection) => void;
}

export function DataTable({ data, isLoading, onEdit }: DataTableProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<HomepageSection | null>(null);

  const handleOpenAlert = (item: HomepageSection) => {
    setItemToDelete(item);
    setIsAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!firestore || !itemToDelete) return;
    try {
      const docRef = doc(firestore, 'categoryBanners', itemToDelete.id);
      await deleteDoc(docRef);
      toast({ title: 'Success', description: 'Section deleted.' });
    } catch (error) {
      if (error instanceof FirebaseError && error.code === 'permission-denied') {
          const contextualError = await FirestorePermissionError.create({ path: `categoryBanners/${itemToDelete.id}`, operation: 'delete' });
          errorEmitter.emit('permission-error', contextualError);
      } else if (!(error instanceof FirestorePermissionError)) {
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete section.' });
      }
    } finally {
      setIsAlertOpen(false);
      setItemToDelete(null);
    }
  };

  const columns: ColumnDef<HomepageSection>[] = [
    { accessorKey: 'order', header: 'Order' },
    { accessorKey: 'title', header: 'Title' },
    { 
      accessorKey: 'category', 
      header: 'Category',
      cell: ({ row }) => <Badge variant="secondary">{row.original.category}</Badge>
    },
    { 
      accessorKey: 'countryOfOrigin', 
      header: 'Country',
      cell: ({ row }) => row.original.countryOfOrigin ? <Badge variant="outline">{row.original.countryOfOrigin}</Badge> : 'Any'
    },
    { accessorKey: 'link', header: 'Link' },
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
                <DropdownMenuItem onClick={() => onEdit(item)}>Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleOpenAlert(item)} className="text-destructive">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((col, j) => (
                      <TableCell key={j}><Skeleton className="h-10 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">No sections found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the section "{itemToDelete?.title}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
