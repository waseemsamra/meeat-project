
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { CutType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { getPlaceholderImage } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export function ShopByCut() {
    const firestore = useFirestore();
    const { t } = useTranslation();

    const cutTypesQuery = useMemo(() => firestore ? collection(firestore, 'cutTypes') : null, [firestore]);
    const { data: cutTypes, isLoading: isLoadingCutTypes } = useCollection<CutType>(cutTypesQuery);

    const isLoading = isLoadingCutTypes;
    
    const displayedCutTypes = useMemo(() => cutTypes?.slice(0, 10) || [], [cutTypes]);
    
    return (
        <section className="py-16 bg-card">
            <div className="container mx-auto px-4">
                <h2 className="text-xl md:text-2xl font-bold text-center font-headline">{t('shop_by_cut')}</h2>
                
                <Carousel
                    opts={{
                        align: "start",
                    }}
                    className="w-full mt-12"
                >
                    <CarouselContent>
                        {isLoading ? (
                            Array.from({length: 6}).map((_, i) => (
                                <CarouselItem key={i} className="basis-2/5 sm:basis-1/2 md:basis-1/4 lg:basis-1/6">
                                    <Skeleton className="h-48 w-full" />
                                </CarouselItem>
                            ))
                        ) : (
                            <>
                                {displayedCutTypes?.map(cut => {
                                    const imageUrl = getPlaceholderImage(cut.imageUrl || t(cut.name).toLowerCase().replace(/\s/g, ''));
                                    return(
                                    <CarouselItem key={cut.id} className="basis-2/5 sm:basis-1/2 md:basis-1/4 lg:basis-1/6">
                                         <Link href={`/products?cutTypeId=${cut.id}`}>
                                            <div className="text-center group">
                                                <div className="relative w-28 h-28 md:w-36 md:h-36 mx-auto bg-muted rounded-full border-4 border-muted transition-all group-hover:ring-2 group-hover:ring-primary overflow-hidden">
                                                    <Image
                                                        src={imageUrl}
                                                        alt={t(cut.name)}
                                                        fill
                                                        className="w-full h-full object-cover"
                                                        data-ai-hint={`${t(cut.name).toLowerCase()} meat`}
                                                    />
                                                </div>
                                                <p className="mt-4 font-semibold text-center">{t(cut.name)}</p>
                                            </div>
                                        </Link>
                                    </CarouselItem>
                                )})}
                                <CarouselItem className="basis-2/5 sm:basis-1/2 md:basis-1/4 lg:basis-1/6">
                                    <Link href="/products">
                                        <div className="text-center group h-full flex flex-col justify-center items-center">
                                            <div className="rounded-full border-4 border-dashed border-muted bg-background object-cover h-28 w-28 md:h-36 md:w-36 mx-auto transition-all group-hover:border-primary flex items-center justify-center flex-col">
                                                <span className="font-semibold text-sm">View All</span>
                                                <ArrowRight className="h-5 w-5 mt-1 text-muted-foreground transition-transform group-hover:translate-x-1" />
                                            </div>
                                        </div>
                                    </Link>
                                </CarouselItem>
                            </>
                        )}
                    </CarouselContent>
                    <CarouselPrevious className="hidden sm:flex" />
                    <CarouselNext className="hidden sm:flex" />
                </Carousel>
            </div>
        </section>
    );
}
