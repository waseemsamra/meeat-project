'use client';

import { useMemo, useState, useEffect } from 'react';
import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { ExploreRangeItem } from '@/lib/types';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField, FormItem, FormControl, FormMessage, FormLabel, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { getPlaceholderImage } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

const exploreRangeSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  imageUrl: z.string().min(1, 'Image URL is required.'),
  link: z.string().min(1, 'Link is required. It is auto-generated from the name.'),
  order: z.coerce.number().int(),
});

type FormValues = z.infer<typeof exploreRangeSchema>;

export default function AdminExploreRangePage() {
  const { t } = useTranslation();

  const columns = [
    { accessorKey: 'order', header: 'Order' },
    { accessorKey: 'name', header: 'Name', cell: ({row}: any) => {
        const item = row.original;
        return (
            <div className="flex items-center gap-4">
                {item.imageUrl ? (
                    <Image
                        src={getPlaceholderImage(item.imageUrl)}
                        alt={item.name}
                        width={40}
                        height={40}
                        className="rounded-md object-contain bg-muted"
                    />
                ) : <div className="h-10 w-10 bg-muted rounded-md" />}
                <span>{item.name}</span>
            </div>
        )
    }},
    { accessorKey: 'link', header: 'Link' },
  ];
  
  const useCustomFormHook = () => {
    const form = useForm<FormValues>({
        resolver: zodResolver(exploreRangeSchema),
        defaultValues: {
            name: '',
            imageUrl: '',
            link: '',
            order: 0,
        }
    });
    const categoryValue = form.watch('name');
    useEffect(() => {
        if (categoryValue) {
            form.setValue('link', `/products?category=${encodeURIComponent(categoryValue)}`);
        } else {
            form.setValue('link', '');
        }
    }, [categoryValue, form]);
    return form;
  }

  return (
    <AttributeManagementPage<ExploreRangeItem>
      collectionName="exploreRangeItems"
      title="Explore Range Section"
      description="Manage items in the 'Explore the Range' section on the homepage."
      columns={columns}
      formSchema={exploreRangeSchema}
      useCustomFormHook={useCustomFormHook}
      formFields={[]}
      renderCustomFormField={({ form }) => {
        const imageUrl = form.watch('imageUrl');
        return (
            <div className="space-y-6">
                 <FormField
                    control={form.control}
                    name="order"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Display Order</FormLabel>
                        <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl><Input placeholder="e.g. Beef" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="link"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Link URL (Auto-generated from name)</FormLabel>
                        <FormControl><Input {...field} readOnly /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Image Path</FormLabel>
                            <FormControl><Input placeholder="/range/beef.png" {...field} /></FormControl>
                            <FormDescription>
                                Provide the path to the image in your S3 bucket, e.g., /range/beef.png
                            </FormDescription>
                            {imageUrl && <Image src={getPlaceholderImage(imageUrl)} alt="Preview" width={100} height={100} className="rounded-md mt-2 object-contain bg-muted p-2" />}
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        );
      }}
    />
  );
}
