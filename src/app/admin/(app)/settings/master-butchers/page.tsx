
'use client';

import { useMemo, useState, useEffect } from 'react';
import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { LocalizedString, ButcherTab } from '@/lib/types';
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

const butcherTabSchema = z.object({
  order: z.coerce.number().int(),
  title: localizedStringSchema.refine(data => !!data.en, { message: 'English tab title is required.'}),
  icon: z.string().min(1, 'Icon name is required.'),
  contentTitle: localizedStringSchema.refine(data => !!data.en, { message: 'English content title is required.'}),
  contentDescription: localizedStringSchema.refine(data => !!data.en, { message: 'English content description is required.'}),
  contentImage: z.string().min(1, 'Image path is required.'),
  contentImageHint: z.string().optional(),
  contentButtonText: localizedStringSchema.refine(data => !!data.en, { message: 'English button text is required.'}),
  contentButtonLink: z.string().min(1, 'Button link is required.'),
  name: z.string().optional(),
});

type ButcherTabFormValues = z.infer<typeof butcherTabSchema>;

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

export default function AdminMasterButchersPage() {
  const [isTranslating, setIsTranslating] = useState(false);
  const { toast } = useToast();

  const columns = [
    { accessorKey: 'order', header: 'Order' },
    { accessorKey: 'title.en', header: 'Title (EN)' },
    { accessorKey: 'icon', header: 'Icon' },
    { accessorKey: 'contentTitle.en', header: 'Content Title (EN)' },
  ];

  const handleTranslateAll = async (form: ReturnType<typeof useForm<ButcherTabFormValues>>) => {
    const { title, contentTitle, contentDescription, contentButtonText } = form.getValues();
    if (!title.en && !contentTitle.en && !contentDescription.en && !contentButtonText.en) {
      toast({ variant: "destructive", title: "Missing Content", description: "Please provide English text before translating." });
      return;
    }
    setIsTranslating(true);
    try {
        const [titleRes, contentTitleRes, contentDescRes, buttonTextRes] = await Promise.all([
            title?.en ? translateProductAction({ name: title.en, description: '', sourceLanguage: 'en'}) : Promise.resolve(null),
            contentTitle?.en ? translateProductAction({ name: contentTitle.en, description: '', sourceLanguage: 'en'}) : Promise.resolve(null),
            contentDescription?.en ? translateProductAction({ name: '', description: contentDescription.en, sourceLanguage: 'en'}) : Promise.resolve(null),
            contentButtonText?.en ? translateProductAction({ name: contentButtonText.en, description: '', sourceLanguage: 'en'}) : Promise.resolve(null),
        ]);

        if (titleRes?.success) form.setValue('title', { ...title, ...titleRes.translatedName });
        if (contentTitleRes?.success) form.setValue('contentTitle', { ...contentTitle, ...contentTitleRes.translatedName });
        if (contentDescRes?.success) form.setValue('contentDescription', { ...contentDescription, ...contentDescRes.translatedDescription });
        if (buttonTextRes?.success) form.setValue('contentButtonText', { ...contentButtonText, ...buttonTextRes.translatedName });

      toast({ title: 'Translations Generated', description: 'All language fields have been populated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Translation Failed', description: 'An error occurred during translation.' });
    } finally {
      setIsTranslating(false);
    }
  };
  
  const useCustomFormHook = () => {
    const form = useForm<ButcherTabFormValues>({
        resolver: zodResolver(butcherTabSchema),
        defaultValues: {
            order: 0,
            title: { en: ''},
            icon: '',
            contentTitle: { en: ''},
            contentDescription: { en: ''},
            contentImage: '',
            contentImageHint: '',
            contentButtonText: { en: ''},
            contentButtonLink: '',
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
    <AttributeManagementPage<ButcherTab>
      collectionName="butcherTabs"
      title="Master Butchers Section"
      description="Manage the content for the 'Master Butchers' tabs on the homepage."
      columns={columns}
      formSchema={butcherTabSchema}
      formFields={[]} // Using custom renderer
      useCustomFormHook={useCustomFormHook}
      renderCustomFormField={({ form }) => {
        const contentImage = form.watch('contentImage');
        return (
            <div className="space-y-6">
                <div className="flex justify-end">
                    <Button type="button" size="sm" variant="outline" onClick={() => handleTranslateAll(form)} disabled={isTranslating}>
                        {isTranslating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4" />}
                        Translate All Fields
                    </Button>
                </div>
                <FormField control={form.control} name="order" render={({ field }) => ( <FormItem> <FormLabel>Display Order</FormLabel> <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl> <FormMessage /></FormItem> )} />
                <FormField control={form.control} name="icon" render={({ field }) => ( <FormItem> <FormLabel>Icon Name</FormLabel> <FormControl><Input placeholder="e.g., CleaverIcon, Box" {...field} /></FormControl> <FormDescription>Use name from lucide-react or custom icons (CleaverIcon, CowIcon).</FormDescription> <FormMessage /></FormItem> )} />
                
                <div>
                    <FormLabel>Tab Title</FormLabel>
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
                
                <hr/>

                <div>
                    <FormLabel>Content Title</FormLabel>
                    <Tabs defaultValue="en">
                        <TabsList className="grid w-full grid-cols-5 mt-2">
                            <LanguageTab lang="en" label="EN"/> <LanguageTab lang="es" label="ES"/> <LanguageTab lang="fr" label="FR"/> <LanguageTab lang="ar" label="AR"/> <LanguageTab lang="ur" label="UR"/>
                        </TabsList>
                        <TabsContent value="en" className="pt-2"><LanguageNameField lang="en" form={form} fieldName="contentTitle" placeholder="English Content Title"/></TabsContent>
                        <TabsContent value="es" className="pt-2"><LanguageNameField lang="es" form={form} fieldName="contentTitle" placeholder="Spanish Content Title"/></TabsContent>
                        <TabsContent value="fr" className="pt-2"><LanguageNameField lang="fr" form={form} fieldName="contentTitle" placeholder="French Content Title"/></TabsContent>
                        <TabsContent value="ar" className="pt-2"><LanguageNameField lang="ar" form={form} fieldName="contentTitle" placeholder="Arabic Content Title"/></TabsContent>
                        <TabsContent value="ur" className="pt-2"><LanguageNameField lang="ur" form={form} fieldName="contentTitle" placeholder="Urdu Content Title"/></TabsContent>
                    </Tabs>
                </div>

                <div>
                    <FormLabel>Content Description</FormLabel>
                     <Tabs defaultValue="en">
                        <TabsList className="grid w-full grid-cols-5 mt-2">
                            <LanguageTab lang="en" label="EN"/> <LanguageTab lang="es" label="ES"/> <LanguageTab lang="fr" label="FR"/> <LanguageTab lang="ar" label="AR"/> <LanguageTab lang="ur" label="UR"/>
                        </TabsList>
                        <TabsContent value="en" className="pt-2"><LanguageDescriptionField lang="en" form={form} fieldName="contentDescription" placeholder="English Description"/></TabsContent>
                        <TabsContent value="es" className="pt-2"><LanguageDescriptionField lang="es" form={form} fieldName="contentDescription" placeholder="Spanish Description"/></TabsContent>
                        <TabsContent value="fr" className="pt-2"><LanguageDescriptionField lang="fr" form={form} fieldName="contentDescription" placeholder="French Description"/></TabsContent>
                        <TabsContent value="ar" className="pt-2"><LanguageDescriptionField lang="ar" form={form} fieldName="contentDescription" placeholder="Arabic Description"/></TabsContent>
                        <TabsContent value="ur" className="pt-2"><LanguageDescriptionField lang="ur" form={form} fieldName="contentDescription" placeholder="Urdu Description"/></TabsContent>
                    </Tabs>
                </div>

                <FormField control={form.control} name="contentImage" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Image Path</FormLabel>
                        <FormControl><Input placeholder="e.g., master-butcher-1" {...field} /></FormControl>
                        <FormDescription>Image ID from placeholder-images.json or a full URL.</FormDescription>
                        {contentImage && <Image src={getPlaceholderImage(contentImage)} alt="Preview" width={100} height={100} className="rounded-md mt-2 object-cover" />}
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="contentImageHint" render={({ field }) => ( <FormItem> <FormLabel>Image Hint</FormLabel> <FormControl><Input placeholder="e.g., butcher portrait" {...field} value={field.value || ''} /></FormControl> <FormMessage /></FormItem> )} />
                
                <div>
                    <FormLabel>Button Text</FormLabel>
                    <Tabs defaultValue="en">
                        <TabsList className="grid w-full grid-cols-5 mt-2">
                            <LanguageTab lang="en" label="EN"/> <LanguageTab lang="es" label="ES"/> <LanguageTab lang="fr" label="FR"/> <LanguageTab lang="ar" label="AR"/> <LanguageTab lang="ur" label="UR"/>
                        </TabsList>
                        <TabsContent value="en" className="pt-2"><LanguageNameField lang="en" form={form} fieldName="contentButtonText" placeholder="English Button Text"/></TabsContent>
                        <TabsContent value="es" className="pt-2"><LanguageNameField lang="es" form={form} fieldName="contentButtonText" placeholder="Spanish Button Text"/></TabsContent>
                        <TabsContent value="fr" className="pt-2"><LanguageNameField lang="fr" form={form} fieldName="contentButtonText" placeholder="French Button Text"/></TabsContent>
                        <TabsContent value="ar" className="pt-2"><LanguageNameField lang="ar" form={form} fieldName="contentButtonText" placeholder="Arabic Button Text"/></TabsContent>
                        <TabsContent value="ur" className="pt-2"><LanguageNameField lang="ur" form={form} fieldName="contentButtonText" placeholder="Urdu Button Text"/></TabsContent>
                    </Tabs>
                </div>

                <FormField control={form.control} name="contentButtonLink" render={({ field }) => ( <FormItem> <FormLabel>Button Link</FormLabel> <FormControl><Input placeholder="/products" {...field} /></FormControl> <FormMessage /></FormItem> )} />
            </div>
        )
      }}
    />
  );
}

  