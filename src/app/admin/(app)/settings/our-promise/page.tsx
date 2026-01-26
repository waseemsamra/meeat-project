
'use client';

import { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Languages } from 'lucide-react';
import { useFirestore, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { FirebaseError } from 'firebase/app';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PromiseSettings, LocalizedString } from '@/lib/types';
import { translateProductAction } from '../../products/all/actions'; // Re-using for simple text translation
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';


const localizedStringSchema = z.object({
  en: z.string().optional(),
  fr: z.string().optional(),
  es: z.string().optional(),
  ar: z.string().optional(),
  ur: z.string().optional(),
}).optional().nullable();

const promiseSettingsSchema = z.object({
  grassFedPromise: localizedStringSchema,
  freeRangePromise: localizedStringSchema,
  ethicallyRearedPromise: localizedStringSchema,
  sustainableFarmingPromise: localizedStringSchema,
  description: localizedStringSchema,
});

type PromiseSettingsFormValues = z.infer<typeof promiseSettingsSchema>;

const LanguageTab = ({ lang, label }: { lang: 'en' | 'es' | 'fr' | 'ar' | 'ur', label: string }) => (
  <TabsTrigger value={lang}>{label}</TabsTrigger>
);

const LanguageInputField = ({ lang, fieldName, form, placeholder }: { lang: keyof LocalizedString; fieldName: keyof PromiseSettingsFormValues, form: any, placeholder: string }) => (
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

const LanguageTextareaField = ({ lang, fieldName, form, placeholder }: { lang: keyof LocalizedString; fieldName: "description", form: any, placeholder: string }) => (
    <FormField
      control={form.control}
      name={`${fieldName}.${lang}`}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Textarea placeholder={placeholder} {...field} value={field.value || ''} className="min-h-[150px]" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

export default function OurPromisePage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const promiseSettingsRef = useMemo(() => firestore ? doc(firestore, 'settings', 'promise') : null, [firestore]);
  const { data: promiseSettings, isLoading: isLoadingSettings } = useDoc<PromiseSettings>(promiseSettingsRef);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  
  const form = useForm<PromiseSettingsFormValues>({
    resolver: zodResolver(promiseSettingsSchema),
    defaultValues: {
      grassFedPromise: { en: '' },
      freeRangePromise: { en: '' },
      ethicallyRearedPromise: { en: '' },
      sustainableFarmingPromise: { en: '' },
      description: { en: '' },
    },
  });

  useEffect(() => {
    if (promiseSettings) {
      form.reset(promiseSettings);
    }
  }, [promiseSettings, form]);

  const handleTranslateAll = async () => {
    const { 
        grassFedPromise, 
        freeRangePromise, 
        ethicallyRearedPromise, 
        sustainableFarmingPromise, 
        description 
    } = form.getValues();

    if (!grassFedPromise?.en && !freeRangePromise?.en && !ethicallyRearedPromise?.en && !sustainableFarmingPromise?.en && !description?.en) {
        toast({ variant: "destructive", title: "Nothing to translate", description: "Please enter some English text first." });
        return;
    }
    setIsTranslating(true);
    try {
        const results = await Promise.all([
            grassFedPromise?.en ? translateProductAction({ name: grassFedPromise.en, description: '', sourceLanguage: 'en'}) : Promise.resolve(null),
            freeRangePromise?.en ? translateProductAction({ name: freeRangePromise.en, description: '', sourceLanguage: 'en'}) : Promise.resolve(null),
            ethicallyRearedPromise?.en ? translateProductAction({ name: ethicallyRearedPromise.en, description: '', sourceLanguage: 'en'}) : Promise.resolve(null),
            sustainableFarmingPromise?.en ? translateProductAction({ name: sustainableFarmingPromise.en, description: '', sourceLanguage: 'en'}) : Promise.resolve(null),
            description?.en ? translateProductAction({ name: '', description: description.en, sourceLanguage: 'en'}) : Promise.resolve(null),
        ]);

        if (results[0]?.success) form.setValue('grassFedPromise', results[0].translatedName);
        if (results[1]?.success) form.setValue('freeRangePromise', results[1].translatedName);
        if (results[2]?.success) form.setValue('ethicallyRearedPromise', results[2].translatedName);
        if (results[3]?.success) form.setValue('sustainableFarmingPromise', results[3].translatedName);
        if (results[4]?.success) form.setValue('description', results[4].translatedDescription);
        
        toast({ title: "Content Translated", description: "All fields have been translated."});

    } catch (e) {
        toast({ variant: 'destructive', title: "Translation Failed", description: "An error occurred during translation."});
    } finally {
        setIsTranslating(false);
    }
  }

  const onSubmit = async (values: PromiseSettingsFormValues) => {
    if (!firestore || !promiseSettingsRef) {
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Database connection not available.' });
      return;
    }
    setIsSaving(true);
    
    try {
      await setDoc(promiseSettingsRef, values, { merge: true }).catch(async (error) => {
        const contextualError = await FirestorePermissionError.create({ path: promiseSettingsRef!.path, operation: 'write', requestResourceData: values });
        errorEmitter.emit('permission-error', contextualError);
        throw error;
      });

      toast({ title: 'Promise Section Updated', description: 'Your new settings have been saved.' });
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
                <h1 className="text-3xl font-bold">Our Promise Section</h1>
                <p className="text-muted-foreground">Manage the content for the 'Our Promise' section on the homepage.</p>
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
        <h1 className="text-3xl font-bold">Our Promise Section</h1>
        <p className="text-muted-foreground">Manage the content for the 'Our Promise' section on the homepage.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Section Content</CardTitle>
                  <CardDescription>
                    Set the text for each promise and the main description.
                  </CardDescription>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={handleTranslateAll} disabled={isTranslating || isSaving}>
                    {isTranslating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4" />}
                    Translate All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Grass Fed Promise</Label>
                        <Tabs defaultValue="en">
                            <TabsList><LanguageTab lang="en" label="EN"/><LanguageTab lang="es" label="ES"/><LanguageTab lang="fr" label="FR"/><LanguageTab lang="ar" label="AR"/><LanguageTab lang="ur" label="UR"/></TabsList>
                            <TabsContent value="en"><LanguageInputField lang="en" fieldName="grassFedPromise" form={form} placeholder="English Text" /></TabsContent>
                            <TabsContent value="es"><LanguageInputField lang="es" fieldName="grassFedPromise" form={form} placeholder="Spanish Text" /></TabsContent>
                            <TabsContent value="fr"><LanguageInputField lang="fr" fieldName="grassFedPromise" form={form} placeholder="French Text" /></TabsContent>
                            <TabsContent value="ar"><LanguageInputField lang="ar" fieldName="grassFedPromise" form={form} placeholder="Arabic Text" /></TabsContent>
                            <TabsContent value="ur"><LanguageInputField lang="ur" fieldName="grassFedPromise" form={form} placeholder="Urdu Text" /></TabsContent>
                        </Tabs>
                    </div>
                     <div className="space-y-2">
                        <Label>Free Range Promise</Label>
                        <Tabs defaultValue="en">
                            <TabsList><LanguageTab lang="en" label="EN"/><LanguageTab lang="es" label="ES"/><LanguageTab lang="fr" label="FR"/><LanguageTab lang="ar" label="AR"/><LanguageTab lang="ur" label="UR"/></TabsList>
                            <TabsContent value="en"><LanguageInputField lang="en" fieldName="freeRangePromise" form={form} placeholder="English Text" /></TabsContent>
                            <TabsContent value="es"><LanguageInputField lang="es" fieldName="freeRangePromise" form={form} placeholder="Spanish Text" /></TabsContent>
                            <TabsContent value="fr"><LanguageInputField lang="fr" fieldName="freeRangePromise" form={form} placeholder="French Text" /></TabsContent>
                            <TabsContent value="ar"><LanguageInputField lang="ar" fieldName="freeRangePromise" form={form} placeholder="Arabic Text" /></TabsContent>
                            <TabsContent value="ur"><LanguageInputField lang="ur" fieldName="freeRangePromise" form={form} placeholder="Urdu Text" /></TabsContent>
                        </Tabs>
                    </div>
                     <div className="space-y-2">
                        <Label>Ethically Reared Promise</Label>
                        <Tabs defaultValue="en">
                            <TabsList><LanguageTab lang="en" label="EN"/><LanguageTab lang="es" label="ES"/><LanguageTab lang="fr" label="FR"/><LanguageTab lang="ar" label="AR"/><LanguageTab lang="ur" label="UR"/></TabsList>
                            <TabsContent value="en"><LanguageInputField lang="en" fieldName="ethicallyRearedPromise" form={form} placeholder="English Text" /></TabsContent>
                            <TabsContent value="es"><LanguageInputField lang="es" fieldName="ethicallyRearedPromise" form={form} placeholder="Spanish Text" /></TabsContent>
                            <TabsContent value="fr"><LanguageInputField lang="fr" fieldName="ethicallyRearedPromise" form={form} placeholder="French Text" /></TabsContent>
                            <TabsContent value="ar"><LanguageInputField lang="ar" fieldName="ethicallyRearedPromise" form={form} placeholder="Arabic Text" /></TabsContent>
                            <TabsContent value="ur"><LanguageInputField lang="ur" fieldName="ethicallyRearedPromise" form={form} placeholder="Urdu Text" /></TabsContent>
                        </Tabs>
                    </div>
                     <div className="space-y-2">
                        <Label>Sustainable Farming Promise</Label>
                        <Tabs defaultValue="en">
                            <TabsList><LanguageTab lang="en" label="EN"/><LanguageTab lang="es" label="ES"/><LanguageTab lang="fr" label="FR"/><LanguageTab lang="ar" label="AR"/><LanguageTab lang="ur" label="UR"/></TabsList>
                            <TabsContent value="en"><LanguageInputField lang="en" fieldName="sustainableFarmingPromise" form={form} placeholder="English Text" /></TabsContent>
                            <TabsContent value="es"><LanguageInputField lang="es" fieldName="sustainableFarmingPromise" form={form} placeholder="Spanish Text" /></TabsContent>
                            <TabsContent value="fr"><LanguageInputField lang="fr" fieldName="sustainableFarmingPromise" form={form} placeholder="French Text" /></TabsContent>
                            <TabsContent value="ar"><LanguageInputField lang="ar" fieldName="sustainableFarmingPromise" form={form} placeholder="Arabic Text" /></TabsContent>
                            <TabsContent value="ur"><LanguageInputField lang="ur" fieldName="sustainableFarmingPromise" form={form} placeholder="Urdu Text" /></TabsContent>
                        </Tabs>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Main Description</Label>
                    <Tabs defaultValue="en">
                        <TabsList><LanguageTab lang="en" label="EN"/><LanguageTab lang="es" label="ES"/><LanguageTab lang="fr" label="FR"/><LanguageTab lang="ar" label="AR"/><LanguageTab lang="ur" label="UR"/></TabsList>
                        <TabsContent value="en"><LanguageTextareaField lang="en" fieldName="description" form={form} placeholder="English Description..." /></TabsContent>
                        <TabsContent value="es"><LanguageTextareaField lang="es" fieldName="description" form={form} placeholder="Spanish Description..." /></TabsContent>
                        <TabsContent value="fr"><LanguageTextareaField lang="fr" fieldName="description" form={form} placeholder="French Description..." /></TabsContent>
                        <TabsContent value="ar"><LanguageTextareaField lang="ar" fieldName="description" form={form} placeholder="Arabic Description..." /></TabsContent>
                        <TabsContent value="ur"><LanguageTextareaField lang="ur" fieldName="description" form={form} placeholder="Urdu Description..." /></TabsContent>
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

    