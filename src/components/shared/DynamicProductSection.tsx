'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import type { Product, Country, HomepageSection } from '@/lib/types';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { getPlaceholderImage } from '@/lib/utils';
import { useSettings } from '@/hooks/useSettings';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const ProductCard = ({ product, countries }: { product: Product, countries: Country[] | null }) => {
    const { defaultCurrency } = useSettings();
    const { t } = useTranslation();
    const country = countries?.find(c => c.name.en === product.countryOfOrigin);
    const imageUrl = getPlaceholderImage(product.images?.[0]);
    const hoverImageUrl = product.images?.[1] ? getPlaceholderImage(product.images[1]) : null;
    
    return (
        <Card className="overflow-hidden transition-shadow hover:shadow-lg group h-full">
            <Link href={`/products/${product.slug}`} className="block h-full flex flex-col">
                <div className="relative">
                    <div className="aspect-[4/3] w-full bg-muted">
                        {imageUrl && (
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
                        )}
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

                <CardContent className="p-4 flex-grow flex flex-col">
                    {product.cutWeight && <p className="text-sm text-muted-foreground">{t(product.cutWeight)}</p>}
                    <h3 className="text-xl font-bold font-headline mt-1">{t(product.name)}</h3>
                    <p className="mt-auto pt-2 text-base text-muted-foreground">
                        from <span className="font-bold text-foreground text-lg">{defaultCurrency?.symbol || '$'}{product.price.toFixed(2)}</span> per unit
                    </p>
                </CardContent>
            </Link>
        </Card>
    )
};

const ProductCardSkeleton = () => (
    <Card className="h-full">
        <Skeleton className="aspect-[4/3] w-full" />
        <CardContent className="p-4 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-5 w-1/4 mt-2" />
        </CardContent>
    </Card>
);

interface DynamicProductSectionProps {
    section?: HomepageSection;
    type: 'category' | 'deal' | 'featured';
    title: string;
}

export function DynamicProductSection({ section, type, title }: DynamicProductSectionProps) {
    const firestore = useFirestore();
    const { t } = useTranslation();
    const [selectedCountry, setSelectedCountry] = useState('All');

    // Query for all products in the section, without country filter
    const baseProductsQuery = useMemo(() => {
        if (!firestore) return null;
        
        const productsCollection = collection(firestore, 'products');
        const constraints = [];

        if (type === 'category' && section) {
            constraints.push(where('category', '==', section.category));
        } else if (type === 'deal') {
            constraints.push(where('deal', '==', true));
        } else if (type === 'featured') {
            constraints.push(where('featured', '==', true));
        }
        
        constraints.push(limit(50)); // Fetch a reasonable number for client-side filtering
        
        return query(productsCollection, ...constraints);
    }, [firestore, section, type]);

    const { data: allSectionProducts, isLoading: isLoadingProducts } = useCollection<Product>(baseProductsQuery);

    const countriesQuery = useMemo(() => firestore ? collection(firestore, 'countries') : null, [firestore]);
    const { data: countries, isLoading: isLoadingCountries } = useCollection<Country>(countriesQuery);
    
    // Determine available countries from the fetched products
    const availableCountries = useMemo(() => {
        if (!allSectionProducts) return new Set<string>();
        return new Set(allSectionProducts.map(p => p.countryOfOrigin));
    }, [allSectionProducts]);

    // Reset country filter if it becomes invalid
    useEffect(() => {
        if (selectedCountry !== 'All' && !availableCountries.has(selectedCountry)) {
            setSelectedCountry('All');
        }
    }, [selectedCountry, availableCountries]);

    // Client-side filtering for display
    const filteredProducts = useMemo(() => {
        if (!allSectionProducts) return [];
        if (selectedCountry === 'All') return allSectionProducts.slice(0, 10);
        return allSectionProducts.filter(p => p.countryOfOrigin === selectedCountry).slice(0, 10);
    }, [allSectionProducts, selectedCountry]);

    const isLoading = isLoadingProducts || isLoadingCountries;

    const viewAllLink = useMemo(() => {
        let baseLink = '/products';
        if (type === 'deal') {
            baseLink = '/products?deal=true';
        } else if (type === 'featured') {
            baseLink = '/products?featured=true';
        } else if (section) {
            baseLink = section.link;
        }

        if (selectedCountry !== 'All') {
            const separator = baseLink.includes('?') ? '&' : '?';
            return `${baseLink}${separator}countryOfOrigin=${encodeURIComponent(selectedCountry)}`;
        }

        return baseLink;
    }, [type, section, selectedCountry]);

    return (
        <section className="py-8">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center mb-8 border-b pb-4 gap-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl md:text-3xl font-bold font-headline">{t(title)}</h2>
                         <Select value={selectedCountry} onValueChange={setSelectedCountry} disabled={isLoadingCountries}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by country" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">{t('all_countries')}</SelectItem>
                                {countries?.map(country => (
                                    <SelectItem key={country.id} value={country.name.en || ''} disabled={!availableCountries.has(country.name.en || '')}>
                                        {t(country.name)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Link href={viewAllLink} className="text-sm font-bold text-primary hover:underline whitespace-nowrap">
                        {t('view_all')} &raquo;
                    </Link>
                </div>
                <Carousel
                    opts={{
                        align: 'start',
                    }}
                    className="w-full"
                >
                    <CarouselContent>
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <CarouselItem key={i} className="basis-full md:basis-1/2 lg:basis-1/3">
                                    <div className="p-1 h-full"><ProductCardSkeleton /></div>
                                </CarouselItem>
                            ))
                        ) : filteredProducts && filteredProducts.length > 0 ? (
                            filteredProducts.map((product) => (
                                <CarouselItem key={product.id} className="basis-full md:basis-1/2 lg:basis-1/3">
                                    <div className="p-1 h-full">
                                        <ProductCard product={product} countries={countries} />
                                    </div>
                                </CarouselItem>
                            ))
                        ) : (
                             <CarouselItem className="w-full">
                                <div className="text-center py-10 text-muted-foreground">
                                    <p>No products available for this selection.</p>
                                </div>
                            </CarouselItem>
                        )}
                    </CarouselContent>
                     {filteredProducts && filteredProducts.length > 3 && (
                        <>
                            <CarouselPrevious className="hidden sm:flex" />
                            <CarouselNext className="hidden sm:flex" />
                        </>
                    )}
                </Carousel>
            </div>
        </section>
    );
}
