
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useCollection, useDoc, useFirestore } from '@/firebase';
import { doc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import type { Product, InventoryLot, Country } from '@/lib/types';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { ProductImageGallery } from './ProductImageGallery';
import { ProductActions } from './ProductActions';
import { useTranslation } from '@/hooks/useTranslation';
import { Skeleton } from '@/components/ui/skeleton';

// Skeleton component for loading state
function ProductDetailSkeleton() {
    return (
        <div className="container mx-auto px-4 py-8">
            <Skeleton className="h-6 w-1/2 mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                <div className="lg:col-span-2">
                    <Skeleton className="aspect-square w-full" />
                    <div className="flex justify-center gap-2 mt-4">
                        <Skeleton className="w-1/5 aspect-square" />
                        <Skeleton className="w-1/5 aspect-square" />
                        <Skeleton className="w-1/5 aspect-square" />
                    </div>
                </div>
                <div className="lg:col-span-3 space-y-6">
                    <Skeleton className="h-10 w-3/4" />
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </div>
        </div>
    );
}

export default function ProductDetailPage() {
    const params = useParams();
    const slug = params.slug as string;
    const firestore = useFirestore();
    const { t } = useTranslation();
    
    // State to hold the product ID once found
    const [productId, setProductId] = useState<string | null>(null);
    const [isIdLoading, setIsIdLoading] = useState(true);

    // Effect to find product ID from slug
    useEffect(() => {
        if (!firestore || !slug) return;
        
        const findProduct = async () => {
            setIsIdLoading(true);
            const productsRef = collection(firestore, 'products');
            const q = query(productsRef, where('slug', '==', slug), limit(1));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                setProductId(querySnapshot.docs[0].id);
            } else {
                setProductId(null); // Explicitly set to null if not found
            }
            setIsIdLoading(false);
        };

        findProduct();
    }, [slug, firestore]);

    // Memoize doc/query refs
    const productRef = useMemo(() => {
        if (!firestore || !productId) return null;
        return doc(firestore, 'products', productId);
    }, [firestore, productId]);
    
    const inventoryQuery = useMemo(() => {
        if (!firestore || !productId) return null;
        return query(collection(firestore, 'inventoryLots'), where('productId', '==', productId));
    }, [firestore, productId]);
    
    const countriesQuery = useMemo(() => firestore ? collection(firestore, 'countries') : null, [firestore]);

    // Fetch data using client-side hooks
    const { data: product, isLoading: isLoadingProduct } = useDoc<Product>(productRef);
    const { data: inventoryLots, isLoading: isLoadingInventory } = useCollection<InventoryLot>(inventoryQuery);
    const { data: countries, isLoading: isLoadingCountries } = useCollection<Country>(countriesQuery);

    const isLoading = isIdLoading || isLoadingProduct || isLoadingInventory || isLoadingCountries;

    if (isLoading) {
        return <ProductDetailSkeleton />;
    }

    if (!product) {
        notFound();
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <nav className="text-sm text-muted-foreground mb-8">
                <Link href="/" className="hover:text-primary">Home</Link>
                <span className="mx-2">&gt;</span>
                <Link href="/products" className="hover:text-primary">All Products</Link>
                <span className="mx-2">&gt;</span>
                <span className="text-foreground">{t(product.name)}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                <div className="lg:col-span-2">
                    <ProductImageGallery images={product.images} productName={t(product.name)} />
                </div>

                <div className="lg:col-span-3 space-y-6">
                    <h1 className="text-3xl lg:text-4xl font-bold font-headline">{t(product.name)}</h1>
                    
                    <div className="flex items-center gap-2">
                        <div className="flex items-center">
                            {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-amber-500 fill-amber-500" />)}
                        </div>
                        <span className="text-sm text-muted-foreground">2 reviews</span>
                    </div>
                    
                    <ProductActions product={product} inventoryLots={inventoryLots || []} countries={countries} />

                </div>
            </div>

            <div className="mt-24">
                <h2 className="text-3xl font-bold font-headline mb-4">You Might Also Like</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                    {/* Placeholder for related products */}
                </div>
            </div>
        </div>
    );
}
