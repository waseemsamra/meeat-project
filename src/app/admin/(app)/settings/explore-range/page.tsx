'use client';

import { useMemo, useState, useEffect } from 'react';
import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { ExploreRangeItem, LocalizedString } from '@/lib/types';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField, FormItem, FormControl, FormMessage, FormLabel, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { getPlaceholderImage } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Languages, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { translateProductAction } from '../../products/all/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Reusable schemas and components
const localizedStringSchema = z.object({
  en: z.string().optional(),
  es: z.string().optional(),
  fr: z.string().optional(),
  ar: z.string().optional(),
  ur: z.string().optional(),
});

const LanguageTab = ({ lang, label }: { lang: keyof LocalizedString, label: string }) => (
  <TabsTrigger value={lang as string}>{label}</TabsTrigger>
);

const LanguageNameField = ({ lang, form, fieldName, placeholder }: { lang: keyof LocalizedString, form: any, fieldName: string, placeholder: string }) => (
  <FormField
    control={form.control}
    name={`${fieldName}.${lang}`}
    render={({ field }) => (
      <FormItem>
        <FormControl>
          <Input placeholder={placeholder} {...field} value={field.value || ''}/>
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

// Main page logic
const exploreRangeSchema = z.object({
  name: localizedStringSchema.refine(data => !!data?.en, { message: 'English name is required.'}),
  imageUrl: z.string().min(1, 'Image URL is required.'),
  link: z.string().min(1, 'Link is required. It is auto-generated from the name.'),
  order: z.coerce.number().int(),
});

type FormValues = z.infer<typeof exploreRangeSchema>;

export default function AdminExploreRangePage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isTranslating, setIsTranslating] = useState(false);

  const columns = [
    { accessorKey: 'order', header: 'Order' },
    { 
      accessorKey: 'name.en', 
      header: 'Name', 
      cell: ({row}: any) => {
        const item = row.original;
        return (
            <div className="flex items-center gap-4">
                {item.imageUrl ? (
                    <Image
                        src={getPlaceholderImage(item.imageUrl)}
                        alt={t(item.name)}
                        width={40}
                        height={40}
                        className="rounded-md object-contain bg-muted"
                    />
                ) : <div className="h-10 w-10 bg-muted rounded-md" />}
                <span>{t(item.name)}</span>
            </div>
        )
    }},
    { accessorKey: 'link', header: 'Link' },
  ];
  
  const useCustomFormHook = () => {
    const form = useForm<FormValues>({
        resolver: zodResolver(exploreRangeSchema),
        defaultValues: {
            name: { en: '' },
            imageUrl: '',
            link: '',
            order: 0,
        }
    });
    const categoryValue = form.watch('name.en');
    useEffect(() => {
        if (categoryValue) {
            form.setValue('link', `/products?category=${encodeURIComponent(categoryValue)}`);
        } else {
            form.setValue('link', '');
        }
    }, [categoryValue, form]);
    return form;
  }
  
   const handleTranslateAll = async (form: ReturnType<typeof useCustomFormHook>) => {
    const { name } = form.getValues();
    if (!name?.en) {
      toast({
        variant: "destructive",
        title: "Missing Content",
        description: "Please provide an English name before translating.",
      });
      return;
    }
    setIsTranslating(true);
    const result = await translateProductAction({
      name: name.en,
      description: '', 
      sourceLanguage: 'en',
    });
    
    if (result.success) {
      form.setValue('name', { ...name, ...result.translatedName });
      toast({ title: 'Translations Generated', description: 'All name fields have been populated.' });
    } else {
      toast({ variant: 'destructive', title: 'Translation Failed', description: result.error });
    }
    setIsTranslating(false);
  };

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
                 <div className="flex justify-end">
                    <Button type="button" size="sm" variant="outline" onClick={() => handleTranslateAll(form)} disabled={isTranslating}>
                        {isTranslating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4" />}
                        Translate All
                    </Button>
                </div>
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
                 <div>
                    <FormLabel>Name</FormLabel>
                    <Tabs defaultValue="en" className="mt-2">
                        <TabsList className="grid w-full grid-cols-5">
                            <LanguageTab lang="en" label="EN"/>
                            <LanguageTab lang="es" label="ES"/>
                            <LanguageTab lang="fr" label="FR"/>
                            <LanguageTab lang="ar" label="AR"/>
                            <LanguageTab lang="ur" label="UR"/>
                        </TabsList>
                        <TabsContent value="en" className="pt-2">
                           <LanguageNameField lang="en" form={form} fieldName="name" placeholder="English Name (e.g. Beef)" />
                        </TabsContent>
                        <TabsContent value="es" className="pt-2">
                           <LanguageNameField lang="es" form={form} fieldName="name" placeholder="Spanish Name" />
                        </TabsContent>
                        <TabsContent value="fr" className="pt-2">
                           <LanguageNameField lang="fr" form={form} fieldName="name" placeholder="French Name" />
                        </TabsContent>
                        <TabsContent value="ar" className="pt-2">
                           <LanguageNameField lang="ar" form={form} fieldName="name" placeholder="Arabic Name" />
                        </TabsContent>
                        <TabsContent value="ur" className="pt-2">
                           <LanguageNameField lang="ur" form={form} fieldName="name" placeholder="Urdu Name" />
                        </TabsContent>
                    </Tabs>
                </div>
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
                            <FormControl><Input placeholder="/range/beef.png" {...field} value={field.value || ''} /></FormControl>
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
