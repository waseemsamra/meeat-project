
'use client';

import { useState, useMemo, useEffect, ChangeEvent } from 'react';
import { useCollection, useFirestore, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { HomepageSection, Category, Country } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { DataTable } from './DataTable';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FirebaseError } from 'firebase/app';
import { useTranslation } from '@/hooks/useTranslation';

const homepageSectionSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  link: z.string().min(1, 'Link is required'),
  order: z.coerce.number().int('Order must be an integer.'),
  category: z.string().min(1, 'Category is required.'),
  countryOfOrigin: z.string().optional(),
});

type FormValues = z.infer<typeof homepageSectionSchema>;

export default function AdminHomepageSectionsPage() {
  const collectionName = 'categoryBanners';
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSection, setSelectedSection] = useState<HomepageSection | null>(null);

  const { data: sections, isLoading } = useCollection<HomepageSection>(useMemo(() => firestore ? collection(firestore, collectionName) : null, [firestore]));
  const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(useMemo(() => firestore ? collection(firestore, 'categories') : null, [firestore]));
  const { data: countries, isLoading: isLoadingCountries } = useCollection<Country>(useMemo(() => firestore ? collection(firestore, 'countries') : null, [firestore]));

  const sortedSections = useMemo(() => {
    if (!sections) return [];
    return [...sections].sort((a, b) => a.order - b.order);
  }, [sections]);

  const form = useForm<FormValues>({
    resolver: zodResolver(homepageSectionSchema),
    defaultValues: { title: '', link: '', order: 0, category: '', countryOfOrigin: '' },
  });

  const categoryValue = form.watch('category');
  const countryValue = form.watch('countryOfOrigin');

  useEffect(() => {
    const params = new URLSearchParams();
    if (categoryValue) params.set('category', categoryValue);
    if (countryValue) params.set('countryOfOrigin', countryValue);
    form.setValue('link', `/products?${params.toString()}`);
  }, [categoryValue, countryValue, form]);

  useEffect(() => {
    if (categoryValue && categories) {
      const selectedCategoryObject = categories.find(c => c.name.en === categoryValue);
      if (selectedCategoryObject) {
        form.setValue('title', t(selectedCategoryObject.name));
      } else {
        form.setValue('title', categoryValue);
      }
    }
  }, [categoryValue, categories, form, t]);
  
  const resetFormState = () => {
    setIsDialogOpen(false);
    setSelectedSection(null);
    form.reset({ title: '', link: '', order: 0, category: '', countryOfOrigin: '' });
  };

  const handleOpenDialog = (item: HomepageSection | null = null) => {
    if (item) {
      setSelectedSection(item);
      form.reset({
        ...item,
        countryOfOrigin: item.countryOfOrigin || '',
      });
    } else {
      setSelectedSection(null);
      form.reset({ title: '', link: '', order: (sections?.length || 0) + 1, category: '', countryOfOrigin: '' });
    }
    setIsDialogOpen(true);
  };
  
  const onSubmit = async (values: FormValues) => {
    if (!firestore || !user) return;
    setIsSaving(true);
    try {
      const dataToSave: Omit<HomepageSection, 'id' | 'imageUrl'> & {imageUrl?: string} = {
        ...values,
        countryOfOrigin: values.countryOfOrigin || '',
      };

      if (selectedSection) {
        const docRef = doc(firestore, collectionName, selectedSection.id);
        await updateDoc(docRef, dataToSave).catch(async (error) => {
            const contextualError = await FirestorePermissionError.create({ path: docRef.path, operation: 'update', requestResourceData: dataToSave });
            errorEmitter.emit('permission-error', contextualError);
            throw error;
        });
        toast({ title: 'Success', description: 'Section updated.' });
      } else {
        const docRef = doc(collection(firestore, collectionName));
        const finalData = { ...dataToSave, id: docRef.id, imageUrl: '' }; // Add required imageUrl
        await setDoc(docRef, finalData).catch(async (error) => {
            const contextualError = await FirestorePermissionError.create({ path: `/${collectionName}`, operation: 'create', requestResourceData: finalData });
            errorEmitter.emit('permission-error', contextualError);
            throw error;
        });
        toast({ title: 'Success', description: 'New section created.' });
      }
      resetFormState();
    } catch (error: any) {
        if (!(error instanceof FirestorePermissionError) && !(error instanceof FirebaseError)) {
            toast({ variant: 'destructive', title: 'Save Failed', description: 'An unknown error occurred.' });
        }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Homepage Sections</h1>
            <p className="text-muted-foreground">Manage the product sections displayed on the homepage.</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New
          </Button>
        </div>
        <DataTable
          data={sortedSections}
          isLoading={isLoading}
          onEdit={handleOpenDialog}
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => !isOpen && resetFormState()}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{selectedSection ? 'Edit' : 'Add New'} Section</DialogTitle>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Title (auto-generated from Category)</FormLabel>
                                <FormControl><Input placeholder="Select a category to set title..." {...field} disabled /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCategories || isSaving}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                              <SelectContent>
                                {categories?.map(option => <SelectItem key={option.id} value={option.name.en!}>{t(option.name)}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="countryOfOrigin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country (Optional)</FormLabel>
                            <Select 
                                onValueChange={(value) => field.onChange(value === 'all' ? '' : value)} 
                                value={field.value || 'all'}
                                disabled={isLoadingCountries || isSaving}
                            >
                              <FormControl><SelectTrigger><SelectValue placeholder="Filter by country" /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="all">Any Country</SelectItem>
                                {countries?.map(option => <SelectItem key={option.id} value={option.name.en!}>{t(option.name)}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="link"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Link URL (Auto-generated)</FormLabel>
                                <FormControl><Input {...field} readOnly disabled /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="order"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Display Order</FormLabel>
                                <FormControl><Input type="number" placeholder="1" {...field} disabled={isSaving}/></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancel</Button></DialogClose>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Section'}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
