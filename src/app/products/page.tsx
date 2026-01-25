'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Product, Attribute, Country, Grade, CutType, LocalizedString, Category } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getPlaceholderImage } from '@/lib/utils';
import { Info } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const ProductCard = ({ product, countries }: { product: Product; countries: Country[] | null }) => {
    const { defaultCurrency } = useSettings();
    const { t } = useTranslation();
    const country = countries?.find(c => c.name.en === product.countryOfOrigin);
    const imageUrl = getPlaceholderImage(product.images?.[0]);
    const hoverImageUrl = product.images?.[1] ? getPlaceholderImage(product.images[1]) : null;

    if (!imageUrl) {
        return null;
    }

    return (
        <Card className="overflow-hidden transition-shadow hover:shadow-lg group flex flex-col h-full">
            <Link href={`/products/${product.slug}`} className="block flex flex-col flex-grow">
                <div className="relative">
                    <div className="aspect-[4/3] w-full bg-muted">
                        <Image
                            src={imageUrl}
                            alt={t(product.name)}
                            fill
                            className={cn(
                                "object-cover transition-all duration-300",
                                hoverImageUrl ? "opacity-100 group-hover:opacity-0" : "group-hover:scale-105"
                            )}
                            data-ai-hint={`${product.category.toLowerCase()} ${product.cutType.toLowerCase()}`}
                        />
                        {hoverImageUrl && (
                            <Image
                                src={hoverImageUrl}
                                alt={t(product.name)}
                                fill
                                className="object-cover opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-105"
                                data-ai-hint={`${product.category.toLowerCase()} ${product.cutType.toLowerCase()}`}
                            />
                        )}
                    </div>
                    {product.bestseller && (
                        <div className="absolute top-3 right-3 z-10">
                            <Badge variant="default" className="bg-white text-black hover:bg-white/90 shadow-md">
                                {t('bestseller')}
                            </Badge>
                        </div>
                    )}
                </div>
                <div className="p-4 flex flex-col flex-grow">
                    {product.cutWeight && <p className="text-sm text-muted-foreground">{t(product.cutWeight)}</p>}
                    <h3 className="text-xl font-bold font-headline mt-1">{t(product.name)}</h3>
                    <p className="mt-auto pt-2 text-base text-muted-foreground">
                        from <span className="font-bold text-foreground text-lg">{defaultCurrency?.symbol || '$'}{product.price.toFixed(2)}</span> per unit
                    </p>
                </div>
            </Link>
        </Card>
    );
};

const ProductCardSkeleton = () => (
    <Card>
        <Skeleton className="aspect-[4/3] w-full" />
        <CardContent className="p-4 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-5 w-1/4 mt-2" />
        </CardContent>
    </Card>
);

function getNestedValue(obj: any, path: string): string {
    const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
    return typeof value === 'string' ? value : '';
}

const FilterSelect = ({ value, onValueChange, placeholder, options, isLoading, valueField = 'name', allTextKey }: {
    value: string;
    onValueChange: (value: string) => void;
    placeholder: string;
    options: any[] | null;
    isLoading: boolean;
    valueField?: string;
    allTextKey: any;
}) => {
    const { t } = useTranslation();
    return (
        <Select value={value} onValueChange={onValueChange} disabled={isLoading}>
            <SelectTrigger className="w-full sm:w-auto">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="All">{t(allTextKey)}</SelectItem>
                {options?.map((option: any) => (
                    <SelectItem key={option.id} value={getNestedValue(option, valueField) || option.id}>
                        {t(option.name)}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};

function ProductsPageContent() {
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const [visibleCount, setVisibleCount] = useState(12);

  // Data fetching
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(useMemo(() => firestore ? collection(firestore, 'products') : null, [firestore]));
  const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(useMemo(() => firestore ? collection(firestore, 'categories') : null, [firestore]));
  const { data: allCutTypes, isLoading: isLoadingCutTypes } = useCollection<CutType>(useMemo(() => firestore ? collection(firestore, 'cutTypes') : null, [firestore]));
  const { data: grades, isLoading: isLoadingGrades } = useCollection<Grade>(useMemo(() => firestore ? collection(firestore, 'grades') : null, [firestore]));
  const { data: countries, isLoading: isLoadingCountries } = useCollection<Country>(useMemo(() => firestore ? collection(firestore, 'countries') : null, [firestore]));
  const { data: temperatures, isLoading: isLoadingTemperatures } = useCollection<Attribute>(useMemo(() => firestore ? collection(firestore, 'temperatures') : null, [firestore]));

  const isLoading = isLoadingProducts || isLoadingCategories || isLoadingCutTypes || isLoadingGrades || isLoadingCountries || isLoadingTemperatures;

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
  const [selectedCutType, setSelectedCutType] = useState(searchParams.get('cutTypeId') || 'All');
  const [selectedGrade, setSelectedGrade] = useState(searchParams.get('grade') || 'All');
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get('countryOfOrigin') || 'All');
  const [selectedTemperature, setSelectedTemperature] = useState(searchParams.get('temperature') || 'All');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  
  // Update searchQuery state if the URL parameter changes
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
    setSelectedCategory(searchParams.get('category') || 'All');
    setSelectedCountry(searchParams.get('countryOfOrigin') || 'All');
    setSelectedTemperature(searchParams.get('temperature') || 'All');
    setSelectedCutType(searchParams.get('cutTypeId') || 'All');
  }, [searchParams]);

  // Memoize filtered cut types based on selected category
  const filteredCutTypes = useMemo(() => {
    if (selectedCategory === 'All' || !allCutTypes || !categories) {
      return allCutTypes || [];
    }
    const category = categories.find(c => c.name.en === selectedCategory);
    if (!category) return allCutTypes || [];
    
    return allCutTypes.filter(cutType => cutType.categoryId === category.id);
  }, [allCutTypes, categories, selectedCategory]);

  // Reset cut type when category changes
  useEffect(() => {
    // Do not reset if the component is just initializing
    if (searchParams.get('cutTypeId')) return;
    setSelectedCutType('All');
  }, [selectedCategory, searchParams]);

  // Memoized filtering logic for products
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(product => {
      const categoryMatch = selectedCategory === 'All' || product.category === selectedCategory;
      const cutTypeMatch = selectedCutType === 'All' || product.cutTypeId === selectedCutType;
      const gradeMatch = selectedGrade === 'All' || product.gradeQuality === selectedGrade;
      const countryMatch = selectedCountry === 'All' || product.countryOfOrigin === selectedCountry;
      const temperatureMatch = selectedTemperature === 'All' || product.temperature === selectedTemperature;
      const searchMatch = searchQuery === '' || 
                          t(product.name).toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (product.description && t(product.description).toLowerCase().includes(searchQuery.toLowerCase()));
      return categoryMatch && cutTypeMatch && gradeMatch && countryMatch && temperatureMatch && searchMatch;
    });
  }, [products, selectedCategory, selectedCutType, selectedGrade, selectedCountry, selectedTemperature, searchQuery, t]);
  
  // Effect to update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory !== 'All') params.set('category', selectedCategory);
    if (selectedCutType !== 'All') params.set('cutTypeId', selectedCutType);
    if (selectedGrade !== 'All') params.set('grade', selectedGrade);
    if (selectedCountry !== 'All') params.set('countryOfOrigin', selectedCountry);
    if (selectedTemperature !== 'All') params.set('temperature', selectedTemperature);
    if (searchQuery) params.set('search', searchQuery);

    router.replace(`${pathname}?${params.toString()}`);
  }, [selectedCategory, selectedCutType, selectedGrade, selectedCountry, selectedTemperature, searchQuery, pathname, router]);

  const clearFilters = () => {
    setSelectedCategory('All');
    setSelectedCutType('All');
    setSelectedGrade('All');
    setSelectedCountry('All');
    setSelectedTemperature('All');
    // We don't clear the search query here as it's controlled from the header
  };

  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const showViewMore = filteredProducts.length > visibleCount;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold font-headline mb-4">{t('our_selection')}</h1>
      <p className="text-muted-foreground mb-8">{t('browse_our_collection_desc')}</p>

      <Card className="mb-8">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center flex-wrap">
            <FilterSelect value={selectedCategory} onValueChange={setSelectedCategory} placeholder="Categories" options={categories} isLoading={isLoadingCategories} allTextKey="all_categories" valueField="name.en" />
            <div className="flex items-center gap-2">
              <FilterSelect value={selectedCutType} onValueChange={setSelectedCutType} placeholder="Cut Types" options={filteredCutTypes} isLoading={isLoadingCutTypes} valueField="id" allTextKey="all_cut_types" />
               <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                    <Link href="/our-cuts" title="Learn about cuts">
                        <Info className="h-4 w-4" />
                    </Link>
                </Button>
            </div>
            <FilterSelect value={selectedGrade} onValueChange={setSelectedGrade} placeholder="Grades" options={grades} isLoading={isLoadingGrades} allTextKey="all_grades" />
            <FilterSelect value={selectedCountry} onValueChange={setSelectedCountry} placeholder="Countries" options={countries} isLoading={isLoadingCountries} valueField="name.en" allTextKey="all_countries" />
            <FilterSelect value={selectedTemperature} onValueChange={setSelectedTemperature} placeholder="Temperatures" options={temperatures} isLoading={isLoadingTemperatures} allTextKey="all_temperatures" />
            <Button variant="ghost" onClick={clearFilters} className="ml-auto">{t('clear_filters')}</Button>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {isLoading ? (
          Array.from({ length: 12 }).map((_, i) => <ProductCardSkeleton key={i} />)
        ) : displayedProducts.length > 0 ? (
          displayedProducts.map(product => (
            <ProductCard key={product.id} product={product} countries={countries} />
          ))
        ) : (
           <div className="col-span-full text-center py-16">
                <h2 className="text-2xl font-headline">No Products Found</h2>
                <p className="mt-2 text-muted-foreground">Try adjusting your filters or search to find what you're looking for.</p>
                <Button onClick={clearFilters} className="mt-4">{t('clear_filters')}</Button>
            </div>
        )}
      </div>

       {showViewMore && !isLoading && (
        <div className="text-center mt-12">
          <Button onClick={() => setVisibleCount(prev => prev + 12)} size="lg">
            {t('view_more_products')}
          </Button>
        </div>
      )}
    </div>
  );
}

function ProductsPageSkeleton() {
    return (
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-10 w-1/3 mb-4" />
        <Skeleton className="h-5 w-1/2 mb-8" />
        <Skeleton className="h-16 w-full mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {Array.from({ length: 12 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
}

export default function ProductsPage() {
    return (
        <Suspense fallback={<ProductsPageSkeleton />}>
            <ProductsPageContent />
        </Suspense>
    )
}
