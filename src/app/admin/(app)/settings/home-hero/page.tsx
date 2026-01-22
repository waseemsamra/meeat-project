
'use client';

import { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Languages } from 'lucide-react';
import Image from 'next/image';
import { useFirestore, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { getPlaceholderImage } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FirebaseError } from 'firebase/app';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { HeroSettings, LocalizedString } from '@/lib/types';
import { translateProductAction } from '../../products/all/actions'; // Re-using for simple text translation
import { Label } from '@/components/ui/label';

const localizedStringSchema = z.object({
  en: z.string().optional(),
  fr: z.string().optional(),
  es: z.string().optional(),
  ar: z.string().optional(),
  ur: z.string().optional(),
}).optional().nullable();

const heroSettingsSchema = z.object({
  imageUrl: z.string().optional().nullable(),
  title: localizedStringSchema,
  subtitle: localizedStringSchema,
  buttonText: localizedStringSchema,
  buttonLink: z.string().optional().nullable(),
  titleAlignment: z.enum(['left', 'center', 'right']).optional(),
  subtitleAlignment: z.enum(['left', 'center', 'right']).optional(),
  buttonAlignment: z.enum(['left', 'center', 'right']).optional(),
});

type HeroSettingsFormValues = z.infer<typeof heroSettingsSchema>;

const LanguageTab = ({ lang, label }: { lang: 'en' | 'es' | 'fr' | 'ar' | 'ur', label: string }) => (
  <TabsTrigger value={lang}>{label}</TabsTrigger>
);

const LanguageInputField = ({ lang, fieldName, form, placeholder }: { lang: keyof LocalizedString; fieldName: "title" | "subtitle" | "buttonText", form: any, placeholder: string }) => (
  <FormField
    control={form.control}
    name={`${fieldName}.${lang}`}
    render={({ field }) => (
      <FormItem>
        <FormControl>
          <Input placeholder={placeholder} {...field} value={field.value || ''} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

export default function HomeHeroPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const heroSettingsRef = useMemo(() => firestore ? doc(firestore, 'settings', 'hero') : null, [firestore]);
  const { data: heroSettings, isLoading: isLoadingSettings } = useDoc<HeroSettings>(heroSettingsRef);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  
  const form = useForm<HeroSettingsFormValues>({
    resolver: zodResolver(heroSettingsSchema),
    defaultValues: {
      imageUrl: '',
      title: { en: '' },
      subtitle: { en: '' },
      buttonText: { en: '' },
      buttonLink: '',
      titleAlignment: 'left',
      subtitleAlignment: 'left',
      buttonAlignment: 'left',
    },
  });

  const imageUrl = form.watch('imageUrl');

  useEffect(() => {
    if (heroSettings) {
      form.reset(heroSettings);
    }
  }, [heroSettings, form]);

  const handleTranslateAll = async () => {
    const { title, subtitle, buttonText } = form.getValues();
    if (!title?.en && !subtitle?.en && !buttonText?.en) {
        toast({ variant: "destructive", title: "Nothing to translate", description: "Please enter some English text first." });
        return;
    }
    setIsTranslating(true);
    try {
        const [titleRes, subtitleRes, buttonRes] = await Promise.all([
            title?.en ? translateProductAction({ name: title.en, description: '', sourceLanguage: 'en'}) : Promise.resolve(null),
            subtitle?.en ? translateProductAction({ name: subtitle.en, description: '', sourceLanguage: 'en'}) : Promise.resolve(null),
            buttonText?.en ? translateProductAction({ name: buttonText.en, description: '', sourceLanguage: 'en'}) : Promise.resolve(null),
        ]);

        if (titleRes?.success) form.setValue('title', titleRes.translatedName);
        if (subtitleRes?.success) form.setValue('subtitle', subtitleRes.translatedName);
        if (buttonRes?.success) form.setValue('buttonText', buttonRes.translatedName);
        
        toast({ title: "Content Translated", description: "All fields have been translated."});

    } catch (e) {
        toast({ variant: 'destructive', title: "Translation Failed", description: "An error occurred during translation."});
    } finally {
        setIsTranslating(false);
    }
  }

  const onSubmit = async (values: HeroSettingsFormValues) => {
    if (!firestore || !heroSettingsRef) {
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Database connection not available.' });
      return;
    }
    setIsSaving(true);
    
    try {
      await setDoc(heroSettingsRef, values, { merge: true }).catch(async (error) => {
        const contextualError = await FirestorePermissionError.create({ path: heroSettingsRef!.path, operation: 'write', requestResourceData: values });
        errorEmitter.emit('permission-error', contextualError);
        throw error;
      });

      toast({ title: 'Hero Settings Updated', description: 'Your new hero settings have been saved.' });
    } catch (error) {
       if (!(error instanceof FirestorePermissionError) && !(error instanceof FirebaseError)) {
          toast({ variant: 'destructive', title: 'Save Failed', description: 'There was an error saving your hero settings. Check permissions and try again.' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingSettings) {
    return (
        <div className="space-y-8">
             <div>
                <h1 className="text-3xl font-bold">Home Hero</h1>
                <p className="text-muted-foreground">Manage the main hero section on your homepage.</p>
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full max-w-sm" />
                    <Skeleton className="h-10 w-24" />
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Home Hero</h1>
        <p className="text-muted-foreground">Manage the main hero section on your homepage.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Homepage Hero Content</CardTitle>
                  <CardDescription>
                    Set the background image, text, and alignment for the hero section.
                  </CardDescription>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={handleTranslateAll} disabled={isTranslating || isSaving}>
                    {isTranslating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4" />}
                    Translate All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem className="max-w-sm">
                    <FormLabel>Background Image Path</FormLabel>
                    <FormControl>
                      <Input placeholder="/hero.jpg" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription>Relative path from your S3 bucket root.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {imageUrl && (
                <div>
                  <FormLabel>Image Preview</FormLabel>
                  <div className="mt-2 w-full max-w-md rounded-md border p-4">
                    <Image src={getPlaceholderImage(imageUrl)} alt="Hero preview" width={1920} height={1080} className="object-contain rounded-md" />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Main Title</Label>
                <Tabs defaultValue="en">
                    <TabsList><LanguageTab lang="en" label="EN"/><LanguageTab lang="es" label="ES"/><LanguageTab lang="fr" label="FR"/><LanguageTab lang="ar" label="AR"/><LanguageTab lang="ur" label="UR"/></TabsList>
                    <TabsContent value="en"><LanguageInputField lang="en" fieldName="title" form={form} placeholder="English Title" /></TabsContent>
                    <TabsContent value="es"><LanguageInputField lang="es" fieldName="title" form={form} placeholder="Spanish Title" /></TabsContent>
                    <TabsContent value="fr"><LanguageInputField lang="fr" fieldName="title" form={form} placeholder="French Title" /></TabsContent>
                    <TabsContent value="ar"><LanguageInputField lang="ar" fieldName="title" form={form} placeholder="Arabic Title" /></TabsContent>
                    <TabsContent value="ur"><LanguageInputField lang="ur" fieldName="title" form={form} placeholder="Urdu Title" /></TabsContent>
                </Tabs>
              </div>
              <div className="space-y-2">
                <Label>Subtitle</Label>
                 <Tabs defaultValue="en">
                    <TabsList><LanguageTab lang="en" label="EN"/><LanguageTab lang="es" label="ES"/><LanguageTab lang="fr" label="FR"/><LanguageTab lang="ar" label="AR"/><LanguageTab lang="ur" label="UR"/></TabsList>
                    <TabsContent value="en"><LanguageInputField lang="en" fieldName="subtitle" form={form} placeholder="English Subtitle" /></TabsContent>
                    <TabsContent value="es"><LanguageInputField lang="es" fieldName="subtitle" form={form} placeholder="Spanish Subtitle" /></TabsContent>
                    <TabsContent value="fr"><LanguageInputField lang="fr" fieldName="subtitle" form={form} placeholder="French Subtitle" /></TabsContent>
                    <TabsContent value="ar"><LanguageInputField lang="ar" fieldName="subtitle" form={form} placeholder="Arabic Subtitle" /></TabsContent>
                    <TabsContent value="ur"><LanguageInputField lang="ur" fieldName="subtitle" form={form} placeholder="Urdu Subtitle" /></TabsContent>
                </Tabs>
              </div>
               <div className="space-y-2">
                <Label>Button Text</Label>
                 <Tabs defaultValue="en">
                    <TabsList><LanguageTab lang="en" label="EN"/><LanguageTab lang="es" label="ES"/><LanguageTab lang="fr" label="FR"/><LanguageTab lang="ar" label="AR"/><LanguageTab lang="ur" label="UR"/></TabsList>
                    <TabsContent value="en"><LanguageInputField lang="en" fieldName="buttonText" form={form} placeholder="English Button Text" /></TabsContent>
                    <TabsContent value="es"><LanguageInputField lang="es" fieldName="buttonText" form={form} placeholder="Spanish Button Text" /></TabsContent>
                    <TabsContent value="fr"><LanguageInputField lang="fr" fieldName="buttonText" form={form} placeholder="French Button Text" /></TabsContent>
                    <TabsContent value="ar"><LanguageInputField lang="ar" fieldName="buttonText" form={form} placeholder="Arabic Button Text" /></TabsContent>
                    <TabsContent value="ur"><LanguageInputField lang="ur" fieldName="buttonText" form={form} placeholder="Urdu Button Text" /></TabsContent>
                </Tabs>
              </div>
               <FormField
                  control={form.control}
                  name="buttonLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button Link</FormLabel>
                      <FormControl>
                        <Input placeholder="/products" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="titleAlignment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title Alignment</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subtitleAlignment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subtitle Alignment</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="buttonAlignment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button Alignment</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                       <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
