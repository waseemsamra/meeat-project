
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Languages, Ruler } from 'lucide-react';
import Image from 'next/image';
import { useFirestore, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { getPlaceholderImage } from '@/lib/utils';
import { FirebaseError } from 'firebase/app';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MeasuringGuideSettings, LocalizedString } from '@/lib/types';
import { translateProductAction } from '../../products/all/actions';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const localizedStringSchema = z.object({
  en: z.string().optional(),
  fr: z.string().optional(),
  es: z.string().optional(),
  ar: z.string().optional(),
  ur: z.string().optional(),
}).optional().nullable();

const measuringGuideSchema = z.object({
  imageUrl: z.string().optional().nullable(),
  description: localizedStringSchema,
});

type FormValues = z.infer<typeof measuringGuideSchema>;

const LanguageTab = ({ lang, label }: { lang: keyof LocalizedString, label: string }) => (
  <TabsTrigger value={lang as string}>{label}</TabsTrigger>
);

const LanguageDescriptionField = ({ lang, form }: { lang: keyof LocalizedString; form: any }) => (
    <FormField
      control={form.control}
      name={`description.${lang}`}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Textarea placeholder={`${lang.toUpperCase()} Description...`} {...field} value={field.value || ''} className="min-h-[150px]" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

export default function MeasuringGuidePage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const settingsRef = useMemo(() => firestore ? doc(firestore, 'settings', 'measuringGuide') : null, [firestore]);
  const { data: settings, isLoading: isLoadingSettings } = useDoc<MeasuringGuideSettings>(settingsRef);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(measuringGuideSchema),
    defaultValues: {
      imageUrl: '',
      description: { en: '' },
    },
  });

  const imageUrl = form.watch('imageUrl');

  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  const handleTranslateAll = async () => {
    const { description } = form.getValues();
    if (!description?.en) {
        toast({ variant: "destructive", title: "Nothing to translate", description: "Please enter an English description first." });
        return;
    }
    setIsTranslating(true);
    try {
        const result = await translateProductAction({ name: '', description: description.en, sourceLanguage: 'en'});

        if (result.success) {
            form.setValue('description', { ...description, ...result.translatedDescription });
            toast({ title: "Content Translated", description: "All fields have been translated."});
        }

    } catch (e) {
        toast({ variant: 'destructive', title: "Translation Failed", description: "An error occurred during translation."});
    } finally {
        setIsTranslating(false);
    }
  }

  const onSubmit = async (values: FormValues) => {
    if (!firestore || !settingsRef) {
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Database connection not available.' });
      return;
    }
    setIsSaving(true);
    
    try {
      await setDoc(settingsRef, values, { merge: true }).catch(async (error) => {
        const contextualError = await FirestorePermissionError.create({ path: settingsRef!.path, operation: 'write', requestResourceData: values });
        errorEmitter.emit('permission-error', contextualError);
        throw error;
      });

      toast({ title: 'Measuring Guide Updated', description: 'Your new settings have been saved.' });
    } catch (error) {
       if (!(error instanceof FirestorePermissionError) && !(error instanceof FirebaseError)) {
          toast({ variant: 'destructive', title: 'Save Failed', description: 'There was an error saving your settings. Check permissions and try again.' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingSettings) {
    return (
        <div className="space-y-8">
             <div>
                <h1 className="text-3xl font-bold">Measuring Guide</h1>
                <p className="text-muted-foreground">Manage the measuring guide image and description.</p>
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full max-w-sm" />
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-10 w-24" />
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Measuring Guide</h1>
        <p className="text-muted-foreground">Manage the measuring guide image and description for your store.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Guide Content</CardTitle>
                  <CardDescription>
                    Set the image and description for the measuring guide.
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
                    <FormLabel>Image Path</FormLabel>
                    <FormControl>
                      <Input placeholder="/guides/measuring.jpg" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {imageUrl && (
                <div>
                  <FormLabel>Image Preview</FormLabel>
                  <div className="mt-2 w-full max-w-md rounded-md border p-4">
                    <Image src={getPlaceholderImage(imageUrl)} alt="Measuring guide preview" width={800} height={600} className="object-contain rounded-md" />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Description</Label>
                <Tabs defaultValue="en">
                    <TabsList><LanguageTab lang="en" label="EN"/><LanguageTab lang="es" label="ES"/><LanguageTab lang="fr" label="FR"/><LanguageTab lang="ar" label="AR"/><LanguageTab lang="ur" label="UR"/></TabsList>
                    <TabsContent value="en"><LanguageDescriptionField lang="en" form={form} /></TabsContent>
                    <TabsContent value="es"><LanguageDescriptionField lang="es" form={form} /></TabsContent>
                    <TabsContent value="fr"><LanguageDescriptionField lang="fr" form={form} /></TabsContent>
                    <TabsContent value="ar"><LanguageDescriptionField lang="ar" form={form} /></TabsContent>
                    <TabsContent value="ur"><LanguageDescriptionField lang="ur" form={form} /></TabsContent>
                </Tabs>
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
