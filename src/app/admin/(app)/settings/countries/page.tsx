

'use client';

import { useMemo, useState, useEffect } from 'react';
import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { Country, LocalizedString } from '@/lib/types';
import { z } from 'zod';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Languages, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { translateProductAction } from '../../products/all/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';

const localizedStringSchema = z.object({
  en: z.string().optional(),
  es: z.string().optional(),
  fr: z.string().optional(),
  ar: z.string().optional(),
  ur: z.string().optional(),
});

const countrySchema = z.object({
  name: localizedStringSchema.refine(data => !!data.en, { message: 'English name is required.'}),
  code: z
    .string()
    .length(2, { message: 'Country code must be exactly 2 characters.' })
    .regex(/^[a-z]{2}$/, { message: 'Country code must be 2 lowercase letters.' }),
});

type CountryFormValues = z.infer<typeof countrySchema>;

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

export default function AdminCountriesPage() {
  const [isTranslating, setIsTranslating] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const columns = [
    {
      accessorKey: 'name.en',
      header: 'Name (EN)',
      cell: ({ row }: { row: { original: Country } }) => (
        <div className="flex items-center gap-3">
          <Image
            src={`https://flagcdn.com/w40/${row.original.code}.png`}
            alt={`${row.original.name.en} flag`}
            width={27}
            height={20}
            className="rounded-sm border border-muted"
          />
          <span className="font-medium">{row.original.name.en}</span>
        </div>
      ),
    },
    {
        accessorKey: 'name.es',
        header: 'Name (ES)',
    },
    {
        accessorKey: 'name.fr',
        header: 'Name (FR)',
    },
    {
        accessorKey: 'name.ar',
        header: 'Name (AR)',
    },
    {
        accessorKey: 'name.ur',
        header: 'Name (UR)',
    },
    {
      accessorKey: 'code',
      header: 'Code',
    },
  ];

  const handleTranslateAll = async (form: ReturnType<typeof useForm<CountryFormValues>>) => {
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
      description: '', // description is not needed for countries
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
  
  const useCustomFormHook = () => useForm<CountryFormValues>({
    resolver: zodResolver(countrySchema),
    defaultValues: {
      name: { en: '', es: '', fr: '', ar: '', ur: '' },
      code: '',
    }
  });


  return (
    <AttributeManagementPage<Country>
      collectionName="countries"
      title="Countries"
      description="Manage the countries of origin for your products."
      columns={columns}
      formSchema={countrySchema}
      formFields={[]} // Using custom renderer
      useCustomFormHook={useCustomFormHook}
      renderCustomFormField={({ form }) => (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button type="button" size="sm" variant="outline" onClick={() => handleTranslateAll(form)} disabled={isTranslating}>
                    {isTranslating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4" />}
                    Translate All
                </Button>
            </div>
            <Tabs defaultValue="en">
                <TabsList className="grid w-full grid-cols-5">
                    <LanguageTab lang="en" label="EN"/>
                    <LanguageTab lang="es" label="ES"/>
                    <LanguageTab lang="fr" label="FR"/>
                    <LanguageTab lang="ar" label="AR"/>
                    <LanguageTab lang="ur" label="UR"/>
                </TabsList>
                 <TabsContent value="en" className="space-y-4 pt-2">
                    <LanguageNameField lang="en" form={form} />
                 </TabsContent>
                 <TabsContent value="es" className="space-y-4 pt-2">
                    <LanguageNameField lang="es" form={form} />
                 </TabsContent>
                  <TabsContent value="fr" className="space-y-4 pt-2">
                    <LanguageNameField lang="fr" form={form} />
                 </TabsContent>
                  <TabsContent value="ar" className="space-y-4 pt-2">
                    <LanguageNameField lang="ar" form={form} />
                 </TabsContent>
                  <TabsContent value="ur" className="space-y-4 pt-2">
                    <LanguageNameField lang="ur" form={form} />
                 </TabsContent>
            </Tabs>
             <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                    <FormItem>
                    <Label>Country Code (2-letter ISO)</Label>
                    <FormControl><Input placeholder="e.g., us" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
      )}
    />
  );
}
