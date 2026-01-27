
'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { getPlaceholderImage } from '@/lib/utils';
import { useCollection, useFirestore } from '@/firebase';
import type { ExploreRangeItem } from '@/lib/types';
import { collection, orderBy, query } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

const ItemSkeleton = () => (
    <CarouselItem className="basis-1/2 md:basis-1/4 pl-4">
        <div className="flex flex-col items-center text-center">
            <Skeleton className="h-28 w-44 mb-4" />
            <Skeleton className="h-6 w-24" />
        </div>
    </CarouselItem>
);

export function ExploreTheRange() {
    const firestore = useFirestore();
    const { t } = useTranslation();

    const rangeItemsQuery = useMemo(() => firestore ? query(collection(firestore, 'exploreRangeItems'), orderBy('order')) : null, [firestore]);
    const { data: items, isLoading } = useCollection<ExploreRangeItem>(rangeItemsQuery);
    
    return (
        <section className="py-16 bg-background">
            <div className="container mx-auto px-4 text-center">
                 <p className="text-sm font-semibold tracking-widest text-primary uppercase">{t('explore_the_range_subtitle') || 'A CUT ABOVE THE REST'}</p>
                 <h2 className="text-2xl md:text-3xl font-bold font-headline mt-2">{t('explore_the_range')}</h2>
            </div>
            <div className="container mx-auto px-4 mt-12">
                <Carousel
                  opts={{
                    align: "start",
                    dragFree: true,
                  }}
                  className="w-full dir-rtl md:dir-ltr" // RTL on mobile, LTR on desktop
                >
                    <CarouselContent className="-ml-4">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => <ItemSkeleton key={i} />)
                        ) : items?.map((item) => (
                             <CarouselItem key={item.id} className="basis-1/2 md:basis-1/4 pl-4">
                                <Link href={item.link} className="flex flex-col items-center text-center group">
                                    <div className="relative mb-4 h-32 w-48">
                                        <Image 
                                            src={getPlaceholderImage(item.imageUrl)} 
                                            alt={t(item.name)} 
                                            fill
                                            className="object-contain transition-transform duration-300 group-hover:scale-105"
                                        />
                                    </div>
                                    <h3 className="font-headline text-xl font-semibold tracking-wider text-primary group-hover:underline">{t(item.name)}</h3>
                                </Link>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="hidden md:flex" />
                    <CarouselNext className="hidden md:flex" />
                </Carousel>
            </div>
        </section>
    );
}
