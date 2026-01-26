'use client';

import { useMemo, useEffect } from 'react';
import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { RealCutPic, CutType } from '@/lib/types';
import { z } from 'zod';
import { ColumnDef } from '@tanstack/react-table';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { getPlaceholderImage } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

const realCutPicSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  imageUrl: z.string().min(1, 'A valid image path is required.'),
  cutTypeId: z.string().min(1, 'A cut type must be selected.'),
  order: z.coerce.number().int().optional().default(0),
  name: z.string().optional(), // For AttributeManagementPage compatibility
});

type RealCutPicFormValues = z.infer<typeof realCutPicSchema>;

export default function AdminRealCutPicturesPage() {
  const firestore = useFirestore();
  const { t } = useTranslation();

  const cutTypesQuery = useMemo(() => firestore ? query(collection(firestore, 'cutTypes'), orderBy('name.en')) : null, [firestore]);
  const { data: cutTypes, isLoading: isLoadingCutTypes } = useCollection<CutType>(cutTypesQuery);
  
  const cutTypeMap = useMemo(() => {
    if (!cutTypes) return new Map();
    return new Map(cutTypes.map(ct => [ct.id, t(ct.name)]));
  }, [cutTypes, t]);

  const columns: ColumnDef<RealCutPic>[] = useMemo(() => [
    {
      accessorKey: 'order',
      header: 'Order',
    },
    {
      id: 'image',
      header: 'Image',
      cell: ({ row }) => (
        <div className="relative w-16 h-16 bg-muted rounded-md overflow-hidden">
          <Image
            src={getPlaceholderImage(row.original.imageUrl)}
            alt={row.original.title}
            fill
            className="object-contain"
          />
        </div>
      )
    },
    {
      accessorKey: 'title',
      header: 'Title',
    },
    {
      accessorKey: 'cutTypeId',
      header: 'Cut Type',
      cell: ({ row }) => cutTypeMap.get(row.original.cutTypeId) || 'N/A'
    },
  ], [cutTypeMap]);

  const formFields = useMemo(() => [
    { name: 'order' as const, label: 'Display Order', placeholder: 'e.g., 1', type: 'number' as const },
    { name: 'title' as const, label: 'Title', placeholder: 'e.g., Premium Ribeye' },
    { name: 'imageUrl' as const, label: 'Image Path', placeholder: '/real-cuts/my-photo.jpg', description: 'Path to the image in your S3 bucket.' },
    { 
      name: 'cutTypeId' as const, 
      label: 'Cut Type', 
      placeholder: 'Select a cut type', 
      type: 'select' as const,
      options: cutTypes?.map(ct => ({ value: ct.id, label: t(ct.name) })) || [],
      isLoading: isLoadingCutTypes
    },
    { name: 'name' as const, label: 'Name (hidden)', type: 'hidden' as const },
  ], [cutTypes, isLoadingCutTypes, t]);

  // Custom hook to sync title with the 'name' field for compatibility
  const useFormWithTitleSync = () => {
    const form = useForm<RealCutPicFormValues>({
      resolver: zodResolver(realCutPicSchema),
      defaultValues: {
        title: '',
        imageUrl: '',
        cutTypeId: '',
        order: 0,
        name: '',
      }
    });

    const title = form.watch('title');

    useEffect(() => {
      if (title) {
        form.setValue('name', title, { shouldValidate: true });
      }
    }, [title, form]);

    return form;
  };

  const CustomPage = () => {
    return (
      <AttributeManagementPage<RealCutPic>
        collectionName="realCutPics"
        title="Real Cut Pictures"
        description="Manage the real pictures of your meat cuts."
        columns={columns}
        formSchema={realCutPicSchema}
        formFields={formFields}
        useCustomFormHook={useFormWithTitleSync}
        renderCustomFormField={({ field, form }) => {
          if (field?.name === 'imageUrl') {
            const imageUrlValue = form.watch('imageUrl');
            return (
              <FormField
                key="imageUrl"
                control={form.control}
                name="imageUrl"
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>Image Path</FormLabel>
                    <FormControl>
                      <Input placeholder="/real-cuts/my-photo.jpg" {...formField} />
                    </FormControl>
                    <FormDescription>
                      Path to the image in your S3 bucket.
                    </FormDescription>
                    <FormMessage />
                    {imageUrlValue && (
                      <div className="mt-4">
                        <FormLabel>Image Preview</FormLabel>
                        <div className="mt-2 p-2 border rounded-md w-48 h-48 flex items-center justify-center bg-muted">
                          <Image
                            src={getPlaceholderImage(imageUrlValue)}
                            alt="Image Preview"
                            width={180}
                            height={180}
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                      </div>
                    )}
                  </FormItem>
                )}
              />
            );
          }
           if (field?.type === 'number') {
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
  };
  
  return <CustomPage />;
}
