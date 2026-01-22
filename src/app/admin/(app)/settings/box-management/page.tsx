
'use client';

import { useMemo, useEffect, useState } from 'react';
import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { BoxOption } from '@/lib/types';
import { z } from 'zod';
import { ColumnDef } from '@tanstack/react-table';
import { useCollection, useFirestore } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import Image from 'next/image';
import { getPlaceholderImage } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';

const boxOptionSchema = z.object({
  name: z.string().min(2, 'Name is required.'),
  people: z.string().min(1, 'People count is required.'),
  weight: z.string().min(1, 'Weight is required.'),
  price: z.coerce.number().min(0.01, 'Price must be greater than 0.'),
  imageId: z.string().min(1, 'Image ID is required.'),
  description: z.string().min(1, 'Description is required.'),
  order: z.coerce.number().int(),
  points: z.coerce.number().int().min(1, 'Points must be at least 1.'),
});

const columns: ColumnDef<BoxOption>[] = [
  {
    accessorKey: 'order',
    header: 'Order',
    enableSorting: true,
  },
  {
    accessorKey: 'name',
    header: 'Name',
    enableSorting: true,
  },
  {
      accessorKey: 'points',
      header: 'Points'
  },
  {
    accessorKey: 'price',
    header: 'Price',
     cell: ({ row }) => {
        const price = row.original.price;
        const formattedPrice = typeof price === 'number' ? price.toFixed(2) : parseFloat(price).toFixed(2);
        return `$${formattedPrice}`;
     },
  },
  {
    accessorKey: 'people',
    header: 'People',
  },
  {
    accessorKey: 'weight',
    header: 'Weight',
  },
];

const formFields = [
  { name: 'order' as const, label: 'Display Order', placeholder: 'e.g., 1', type: 'number' as const },
  { name: 'name' as const, label: 'Box Name', placeholder: 'e.g., Regular Box' },
  { name: 'points' as const, label: 'Points', placeholder: 'e.g., 30', type: 'number' as const },
  { name: 'people' as const, label: 'People Served', placeholder: 'e.g., 1-2 people' },
  { name: 'weight' as const, label: 'Weight', placeholder: 'e.g., 5-7kg' },
  { name: 'price' as const, label: 'Price', placeholder: 'e.g., 150.50', type: 'number' as const },
  { name: 'description' as const, label: 'Description', placeholder: 'Enter a short description...' },
  { name: 'imageId' as const, label: 'Image ID', placeholder: 'e.g., box-regular (from placeholder-images.json)', description: 'This ID must match an entry in src/lib/placeholder-images.json' },
];

export default function AdminBoxManagementPage() {
    const firestore = useFirestore();

    const collectionRef = useMemo(() => firestore ? collection(firestore, 'boxOptions') : null, [firestore]);
    const { data: existingBoxes, isLoading } = useCollection<BoxOption>(collectionRef);
    
  return (
    <AttributeManagementPage<BoxOption>
      collectionName="boxOptions"
      title="Box Management"
      description="Manage the subscription boxes for the Get Started page."
      columns={columns}
      formSchema={boxOptionSchema}
      formFields={formFields}
      data={existingBoxes}
      isLoading={isLoading}
      renderCustomFormField={({ field, form }) => {
        if (field.name === 'imageId') {
          const imageIdValue = form.watch('imageId');
          return (
            <FormField
              control={form.control}
              name="imageId"
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel>{field.label}</FormLabel>
                  <FormControl>
                    <Input placeholder={field.placeholder} {...formField} />
                  </FormControl>
                  <FormDescription>{field.description}</FormDescription>
                  <FormMessage />
                  {imageIdValue && (
                    <div className="mt-4">
                      <FormLabel>Image Preview</FormLabel>
                      <div className="mt-2 p-2 border rounded-md w-48 h-48 flex items-center justify-center bg-muted">
                        <Image
                          src={getPlaceholderImage(imageIdValue)}
                          alt="Image Preview"
                          width={180}
                          height={180}
                          className="object-contain"
                          unoptimized // Important for dynamic internal URLs
                          onError={(e) => {
                            // Hide the preview on error
                            e.currentTarget.style.display = 'none';
                          }}
                          onLoad={(e) => {
                            e.currentTarget.style.display = 'block';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </FormItem>
              )}
            />
          );
        }
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
                                step={field.name === 'price' ? "0.01" : "1"}
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
  );
}
