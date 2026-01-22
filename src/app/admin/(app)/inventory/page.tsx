
'use client';

import { InventoryManagementPage } from './InventoryManagementPage';
import type { InventoryLot, Product } from '@/lib/types';
import { z } from 'zod';
import { ColumnDef } from '@tanstack/react-table';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useMemo } from 'react';
import { useSettings } from '@/hooks/useSettings';

const inventoryLotSchema = z.object({
  productId: z.string().min(1, { message: 'Product is required.' }),
  unit: z.string().min(1, { message: 'Unit is required.' }),
  quantity: z.coerce.number().int().min(0, 'Quantity must be a positive integer.'),
  purchasePrice: z.coerce.number().min(0, 'Purchase price must be a positive number.'),
  shipmentId: z.string().min(1, { message: 'Shipment ID is required.' }),
  purchaseDate: z.date({ required_error: 'Purchase date is required.' }),
  shipmentDate: z.date({ required_error: 'Shipment date is required.' }),
});

export default function AdminInventoryPage() {
  const firestore = useFirestore();
  const { defaultCurrency } = useSettings();
  const currencySymbol = defaultCurrency?.symbol || '$';
  
  const productsQuery = useMemo(() => (firestore ? collection(firestore, 'products') : null), [firestore]);
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

  const columns: ColumnDef<InventoryLot>[] = [
    {
      accessorKey: 'productId',
      header: 'Product',
      cell: ({ row }) => {
        const lot = row.original;
        const product = products?.find((p) => p.id === lot.productId);
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{product?.name || 'Unknown Product'}</span>
             {product && (
                <Button asChild variant="ghost" size="icon" className="h-6 w-6">
                    <Link href={`/admin/products/${product.id}/edit`} target="_blank">
                        <ExternalLink className="h-3 w-3" />
                    </Link>
                </Button>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'unit',
      header: 'Unit',
      cell: ({ row }) => <Badge variant="outline">{row.original.unit}</Badge>,
    },
    {
      accessorKey: 'quantity',
      header: 'Qty in hand',
    },
    {
        id: 'qtyOrdered',
        header: 'Qty ordered',
        cell: () => 0,
    },
    {
      accessorKey: 'purchasePrice',
      header: 'Purchase Price',
      cell: ({ row }) => `${currencySymbol}${row.original.purchasePrice.toFixed(2)}`,
    },
     {
      accessorKey: 'shipmentId',
      header: 'Shipment ID',
      cell: ({row}) => <span className="font-mono text-xs">{row.original.shipmentId}</span>
    },
    {
      accessorKey: 'purchaseDate',
      header: 'Purchase Date',
      cell: ({ row }) => new Date(row.original.purchaseDate).toLocaleDateString(),
    },
     {
      accessorKey: 'shipmentDate',
      header: 'Shipment Date',
      cell: ({ row }) => new Date(row.original.shipmentDate).toLocaleDateString(),
    },
  ];

  return (
    <InventoryManagementPage
      collectionName="inventoryLots"
      title="Inventory Lots"
      description="Manage all inventory lots across all products."
      columns={columns}
      formSchema={inventoryLotSchema}
      products={products || []}
      isLoadingProducts={isLoadingProducts}
    />
  );
}
