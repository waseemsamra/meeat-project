'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Country, Category, LocalizedString } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

const CategoryButton = ({ category, selected, onClick }: { category: LocalizedString, selected: boolean, onClick: () => void }) => {
    const { t } = useTranslation();
    return (
        <Button
            variant={selected ? "default" : "outline"}
            onClick={onClick}
            className={cn("rounded-full flex-shrink-0", selected ? "bg-primary text-primary-foreground" : "border-primary text-primary")}
        >
            {t(category)}
        </Button>
    )
};

export function ShopByOrigin() {
    const firestore = useFirestore();
    const [selectedCategory, setSelectedCategory] = useState('Beef');
    const { t } = useTranslation();

    const countriesQuery = useMemo(() => firestore ? collection(firestore, 'countries') : null, [firestore]);
    const { data: countries, isLoading: isLoadingCountries } = useCollection<Country>(countriesQuery);
    
    const categoriesQuery = useMemo(() => firestore ? collection(firestore, 'categories') : null, [firestore]);
    const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(categoriesQuery);

    const isLoading = isLoadingCountries || isLoadingCategories;
    
    return (
        <section className="py-16 bg-background">
            <div className="container mx-auto px-4">
                <h2 className="text-2xl md:text-3xl font-bold text-center font-headline">{t('shop_by_origin')}</h2>
                <p className="mt-4 max-w-2xl mx-auto text-center text-muted-foreground">
                    {t('shop_by_origin_desc')}
                </p>

                <div className="flex justify-center my-8">
                    <div className="flex gap-2 overflow-x-auto pb-2 -mb-2">
                         {isLoading ? (
                            Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-10 w-24 rounded-full flex-shrink-0" />)
                         ) : (
                            categories?.map(cat => (
                                <CategoryButton 
                                    key={cat.id} 
                                    category={cat.name} 
                                    selected={selectedCategory === cat.name.en} 
                                    onClick={() => setSelectedCategory(cat.name.en || '')}
                                />
                            ))
                         )}
                    </div>
                </div>

                <Carousel
                    opts={{
                        align: "start",
                        loop: true,
                    }}
                    className="w-full"
                >
                    <CarouselContent>
                        {isLoading ? (
                            Array.from({length: 12}).map((_, i) => (
                                <CarouselItem key={i} className="basis-1/4 sm:basis-1/6 md:basis-[12.5%] lg:basis-[8.33%]">
                                    <Skeleton className="h-24 w-full" />
                                </CarouselItem>
                            ))
                        ) : (
                            countries?.map(country => (
                                <CarouselItem key={country.id} className="basis-1/4 sm:basis-1/6 md:basis-[12.5%] lg:basis-[8.33%]">
                                     <Link href={`/products?category=${selectedCategory}&countryOfOrigin=${country.name.en}`} className="group block">
                                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md">
                                            <Image
                                                src={`https://flagcdn.com/w160/${country.code}.png`}
                                                alt={`${t(country.name)} flag`}
                                                fill
                                                className="object-cover transition-transform group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-black/40 flex items-end p-1">
                                                <span className="font-bold text-white text-[10px] leading-tight">{t(country.name)} {t(selectedCategory)}</span>
                                            </div>
                                        </div>
                                    </Link>
                                </CarouselItem>
                            ))
                        )}
                    </CarouselContent>
                    <CarouselPrevious className="hidden sm:flex" />
                    <CarouselNext className="hidden sm:flex" />
                </Carousel>
            </div>
        </section>
    );
}
