
'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { CutType, Attribute as Category } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { getPlaceholderImage } from '@/lib/utils';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';

function CutTypeCardSkeleton() {
    return (
        <Card className="overflow-hidden">
            <Skeleton className="aspect-[4/3] w-full" />
            <CardContent className="p-6 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
            </CardContent>
        </Card>
    );
}

export default function OurCutsPage() {
    const firestore = useFirestore();
    const { t } = useTranslation();
    const [selectedCategory, setSelectedCategory] = useState('All');

    const cutTypesQuery = useMemo(() => firestore ? collection(firestore, 'cutTypes') : null, [firestore]);
    const { data: allCutTypes, isLoading: isLoadingCutTypes } = useCollection<CutType>(cutTypesQuery);
    
    const categoriesQuery = useMemo(() => firestore ? collection(firestore, 'categories') : null, [firestore]);
    const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(categoriesQuery);

    const sortedAndFilteredCutTypes = useMemo(() => {
        if (!allCutTypes) return [];
        
        const filtered = allCutTypes.filter(cut => {
            if (selectedCategory === 'All') return true;
            const category = categories?.find(c => t(c.name) === selectedCategory);
            return category ? cut.categoryId === category.id : false;
        });

        return [...filtered].sort((a, b) => t(a.name).localeCompare(t(b.name)));
    }, [allCutTypes, selectedCategory, categories, t]);
    
    const isLoading = isLoadingCutTypes || isLoadingCategories;

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold font-headline">A Guide to Our Cuts</h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    Explore our selection of expertly prepared meat cuts, each with its unique flavor and texture profile.
                </p>
            </div>
            
            <div className="flex justify-end mb-8">
                 <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isLoadingCategories}>
                    <SelectTrigger className="w-[240px]">
                        <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Categories</SelectItem>
                        {categories?.map(cat => <SelectItem key={cat.id} value={t(cat.name)}>{t(cat.name)}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => <CutTypeCardSkeleton key={i} />)
                ) : sortedAndFilteredCutTypes.length > 0 ? (
                    sortedAndFilteredCutTypes.map(cut => {
                        const imageUrl = getPlaceholderImage(cut.imageUrl || t(cut.name).toLowerCase().replace(/\s/g, ''));
                        return (
                            <Link key={cut.id} href={`/our-cuts/${cut.slug || cut.id}`} className="group block">
                                <Card className="overflow-hidden h-full transition-shadow duration-300 group-hover:shadow-xl">
                                    <CardHeader className="p-0">
                                        <div className="aspect-[4/3] w-full overflow-hidden bg-black">
                                            <Image
                                                src={imageUrl}
                                                alt={t(cut.name)}
                                                width={400}
                                                height={300}
                                                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                                                data-ai-hint={`${t(cut.name).toLowerCase()} meat`}
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <CardTitle className="text-2xl font-headline group-hover:text-primary transition-colors">{t(cut.name)}</CardTitle>
                                        <p className="mt-2 text-muted-foreground text-sm leading-relaxed line-clamp-3">{t(cut.description)}</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        )
                    })
                ) : (
                    <div className="col-span-full text-center py-16">
                        <h2 className="text-2xl font-headline">No Cuts Found</h2>
                        <p className="mt-2 text-muted-foreground">Try adjusting your filter or check back soon.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
