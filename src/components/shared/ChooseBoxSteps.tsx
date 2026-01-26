'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { getPlaceholderImage } from '@/lib/utils';
import { useCollection, useFirestore } from '@/firebase';
import type { ChooseBoxStep } from '@/lib/types';
import { collection, orderBy, query } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

const StepSkeleton = () => (
    <div className="flex flex-col items-center text-center">
        <Skeleton className="h-40 w-52 mb-4" />
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-40 mt-1" />
    </div>
);


export function ChooseBoxSteps() {
    const firestore = useFirestore();
    const { t } = useTranslation();

    const stepsQuery = useMemo(() => firestore ? query(collection(firestore, 'chooseBoxSteps'), orderBy('order')) : null, [firestore]);
    const { data: steps, isLoading } = useCollection<ChooseBoxStep>(stepsQuery);
    
    return (
        <section className="py-16 bg-muted">
            <div className="container mx-auto px-4 text-center">
                 <p className="text-sm font-semibold tracking-widest text-primary uppercase">{t('our_plans')}</p>
                 <h2 className="text-4xl md:text-5xl font-bold font-headline mt-2">{t('choose_size_of_box')}</h2>
                 <p className="mt-2 text-muted-foreground">{t('we_only_offer_the_best')}</p>
            </div>
            <div className="container mx-auto px-4 mt-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
                    <div className="md:col-span-1 text-center md:text-left">
                        <h2 className="text-3xl font-bold font-headline text-primary">From block to box to you</h2>
                    </div>
                    <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-8">
                        {isLoading ? (
                            Array.from({ length: 3 }).map((_, i) => <StepSkeleton key={i} />)
                        ) : steps?.map((step) => (
                             <div key={step.id} className="flex flex-col items-center text-center">
                                <div className="relative mb-4">
                                    <span className="text-7xl font-bold text-gray-200 dark:text-gray-700 absolute -top-4 -left-2 z-0">{step.order}</span>
                                    <Image 
                                        src={getPlaceholderImage(step.imageId)} 
                                        alt={t(step.title)} 
                                        width={200} height={150} 
                                        className="rounded-lg object-contain relative z-10" 
                                        data-ai-hint={step.imageHint}
                                    />
                                </div>
                                <h3 className="font-headline text-xl font-semibold text-primary">{t(step.title)}</h3>
                                <p className="text-sm text-muted-foreground mt-2">{t(step.description)}</p>
                            </div>
                        ))}
                    </div>
                </div>
                 <div className="text-center mt-12">
                    <Button asChild variant="outline" size="lg">
                        <Link href="/get-started">Let Get Started</Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
