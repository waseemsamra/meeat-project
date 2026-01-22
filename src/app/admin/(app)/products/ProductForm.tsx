
"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { type Product, type Attribute, type Country, type CutType, type Grade, type LocalizedString, type Category } from "@/lib/types";
import { generateDescriptionAction, translateProductAction } from "./actions";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Languages } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useCollection, useFirestore, errorEmitter, FirestorePermissionError, useUser } from "@/firebase";
import { collection, doc, addDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getPlaceholderImage } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/hooks/useTranslation";


const localizedStringSchema = z.object({
  en: z.string().optional(),
  fr: z.string().optional(),
  es: z.string().optional(),
  ar: z.string().optional(),
  ur: z.string().optional(),
});

const formSchema = z.object({
  name: localizedStringSchema.refine(data => !!data.en, { message: 'English name is required.'}),
  slug: z.string().min(2, "Slug must be at least 2 characters."),
  description: localizedStringSchema.optional(),
  price: z.coerce.number().min(0, "Price must be a positive number."),
  perKgPrice: z.coerce.number().optional(),
  cutWeight: z.string().optional(),
  points: z.coerce.number().int().min(0, "Points must be a positive number.").optional(),
  category: z.string().min(1, "Category is required."),
  cutTypeId: z.string().min(1, "Cut type is required."),
  gradeQuality: z.string().min(1, "Grade/Quality is required."),
  countryOfOrigin: z.string().min(1, "Country of Origin is required."),
  temperature: z.enum(["Fresh", "Frozen"], { required_error: "You must select a temperature." }),
  styles: z.array(z.string()).optional(),
  rubs: z.array(z.string()).optional(),
  featured: z.boolean().default(false),
  deal: z.boolean().default(false),
  bestseller: z.boolean().default(false),
  discount: z.coerce.number().int().min(0).max(100).optional(),
  images: z.array(z.string()).min(1, "Image path is required."),
});

type ProductFormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  product?: Product;
  isCloning?: boolean;
}

const createSlug = (name: string) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/[\s-]+/g, '-');
}

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
          <Input placeholder={`${lang.toUpperCase()} Name`} {...field} value={field.value || ''} />
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
          <Textarea placeholder={`${lang.toUpperCase()} Description`} {...field} className="min-h-[150px]" value={field.value || ''} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);


export function ProductForm({ product, isCloning = false }: ProductFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { t } = useTranslation();

  const categoriesQuery = useMemo(() => firestore ? collection(firestore, "categories") : null, [firestore]);
  const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(categoriesQuery);

  const cutTypesQuery = useMemo(() => firestore ? collection(firestore, "cutTypes") : null, [firestore]);
  const { data: allCutTypes, isLoading: isLoadingCutTypes } = useCollection<CutType>(cutTypesQuery);

  const gradesQuery = useMemo(() => firestore ? collection(firestore, "grades") : null, [firestore]);
  const { data: grades, isLoading: isLoadingGrades } = useCollection<Grade>(gradesQuery);

  const countriesQuery = useMemo(() => firestore ? collection(firestore, "countries") : null, [firestore]);
  const { data: countries, isLoading: isLoadingCountries } = useCollection<Country>(countriesQuery);

  const rubsQuery = useMemo(() => firestore ? collection(firestore, "rubs") : null, [firestore]);
  const { data: allRubs, isLoading: isLoadingRubs } = useCollection<Attribute>(rubsQuery);
  
  const stylesQuery = useMemo(() => firestore ? collection(firestore, "styles") : null, [firestore]);
  const { data: allStyles, isLoading: isLoadingStyles } = useCollection<Attribute>(stylesQuery);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: { en: '', fr: '', es: '', ar: '', ur: '' },
      slug: "",
      description: { en: '', fr: '', es: '', ar: '', ur: '' },
      price: 0,
      perKgPrice: 0,
      cutWeight: "",
      points: 0,
      category: "",
      cutTypeId: "",
      gradeQuality: "",
      countryOfOrigin: "",
      temperature: "Fresh",
      styles: [],
      rubs: [],
      featured: false,
      deal: false,
      bestseller: false,
      discount: 0,
      images: [],
    },
  });

  const imagePath = form.watch("images.0");
  
  const calculatePrice = useCallback((
    weightStr: string | undefined,
    kgPrice: number | undefined,
    discountPercentage: number | undefined
  ) => {
    const safeKgPrice = kgPrice || 0;
    const safeDiscount = discountPercentage || 0;
    const safeWeightStr = weightStr || '';

    // Find the first weight option to use for the base price calculation
    const firstWeightOption = safeWeightStr.split(',')[0].trim();
    if (!firstWeightOption) {
      form.setValue("price", 0, { shouldValidate: true });
      return;
    }

    const weightValue = parseFloat(firstWeightOption.replace(/[^0-9.]/g, ''));
    let weightInKg = 0;

    if (!isNaN(weightValue)) {
      if (firstWeightOption.toLowerCase().includes('kg')) {
        weightInKg = weightValue;
      } else if (firstWeightOption.toLowerCase().includes('g')) {
        weightInKg = weightValue / 1000;
      }
    }
    
    if (weightInKg > 0 && safeKgPrice > 0) {
      const basePrice = weightInKg * safeKgPrice;
      const finalPrice = basePrice * (1 - safeDiscount / 100);
      form.setValue("price", parseFloat(finalPrice.toFixed(2)), { shouldValidate: true });
    } else {
      // If values are not sufficient for calculation, set price to 0 or another default.
      form.setValue("price", 0, { shouldValidate: true });
    }
  }, [form]);


  useEffect(() => {
    const isDataReady = (
        !isLoadingCategories && !isLoadingCutTypes && !isLoadingGrades && !isLoadingCountries && !isLoadingRubs && !isLoadingStyles
    );

    if (product && isDataReady) {
        setIsSlugManuallyEdited(true);
        const englishName = typeof product.name === 'string' ? product.name : product.name?.en || '';
        const initialName = isCloning && englishName ? `${englishName}-copy` : englishName;
        const initialSlug = isCloning ? createSlug(initialName) : product.slug || createSlug(initialName);
        if (isCloning) {
            setIsSlugManuallyEdited(false);
        }
        
        form.reset({
            name: typeof product.name === 'object' ? product.name : { en: initialName },
            slug: initialSlug,
            description: typeof product.description === 'object' ? product.description : { en: product.description || '' },
            price: product.price || 0,
            perKgPrice: product.perKgPrice || 0,
            cutWeight: product.cutWeight || "",
            points: product.points || 0,
            featured: product.featured || false,
            deal: product.deal || false,
            bestseller: product.bestseller || false,
            discount: product.discount || 0,
            images: product.images || [],
            category: categories?.find(c => c.name.en === product.category)?.id || '',
            cutTypeId: product.cutTypeId || '',
            gradeQuality: grades?.find(g => t(g.name) === product.gradeQuality)?.id || '',
            countryOfOrigin: countries?.find(c => c.name.en === product.countryOfOrigin)?.id || '',
            temperature: product.temperature || 'Fresh',
            styles: product.styles || [],
            rubs: product.rubs || [],
        });
    } else if (!product && isDataReady) {
        setIsSlugManuallyEdited(false);
        form.reset({
            name: { en: '' },
            slug: "",
            description: { en: '' },
            price: 0,
            perKgPrice: 0,
            cutWeight: "",
            points: 0,
            featured: false,
            deal: false,
            bestseller: false,
            discount: 0,
            images: [],
            styles: [],
            rubs: [],
            temperature: "Fresh",
            category: "",
            cutTypeId: "",
            gradeQuality: "",
            countryOfOrigin: "",
        });
    }
  }, [product, isCloning, categories, allCutTypes, grades, countries, allRubs, allStyles, form, isLoadingCategories, isLoadingCutTypes, isLoadingGrades, isLoadingCountries, isLoadingRubs, isLoadingStyles, t]);


  const productName = form.watch("name.en");
  const selectedCategoryId = form.watch("category");
  
  const filteredCutTypes = useMemo(() => {
    if (!selectedCategoryId || !allCutTypes) return allCutTypes || [];
    return allCutTypes.filter(cutType => cutType.categoryId === selectedCategoryId);
  }, [selectedCategoryId, allCutTypes]);

  const showVariations = useMemo(() => {
    if (!selectedCategoryId || !categories) return false;
    const categoryName = categories.find(c => c.id === selectedCategoryId)?.name;
    return t(categoryName) === 'Beef';
  }, [selectedCategoryId, categories, t]);


  useEffect(() => {
    if (!isSlugManuallyEdited && productName) {
      const newSlug = createSlug(productName);
      form.setValue("slug", newSlug, { shouldValidate: true });
    }
  }, [productName, isSlugManuallyEdited, form]);
  
  useEffect(() => {
    const currentCutTypeId = form.getValues('cutTypeId');
    if (selectedCategoryId && currentCutTypeId) {
        const selectedCategory = allCutTypes.find(ct => ct.id === currentCutTypeId)?.categoryId;
        if (selectedCategory !== selectedCategoryId) {
            form.setValue('cutTypeId', '');
        }
    }
  }, [selectedCategoryId, allCutTypes, form]);

  const handleGenerateDescription = async () => {
    setIsGenerating(true);
    const { name, category, cutTypeId, gradeQuality } = form.getValues();

    if (!name.en || !category || !cutTypeId || !gradeQuality) {
       toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide an English Name, Category, Cut Type, and Grade before generating a description.",
      });
      setIsGenerating(false);
      return;
    }

    const categoryObj = categories?.find(c => c.id === category);
    const categoryName = categoryObj?.name?.en;
    const cutTypeName = t(allCutTypes?.find(c => c.id === cutTypeId)?.name);
    const gradeName = t(grades?.find(g => g.id === gradeQuality)?.name);

    const result = await generateDescriptionAction({
      productName: name.en,
      category: categoryName || '',
      cutType: cutTypeName,
      gradeQuality: gradeName,
      additionalDetails: "Keep it concise and appealing."
    });

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: result.error,
      });
    } else if (result.description) {
      form.setValue("description.en", result.description);
      toast({
        title: "Description Generated",
        description: "The AI-powered English description has been added.",
      });
    }
    setIsGenerating(false);
  };
  
  const handleTranslate = async () => {
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

  async function onSubmit(values: ProductFormValues) {
    if (!firestore || !user) return;
    setIsSaving(true);
    
    const category = categories?.find(c => c.id === values.category);
    const categoryName = category?.name.en;
    const cutType = allCutTypes?.find(c => c.id === values.cutTypeId);
    const gradeName = t(grades?.find(g => g.id === values.gradeQuality)?.name);
    const countryName = countries?.find(c => c.id === values.countryOfOrigin)?.name?.en;

    if (!categoryName || !cutType || !gradeName || !countryName) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not resolve all required attribute names.'});
        setIsSaving(false);
        return;
    }

    const productData = {
        ...values,
        category: categoryName,
        cutType: t(cutType.name), // Save the english name for legacy compatibility
        gradeQuality: gradeName,
        countryOfOrigin: countryName,
        updatedAt: new Date().toISOString(),
    };

    if (product && !isCloning) {
      const productRef = doc(firestore, 'products', product.id);
      updateDoc(productRef, productData)
        .then(() => {
          toast({ title: 'Product Updated', description: `Product has been updated.` });
          router.push('/admin/products/all');
          router.refresh();
        })
        .catch(async (error) => {
          const contextualError = await FirestorePermissionError.create({ path: productRef.path, operation: 'update', requestResourceData: productData });
          errorEmitter.emit('permission-error', contextualError);
        })
        .finally(() => {
          setIsSaving(false);
        });
    } else {
      const newProductData = { ...productData, createdAt: new Date().toISOString(), id: '' };
      const collectionRef = collection(firestore, 'products');
      addDoc(collectionRef, newProductData)
        .then(docRef => {
          updateDoc(docRef, { id: docRef.id }); // Add the ID to the document
          toast({ title: 'Product Created', description: `Product has been created.` });
          router.push('/admin/products/all');
          router.refresh();
        })
        .catch(async (error) => {
          const contextualError = await FirestorePermissionError.create({ path: collectionRef.path, operation: 'create', requestResourceData: newProductData });
          errorEmitter.emit('permission-error', contextualError);
        })
        .finally(() => {
          setIsSaving(false);
        });
    }
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Product Details</CardTitle>
                    <Button type="button" size="sm" variant="outline" onClick={handleTranslate} disabled={isTranslating || isSaving}>
                        {isTranslating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4" />}
                        Translate All
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="en" className="w-full">
                <TabsList>
                  <LanguageTab lang="en" label="English" />
                  <LanguageTab lang="es" label="Spanish" />
                  <LanguageTab lang="fr" label="French" />
                  <LanguageTab lang="ar" label="Arabic" />
                  <LanguageTab lang="ur" label="Urdu" />
                </TabsList>
                <div className="space-y-4 pt-6">
                    <TabsContent value="en"><LanguageNameField lang="en" form={form} /></TabsContent>
                    <TabsContent value="es"><LanguageNameField lang="es" form={form} /></TabsContent>
                    <TabsContent value="fr"><LanguageNameField lang="fr" form={form} /></TabsContent>
                    <TabsContent value="ar"><LanguageNameField lang="ar" form={form} /></TabsContent>
                    <TabsContent value="ur"><LanguageNameField lang="ur" form={form} /></TabsContent>
                    
                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL Slug</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., grass-fed-ribeye-steak"
                              {...field}
                              disabled={isSaving}
                              onChange={(e) => {
                                setIsSlugManuallyEdited(true);
                                field.onChange(e);
                              }}
                            />
                          </FormControl>
                          <FormDescription>The unique identifier for the product in the URL. Auto-generated from the English name.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
              </Tabs>
            </CardContent>
          </Card>
           <Card>
             <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Product Description</CardTitle>
                    <Button type="button" size="sm" variant="outline" onClick={handleGenerateDescription} disabled={isGenerating || isSaving}>
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        AI Generate (EN)
                    </Button>
                </div>
             </CardHeader>
             <CardContent>
                <Tabs defaultValue="en" className="w-full">
                    <TabsList>
                      <LanguageTab lang="en" label="English" />
                      <LanguageTab lang="es" label="Spanish" />
                      <LanguageTab lang="fr" label="French" />
                      <LanguageTab lang="ar" label="Arabic" />
                      <LanguageTab lang="ur" label="Urdu" />
                    </TabsList>
                    <div className="pt-6">
                        <TabsContent value="en"><LanguageDescriptionField lang="en" form={form} /></TabsContent>
                        <TabsContent value="es"><LanguageDescriptionField lang="es" form={form} /></TabsContent>
                        <TabsContent value="fr"><LanguageDescriptionField lang="fr" form={form} /></TabsContent>
                        <TabsContent value="ar"><LanguageDescriptionField lang="ar" form={form} /></TabsContent>
                        <TabsContent value="ur"><LanguageDescriptionField lang="ur" form={form} /></TabsContent>
                    </div>
                </Tabs>
             </CardContent>
           </Card>
          <Card>
            <CardHeader><CardTitle>Pricing & Weight</CardTitle></CardHeader>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="cutWeight"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cut Weight Options (comma-separated)</FormLabel>
                        <FormControl>
                           <Input
                            placeholder="e.g., 250g, 500g, 1kg"
                            {...field}
                            onChange={(e) => {
                                field.onChange(e.target.value);
                                const { perKgPrice, discount } = form.getValues();
                                calculatePrice(e.target.value, perKgPrice, discount);
                            }}
                            disabled={isSaving}
                           />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="perKgPrice"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Per Kg Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 89.99"
                            {...field}
                            onChange={(e) => {
                                const newPerKgPrice = e.target.valueAsNumber || 0;
                                field.onChange(newPerKgPrice);
                                const { cutWeight, discount } = form.getValues();
                                calculatePrice(cutWeight, newPerKgPrice, discount);
                            }}
                            disabled={isSaving}
                           />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Base Price (Auto-calculated)</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="e.g., 29.99" {...field} value={field.value || 0} disabled={isSaving} readOnly />
                        </FormControl>
                         <FormDescription>Base price for the first listed cut weight.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="points"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Points</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 10" {...field} value={field.value || 0} onChange={e => field.onChange(parseInt(e.target.value) || 0)} disabled={isSaving} />
                        </FormControl>
                        <FormDescription>
                            Point value for the box builder.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Product Image</CardTitle></CardHeader>
            <CardContent>
                <FormField
                    control={form.control}
                    name="images.0"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Image Path</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="/products/ribeye.jpg" 
                                {...field}
                                value={field.value || ''}
                                disabled={isSaving}
                              />
                            </FormControl>
                            {imagePath && (
                                <div className="mt-4 p-2 border rounded-md w-48 h-48 flex items-center justify-center">
                                    <Image src={getPlaceholderImage(imagePath)} alt="Preview" width={180} height={180} className="object-contain" />
                                </div>
                            )}
                            <FormDescription>Enter the relative path to the image in your S3 bucket.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-8">
          <Card>
            <CardHeader><CardTitle>Organization</CardTitle></CardHeader>
            <CardContent className="space-y-4">
               <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCategories || isSaving}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map(option => (
                          <SelectItem key={option.id} value={option.id}>{t(option.name)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cutTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cut Type</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCutTypes || isSaving || !selectedCategoryId}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a cut type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredCutTypes?.map((option) => (
                          <SelectItem key={option.id} value={option.id}>{t(option.name)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!selectedCategoryId && <FormDescription>Please select a category first.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gradeQuality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade / Quality</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingGrades || isSaving}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a grade or quality" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {grades?.map(option => (
                          <SelectItem key={option.id} value={option.id}>{t(option.name)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                     <FormDescription>
                      This helps the AI generate a better description.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="countryOfOrigin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country of Origin</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCountries || isSaving}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries?.map(option => (
                          <SelectItem key={option.id} value={option.id}>{t(option.name)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Temperature</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex items-center space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Fresh" />
                            </FormControl>
                            <FormLabel className="font-normal">Fresh</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Frozen" />
                            </FormControl>
                            <FormLabel className="font-normal">Frozen</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </CardContent>
          </Card>
          {showVariations && (
          <Card>
             <CardHeader><CardTitle>Variations</CardTitle></CardHeader>
             <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="styles"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Styles</FormLabel>
                        <FormDescription>
                          Select the preparation styles available for this product.
                        </FormDescription>
                      </div>
                      <div className="space-y-2">
                      {allStyles?.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="styles"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.name as string)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), item.name])
                                        : field.onChange(
                                            (field.value || [])?.filter(
                                              (value) => value !== item.name
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {t(item.name)}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rubs"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Rubs</FormLabel>
                        <FormDescription>
                          Select the seasoning rubs available for this product.
                        </FormDescription>
                      </div>
                      <div className="space-y-2">
                      {allRubs?.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="rubs"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.name as string)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), item.name])
                                        : field.onChange(
                                            (field.value || [])?.filter(
                                              (value) => value !== item.name
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {t(item.name)}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
             </CardContent>
          </Card>
          )}
           <Card>
            <CardHeader><CardTitle>Visibility &amp; Tags</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                 <FormField
                    control={form.control}
                    name="featured"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                        <FormLabel>Featured Product</FormLabel>
                        <FormDescription>
                            Display on the homepage.
                        </FormDescription>
                        </div>
                        <FormControl>
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isSaving}
                        />
                        </FormControl>
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="deal"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                        <FormLabel>Active Deal</FormLabel>
                        <FormDescription>
                            Mark this product as a special deal.
                        </FormDescription>
                        </div>
                        <FormControl>
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isSaving}
                        />
                        </FormControl>
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="bestseller"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                        <FormLabel>Bestseller</FormLabel>
                        <FormDescription>
                            Display a "Bestseller" tag.
                        </FormDescription>
                        </div>
                        <FormControl>
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isSaving}
                        />
                        </FormControl>
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="discount"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Discount Percentage</FormLabel>
                        <FormControl>
                           <Input
                            type="number"
                            placeholder="e.g., 15 for 15%"
                            {...field}
                             onChange={(e) => {
                                const newDiscount = e.target.valueAsNumber || 0;
                                field.onChange(newDiscount);
                                const { cutWeight, perKgPrice } = form.getValues();
                                calculatePrice(cutWeight, perKgPrice, newDiscount);
                            }}
                            disabled={isSaving}
                           />
                        </FormControl>
                        <FormDescription>
                           Set a discount percentage to display a tag.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-3 flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Product'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
