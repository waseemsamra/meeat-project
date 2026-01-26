
'use client';

import { useMemo, useState, useEffect } from 'react';
import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { LocalizedString, ExploreRangeItem } from '@/lib/types';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Languages, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { translateProductAction } from '../../products/all/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormField, FormItem, FormControl, FormMessage, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { getPlaceholderImage } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

const localizedStringSchema = z.object({
  en: z.string().optional(),
  es: z.string().optional(),
  fr: z.string().optional(),
  ar: z.string().optional(),
  ur: z.string().optional(),
});

const exploreRangeSchema = z.object({
  name: localizedStringSchema.refine(data => !!data.en, { message: 'English name is required.'}),
  imageUrl: z.string().min(1, 'Image URL is required.'),
  link: z.string().min(1, 'Link is required. It is auto-generated from the English name.'),
  order: z.coerce.number().int(),
});

type FormValues = z.infer<typeof exploreRangeSchema>;

const LanguageTab = ({ lang, label }: { lang: 'en' | 'es' | 'fr' | 'ar' | 'ur', label: string }) => (
  <TabsTrigger value={lang}>{label}</TabsTrigger>
);

const LanguageNameField = ({ lang, form }: { lang: keyof LocalizedString, form: any}) => (
  <FormField
    control={form.control}
    name={`name.${lang}`}
    render={({ field }) => (
      <FormItem>
        <FormControl>
          <Input placeholder={`${lang.toUpperCase()} Name`} {...field} value={field.value || ''}/>
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

export default function AdminExploreRangePage() {
  const [isTranslating, setIsTranslating] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const columns = [
    { accessorKey: 'order', header: 'Order' },
    { accessorKey: 'name.en', header: 'Name (EN)', cell: ({row}: any) => {
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

  const handleTranslateAll = async (form: ReturnType<typeof useForm<FormValues>>) => {
    const { name } = form.getValues();
    if (!name.en) {
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
            <div className="space-y-4">
                <div className="flex justify-end">
                    <Button type="button" size="sm" variant="outline" onClick={() => handleTranslateAll(form)} disabled={isTranslating}>
                        {isTranslating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4" />}
                        Translate
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
                <Tabs defaultValue="en">
                    <TabsList className="grid w-full grid-cols-5">
                        <LanguageTab lang="en" label="EN"/>
                        <LanguageTab lang="es" label="ES"/>
                        <LanguageTab lang="fr" label="FR"/>
                        <LanguageTab lang="ar" label="AR"/>
                        <LanguageTab lang="ur" label="UR"/>
                    </TabsList>
                    <TabsContent value="en" className="pt-2"><LanguageNameField lang="en" form={form} /></TabsContent>
                    <TabsContent value="es" className="pt-2"><LanguageNameField lang="es" form={form} /></TabsContent>
                    <TabsContent value="fr" className="pt-2"><LanguageNameField lang="fr" form={form} /></TabsContent>
                    <TabsContent value="ar" className="pt-2"><LanguageNameField lang="ar" form={form} /></TabsContent>
                    <TabsContent value="ur" className="pt-2"><LanguageNameField lang="ur" form={form} /></TabsContent>
                </Tabs>
                <FormField
                    control={form.control}
                    name="link"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Link URL (Auto-generated from English name)</FormLabel>
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
                            <FormLabel>Image URL (from S3)</FormLabel>
                            <FormControl><Input placeholder="/range/beef.png" {...field} value={field.value || ''} /></FormControl>
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
