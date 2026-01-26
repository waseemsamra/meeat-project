'use client';

import { useMemo, useState, useEffect } from 'react';
import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { LocalizedString, ChooseBoxStep } from '@/lib/types';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Languages, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { translateProductAction } from '../../products/all/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormField, FormItem, FormControl, FormMessage, FormLabel, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { getPlaceholderImage } from '@/lib/utils';

const localizedStringSchema = z.object({
  en: z.string().optional(),
  es: z.string().optional(),
  fr: z.string().optional(),
  ar: z.string().optional(),
  ur: z.string().optional(),
});

const chooseBoxStepSchema = z.object({
  order: z.coerce.number().int(),
  title: localizedStringSchema.refine(data => !!data.en, { message: 'English title is required.'}),
  description: localizedStringSchema.refine(data => !!data.en, { message: 'English description is required.'}),
  imageId: z.string().min(1, 'Image ID is required.'),
  imageHint: z.string().optional(),
  name: z.string().optional(),
});

type ChooseBoxStepFormValues = z.infer<typeof chooseBoxStepSchema>;

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

const LanguageDescriptionField = ({ lang, form, fieldName, placeholder }: { lang: keyof LocalizedString, form: any, fieldName: string, placeholder: string }) => (
  <FormField
    control={form.control}
    name={`${fieldName}.${lang}`}
    render={({ field }) => (
      <FormItem>
        <FormControl>
          <Textarea placeholder={placeholder} {...field} className="min-h-[100px]" value={field.value || ''} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

export default function AdminChooseBoxStepsPage() {
  const [isTranslating, setIsTranslating] = useState(false);
  const { toast } = useToast();

  const columns = [
    { accessorKey: 'order', header: 'Order' },
    { accessorKey: 'title.en', header: 'Title (EN)' },
    { accessorKey: 'description.en', header: 'Description (EN)', cell: ({row}: any) => <p className="line-clamp-2">{row.original.description.en}</p> },
  ];

  const handleTranslateAll = async (form: ReturnType<typeof useForm<ChooseBoxStepFormValues>>) => {
    const { title, description } = form.getValues();
    if (!title.en && !description.en) {
      toast({ variant: "destructive", title: "Missing Content", description: "Please provide English text before translating." });
      return;
    }
    setIsTranslating(true);
    try {
        const [titleRes, descRes] = await Promise.all([
            title?.en ? translateProductAction({ name: title.en, description: '', sourceLanguage: 'en'}) : Promise.resolve(null),
            description?.en ? translateProductAction({ name: '', description: description.en, sourceLanguage: 'en'}) : Promise.resolve(null),
        ]);

        if (titleRes?.success) form.setValue('title', { ...title, ...titleRes.translatedName });
        if (descRes?.success) form.setValue('description', { ...description, ...descRes.translatedDescription });
        
        toast({ title: 'Translations Generated', description: 'All language fields have been populated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Translation Failed', description: 'An error occurred during translation.' });
    } finally {
      setIsTranslating(false);
    }
  };
  
  const useCustomFormHook = () => {
    const form = useForm<ChooseBoxStepFormValues>({
        resolver: zodResolver(chooseBoxStepSchema),
        defaultValues: {
            order: 0,
            title: { en: ''},
            description: { en: ''},
            imageId: '',
            imageHint: '',
            name: '',
        }
    });

    const watchedTitle = form.watch('title.en');
    useEffect(() => {
        if (watchedTitle) {
            form.setValue('name', watchedTitle, { shouldValidate: true });
        }
    }, [watchedTitle, form]);
    
    return form;
  }

  return (
    <AttributeManagementPage<ChooseBoxStep>
      collectionName="chooseBoxSteps"
      title="Choose Box Steps"
      description="Manage the content for the 'From block to box' section on the homepage."
      columns={columns}
      formSchema={chooseBoxStepSchema}
      formFields={[]}
      useCustomFormHook={useCustomFormHook}
      renderCustomFormField={({ form }) => {
        const imageId = form.watch('imageId');
        return (
            <div className="space-y-6">
                <div className="flex justify-end">
                    <Button type="button" size="sm" variant="outline" onClick={() => handleTranslateAll(form)} disabled={isTranslating}>
                        {isTranslating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4" />}
                        Translate All Fields
                    </Button>
                </div>
                <FormField control={form.control} name="order" render={({ field }) => ( <FormItem> <FormLabel>Display Order</FormLabel> <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl> <FormMessage /></FormItem> )} />
                
                <div>
                    <FormLabel>Step Title</FormLabel>
                    <Tabs defaultValue="en">
                        <TabsList className="grid w-full grid-cols-5 mt-2">
                            <LanguageTab lang="en" label="EN"/> <LanguageTab lang="es" label="ES"/> <LanguageTab lang="fr" label="FR"/> <LanguageTab lang="ar" label="AR"/> <LanguageTab lang="ur" label="UR"/>
                        </TabsList>
                        <TabsContent value="en" className="pt-2"><LanguageNameField lang="en" form={form} fieldName="title" placeholder="English Title"/></TabsContent>
                        <TabsContent value="es" className="pt-2"><LanguageNameField lang="es" form={form} fieldName="title" placeholder="Spanish Title"/></TabsContent>
                        <TabsContent value="fr" className="pt-2"><LanguageNameField lang="fr" form={form} fieldName="title" placeholder="French Title"/></TabsContent>
                        <TabsContent value="ar" className="pt-2"><LanguageNameField lang="ar" form={form} fieldName="title" placeholder="Arabic Title"/></TabsContent>
                        <TabsContent value="ur" className="pt-2"><LanguageNameField lang="ur" form={form} fieldName="title" placeholder="Urdu Title"/></TabsContent>
                    </Tabs>
                </div>
                
                <div>
                    <FormLabel>Step Description</FormLabel>
                     <Tabs defaultValue="en">
                        <TabsList className="grid w-full grid-cols-5 mt-2">
                            <LanguageTab lang="en" label="EN"/> <LanguageTab lang="es" label="ES"/> <LanguageTab lang="fr" label="FR"/> <LanguageTab lang="ar" label="AR"/> <LanguageTab lang="ur" label="UR"/>
                        </TabsList>
                        <TabsContent value="en" className="pt-2"><LanguageDescriptionField lang="en" form={form} fieldName="description" placeholder="English Description"/></TabsContent>
                        <TabsContent value="es" className="pt-2"><LanguageDescriptionField lang="es" form={form} fieldName="description" placeholder="Spanish Description"/></TabsContent>
                        <TabsContent value="fr" className="pt-2"><LanguageDescriptionField lang="fr" form={form} fieldName="description" placeholder="French Description"/></TabsContent>
                        <TabsContent value="ar" className="pt-2"><LanguageDescriptionField lang="ar" form={form} fieldName="description" placeholder="Arabic Description"/></TabsContent>
                        <TabsContent value="ur" className="pt-2"><LanguageDescriptionField lang="ur" form={form} fieldName="description" placeholder="Urdu Description"/></TabsContent>
                    </Tabs>
                </div>

                <FormField control={form.control} name="imageId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Image ID</FormLabel>
                        <FormControl><Input placeholder="e.g., block-to-box-1" {...field} /></FormControl>
                        <FormDescription>Image ID from placeholder-images.json.</FormDescription>
                        {imageId && <Image src={getPlaceholderImage(imageId)} alt="Preview" width={100} height={100} className="rounded-md mt-2 object-contain" />}
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="imageHint" render={({ field }) => ( <FormItem> <FormLabel>Image Hint</FormLabel> <FormControl><Input placeholder="e.g., raw meat" {...field} value={field.value || ''} /></FormControl> <FormMessage /></FormItem> )} />
            </div>
        )
      }}
    />
  );
}
