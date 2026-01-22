

'use client';

import { useMemo, useState, useEffect } from 'react';
import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { Attribute, CutType, LocalizedString } from '@/lib/types';
import { z } from 'zod';
import { useCollection, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import Image from 'next/image';
import { getPlaceholderImage } from '@/lib/utils';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Trash2, PlusCircle, Search, Loader2, BookPlus, Languages, ArrowUpDown } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';
import { translateProductAction } from '../../products/all/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColumnDef } from '@tanstack/react-table';

const createSlug = (name: string) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/[\s-]+/g, '-');
}

const localizedStringSchema = z.object({
  en: z.string().optional(),
  es: z.string().optional(),
  fr: z.string().optional(),
  ar: z.string().optional(),
  ur: z.string().optional(),
});

const cutTypeSchema = z.object({
    name: localizedStringSchema.refine(data => !!data.en, { message: 'English name is required.'}),
    slug: z.string().min(2, { message: 'Slug must be at least 2 characters.' }),
    categoryId: z.string().min(1, { message: 'Category is required.' }),
    imageUrl: z.string().optional(),
    description: localizedStringSchema.optional(),
});

type CutTypeFormValues = z.infer<typeof cutTypeSchema>;


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

const LanguageDescriptionField = ({ lang, form }: { lang: keyof LocalizedString, form: any }) => (
  <FormField
    control={form.control}
    name={`description.${lang}`}
    render={({ field }) => (
      <FormItem>
        <FormControl>
          <Textarea placeholder={`${lang.toUpperCase()} Description`} {...field} className="min-h-[100px]" value={field.value || ''} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);


export default function AdminCutTypesPage() {
  const firestore = useFirestore();
  const { t } = useTranslation();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [bulkAddText, setBulkAddText] = useState('');
  const [bulkAddCategoryId, setBulkAddCategoryId] = useState('');
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const categoriesQuery = useMemo(() => (firestore ? collection(firestore, 'categories') : null), [firestore]);
  const { data: categories, isLoading: isLoadingCategories } = useCollection<Attribute>(categoriesQuery);

  const cutTypesQuery = useMemo(() => (firestore ? collection(firestore, 'cutTypes') : null), [firestore]);
  const { data: cutTypes, isLoading: isLoadingCutTypes } = useCollection<CutType>(cutTypesQuery);

  const filteredCutTypes = useMemo(() => {
    if (!cutTypes) return [];
    if (!searchQuery) return cutTypes;

    return cutTypes.filter(cutType => 
        t(cutType.name).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [cutTypes, searchQuery, t]);

  const useCustomFormHook = () => {
    const form = useForm<CutTypeFormValues>({
        resolver: zodResolver(cutTypeSchema),
        defaultValues: {
            name: { en: '', es: '', fr: '', ar: '', ur: '' },
            slug: '',
            categoryId: '',
            imageUrl: '',
            description: { en: '', es: '', fr: '', ar: '', ur: '' },
        }
    });

    const watchedName = form.watch('name.en');
    const isSlugManuallyEdited = form.formState.dirtyFields.slug;

    useEffect(() => {
        if (watchedName && !isSlugManuallyEdited) {
            form.setValue('slug', createSlug(watchedName), { shouldValidate: true });
        }
    }, [watchedName, isSlugManuallyEdited, form]);
    
    return form;
  }

  const handleDeleteAll = async () => {
    if (!firestore || !cutTypes || cutTypes.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'No cut types to delete.' });
      return;
    }
    
    const batch = writeBatch(firestore);
    cutTypes.forEach((cut) => {
      const docRef = doc(firestore, 'cutTypes', cut.id);
      batch.delete(docRef);
    });

    try {
      await batch.commit();
      toast({ title: 'Success', description: 'All cut types have been deleted.' });
    } catch (e: any) {
      const contextualError = await FirestorePermissionError.create({ path: '/cutTypes', operation: 'delete' });
      errorEmitter.emit('permission-error', contextualError);
    }
  }

  const handleBulkAdd = async () => {
    if (!firestore || !bulkAddText || !bulkAddCategoryId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please paste a list of names and select a category.' });
      return;
    }
    setIsBulkSaving(true);
    
    const names = bulkAddText.split('\n').map(name => name.trim()).filter(name => name.length > 0);
    const uniqueNames = [...new Set(names)]; // Remove duplicates
    
    try {
        const batch = writeBatch(firestore);
        uniqueNames.forEach(name => {
            const docRef = doc(collection(firestore, 'cutTypes'));
            const newCutType: Omit<CutType, 'id'> = {
                name: { en: name },
                slug: createSlug(name),
                categoryId: bulkAddCategoryId,
                description: { en: '' },
                imageUrl: '',
            };
            batch.set(docRef, { ...newCutType, id: docRef.id });
        });

        await batch.commit();
        toast({ title: 'Success!', description: `${uniqueNames.length} cut types have been added.` });
        setIsBulkAddOpen(false);
        setBulkAddText('');
        setBulkAddCategoryId('');

    } catch (e: any) {
      console.error("Bulk add failed:", e);
      const contextualError = await FirestorePermissionError.create({ path: '/cutTypes', operation: 'create' });
      errorEmitter.emit('permission-error', contextualError);
    } finally {
      setIsBulkSaving(false);
    }
  }
  
  const handleTranslateAll = async (form: ReturnType<typeof useCustomFormHook>) => {
    const { name, description } = form.getValues();
    if (!name.en || !description.en) {
      toast({
        variant: "destructive",
        title: "Missing Content",
        description: "Please provide an English name and description before translating.",
      });
      return;
    }
    setIsTranslating(true);
    const result = await translateProductAction({
      name: name.en,
      description: description.en,
      sourceLanguage: 'en',
    });
    
    if (result.success) {
      form.setValue('name', { ...name, ...result.translatedName });
      form.setValue('description', { ...description, ...result.translatedDescription });
      toast({ title: 'Translations Generated', description: 'All language fields have been populated.' });
    } else {
      toast({ variant: 'destructive', title: 'Translation Failed', description: result.error });
    }
    setIsTranslating(false);
  };


  const columns: ColumnDef<CutType>[] = [
    {
      accessorKey: 'name.en',
      header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}><>Name (EN) <ArrowUpDown className="ml-2 h-4 w-4" /></></Button>,
      cell: ({ row }) => (
        <div className="flex items-center gap-4">
          {row.original.imageUrl ? (
            <Image
              src={getPlaceholderImage(row.original.imageUrl)}
              alt={t(row.original.name)}
              width={40}
              height={40}
              className="rounded-md object-cover bg-muted"
            />
          ) : (
            <div className="h-10 w-10 bg-muted rounded-md flex-shrink-0" />
          )}
          <span className="font-medium">{t(row.original.name)}</span>
        </div>
      )
    },
    { accessorKey: 'name.es', header: 'Name (ES)', cell: ({row}) => t(row.original.name, 'es') },
    { accessorKey: 'name.fr', header: 'Name (FR)', cell: ({row}) => t(row.original.name, 'fr') },
    { accessorKey: 'name.ar', header: 'Name (AR)', cell: ({row}) => t(row.original.name, 'ar') },
    { accessorKey: 'name.ur', header: 'Name (UR)', cell: ({row}) => t(row.original.name, 'ur') },
    {
      accessorKey: 'categoryId',
      header: 'Category',
      cell: ({ row }) => {
        const category = categories?.find(c => c.id === row.original.categoryId);
        return t(category?.name) || row.original.categoryId;
      },
    },
  ];

  return (
    <>
    <AttributeManagementPage<CutType>
      collectionName="cutTypes"
      title="Cut Types"
      description="Manage the types of meat cuts available."
      columns={columns}
      formSchema={cutTypeSchema}
      formFields={[]} // Form fields are now custom rendered
      data={filteredCutTypes}
      isLoading={isLoadingCutTypes}
      useCustomFormHook={useCustomFormHook}
      showAddNewButton={false} // We handle buttons in customHeaderContent
      customHeaderContent={(handleOpenForm) => (
        <div className="flex gap-4 items-center">
            <div className="relative flex-grow max-w-xs">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                 <Input 
                    placeholder="Search cut types..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsBulkAddOpen(true)}>
                    <BookPlus className="mr-2 h-4 w-4" /> Bulk Add
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete All
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete all cut types.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive hover:bg-destructive/90">
                            Yes, delete all
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Button onClick={() => handleOpenForm()}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New
                </Button>
            </div>
        </div>
      )}
      renderCustomFormField={({ form }) => {
        const imageUrl = form.watch('imageUrl');

        useEffect(() => {
          if (imageUrl) {
            setImagePreview(getPlaceholderImage(imageUrl));
          } else {
            setImagePreview(null);
          }
        }, [imageUrl]);

        return (
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
                    <LanguageDescriptionField lang="en" form={form} />
                 </TabsContent>
                 <TabsContent value="es" className="space-y-4 pt-2">
                    <LanguageNameField lang="es" form={form} />
                    <LanguageDescriptionField lang="es" form={form} />
                 </TabsContent>
                  <TabsContent value="fr" className="space-y-4 pt-2">
                    <LanguageNameField lang="fr" form={form} />
                    <LanguageDescriptionField lang="fr" form={form} />
                 </TabsContent>
                  <TabsContent value="ar" className="space-y-4 pt-2">
                    <LanguageNameField lang="ar" form={form} />
                    <LanguageDescriptionField lang="ar" form={form} />
                 </TabsContent>
                  <TabsContent value="ur" className="space-y-4 pt-2">
                    <LanguageNameField lang="ur" form={form} />
                    <LanguageDescriptionField lang="ur" form={form} />
                 </TabsContent>
            </Tabs>
             <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>URL Slug</FormLabel>
                    <FormControl><Input placeholder="e.g., ribeye" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCategories}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {categories?.map(option => <SelectItem key={option.id} value={option.id}>{t(option.name)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image Path (from S3)</FormLabel>
                    <FormControl><Input placeholder="/cuts/ribeye.jpeg" {...field} value={field.value || ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {imagePreview && (
                <div className="mt-4">
                  <FormLabel>Preview</FormLabel>
                  <div className="mt-2 p-2 border rounded-md w-48 h-48 flex items-center justify-center">
                    <Image src={imagePreview} alt="Preview" width={180} height={180} className="object-contain" />
                  </div>
                </div>
              )}
          </div>
        );
      }}
    />

    <Dialog open={isBulkAddOpen} onOpenChange={setIsBulkAddOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Bulk Add Cut Types</DialogTitle>
                <DialogDescription>
                    Paste a list of cut type names (one per line). They will all be added to the selected category.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="bulk-category">Category</Label>
                    <Select onValueChange={setBulkAddCategoryId} value={bulkAddCategoryId}>
                        <SelectTrigger id="bulk-category">
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories?.map(c => <SelectItem key={c.id} value={c.id}>{t(c.name)}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                     <Label htmlFor="bulk-add-textarea">Cut Type Names</Label>
                    <Textarea
                        id="bulk-add-textarea"
                        placeholder={'Ribeye\nSirloin\nFilet Mignon\n...'}
                        value={bulkAddText}
                        onChange={(e) => setBulkAddText(e.target.value)}
                        rows={10}
                    />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={isBulkSaving}>Cancel</Button>
                </DialogClose>
                <Button onClick={handleBulkAdd} disabled={isBulkSaving}>
                    {isBulkSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</> : `Add ${bulkAddText.split('\n').filter(Boolean).length} items`}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
