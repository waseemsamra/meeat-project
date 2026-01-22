
'use client';

import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { Vendor } from '@/lib/types';
import { z } from 'zod';
import { ColumnDef } from '@tanstack/react-table';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Country } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';


export default function AdminVendorsPage() {
  const firestore = useFirestore();
  const countriesQuery = useMemo(() => firestore ? collection(firestore, 'countries') : null, [firestore]);
  const { data: countries, isLoading: isLoadingCountries } = useCollection<Country>(countriesQuery);

  const vendorSchema = z.object({
    name: z.string().min(2, { message: 'Vendor name must be at least 2 characters.' }),
    contactPerson: z.string().optional(),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
    country: z.string().min(1, { message: 'Country is required.' }),
    type: z.enum(['Local Supplier', 'Foreign Supplier'], { required_error: 'Vendor type is required.' }),
  });

  const columns: ColumnDef<Vendor>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-muted-foreground">{row.original.contactPerson}</div>
        </div>
      )
    },
    {
      accessorKey: 'phoneNumber',
      header: 'Phone',
    },
    {
        accessorKey: 'address',
        header: 'Address',
    },
    {
      accessorKey: 'country',
      header: 'Country',
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.original.type;
        return <Badge variant={type === 'Local Supplier' ? 'secondary' : 'outline'}>{type}</Badge>
      }
    }
  ];

  const formFields = [
    {
      name: 'name' as const,
      label: 'Vendor Name',
      placeholder: 'e.g., Prime Beef Co.',
    },
    {
      name: 'contactPerson' as const,
      label: 'Contact Person',
      placeholder: 'e.g., John Doe',
    },
    {
      name: 'phoneNumber' as const,
      label: 'Phone Number',
      placeholder: 'e.g., +1-555-123-4567',
    },
    {
        name: 'address' as const,
        label: 'Address',
        placeholder: 'e.g., 123 Beef St, Meatpacking District, NY',
    },
    {
      name: 'country' as const,
      label: 'Country',
      placeholder: 'Select a country',
      type: 'select' as const,
      options: countries?.map(c => ({ value: c.name, label: c.name })) || [],
      isLoading: isLoadingCountries
    },
    {
      name: 'type' as const,
      label: 'Vendor Type',
      placeholder: 'Select a type',
      type: 'select' as const,
      options: [
        { value: 'Local Supplier', label: 'Local Supplier' },
        { value: 'Foreign Supplier', label: 'Foreign Supplier' }
      ]
    },
  ];

  return (
    <AttributeManagementPage<Vendor>
      collectionName="vendors"
      title="Vendors"
      description="Manage your product suppliers and vendors."
      columns={columns}
      formSchema={vendorSchema}
      formFields={formFields}
    />
  );
}
