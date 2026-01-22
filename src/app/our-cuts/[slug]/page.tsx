
'use client';

import { useEffect, useState, useMemo } from 'react';
import { initializeFirebase } from '@/firebase/server';
import { doc, getDoc, collection, getDocs, query, where, limit, collectionGroup } from 'firebase/firestore';
import type { CutType, Category, Product } from '@/lib/types';
import { notFound, useParams } from 'next/navigation';
import Image from 'next/image';
import { getPlaceholderImage } from '@/lib/utils';
import { Facebook, Twitter, Mail, Link as LinkIcon, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';
import { useCollection, useDoc, useFirestore } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

const createSlug = (name: string) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/[\s-]+/g, '-');
}

function CutTypeDetailSkeleton() {
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                    <Skeleton className="h-10 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/4 mb-4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full mt-2" />
                    <Skeleton className="h-4 w-2/3 mt-2" />
                    <Skeleton className="h-10 w-3/4 mt-8" />
                </div>
                <Skeleton className="h-96 w-full bg-black rounded-lg" />
            </div>
        </div>
    )
}


export default function CutTypeDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { t } = useTranslation();
  const firestore = useFirestore();

  const [cutType, setCutType] = useState<CutType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getCutType() {
        if (!firestore || !slug) return;
        setIsLoading(true);
        const cutTypesRef = collection(firestore, 'cutTypes');
        
        const qBySlug = query(cutTypesRef, where('slug', '==', slug), limit(1));
        const slugSnapshot = await getDocs(qBySlug);
        
        if (!slugSnapshot.empty) {
            const docSnap = slugSnapshot.docs[0];
            setCutType({ ...docSnap.data(), id: docSnap.id } as CutType);
            setIsLoading(false);
            return;
        }

        const allCutTypesSnapshot = await getDocs(cutTypesRef);
        for (const docSnap of allCutTypesSnapshot.docs) {
            const cutTypeData = docSnap.data();
            const enName = typeof cutTypeData.name === 'object' ? cutTypeData.name.en : cutTypeData.name;
            if (enName && createSlug(enName) === slug) {
                setCutType({ ...(cutTypeData as CutType), id: docSnap.id });
                setIsLoading(false);
                return;
            }
        }
        setCutType(null);
        setIsLoading(false);
    }
    getCutType();
  }, [slug, firestore]);
  
  const categoryQuery = useMemo(() => {
    if (!firestore || !cutType?.categoryId) return null;
    return doc(firestore, 'categories', cutType.categoryId);
  }, [firestore, cutType]);
  const { data: category } = useDoc<Category>(categoryQuery);
  
  const relatedProductsQuery = useMemo(() => {
    if (!firestore || !cutType) return null;
    return query(collection(firestore, 'products'), where('cutTypeId', '==', cutType.id));
  }, [firestore, cutType]);
  const { data: relatedProducts } = useCollection<Product>(relatedProductsQuery);


  if (isLoading) {
    return <CutTypeDetailSkeleton />;
  }

  if (!cutType) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
                <h1 className="text-4xl font-bold font-headline mb-2 uppercase tracking-wider">{t(cutType.name)}</h1>
                <p className="text-sm text-muted-foreground">UPC Number: 1464</p>
                <p className="text-sm mt-4">{t(cutType.description)}</p>
                <p className="text-sm mt-2">Learn more about this beef cut <a href="#" className="underline">here</a>.</p>

                <div className="mt-8 flex items-center gap-4">
                    <p className="text-sm font-semibold">Share This Cut</p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon"><Facebook className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon"><Twitter className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon"><Mail className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon"><LinkIcon className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon"><Printer className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>
            <div className="bg-black rounded-lg overflow-hidden">
                {cutType.imageUrl && (
                    <Image
                        src={getPlaceholderImage(cutType.imageUrl)}
                        alt={t(cutType.name)}
                        width={600}
                        height={400}
                        className="rounded-lg object-contain w-full h-full"
                        data-ai-hint={`${t(cutType.name).toLowerCase()} meat`}
                    />
                )}
                 <div className="flex justify-end gap-4 mt-2">
                    <Button variant="link" size="sm">DOWNLOAD HI RES IMAGE</Button>
                    <Button variant="link" size="sm">DOWNLOAD LOW RES IMAGE</Button>
                </div>
            </div>
        </div>
        
        <div className="mt-16 pt-12 border-t grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
                <h2 className="text-2xl font-bold font-headline mb-4">WHERE THIS CUT COMES FROM</h2>
                <Image 
                    src="https://storage.googleapis.com/proud-diode-429312-r2.appspot.com/beef_cuts_diagram.png"
                    alt="Beef cuts diagram"
                    width={500}
                    height={300}
                    className="object-contain"
                />
            </div>
             <div>
                {category && (
                    <>
                        <h2 className="text-2xl font-bold font-headline mb-4 uppercase">{t(category.name)} PRIMAL | PRIMAL CUT</h2>
                        <p className="text-muted-foreground">{t(category.description)}</p>
                    </>
                )}
            </div>
        </div>

        {relatedProducts && relatedProducts.length > 0 && (
            <div className="mt-16 pt-12 border-t">
                 <h2 className="text-3xl font-bold font-headline mb-8">Shop {t(cutType.name)} Products</h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                     {relatedProducts.map(product => (
                        <Link href={`/products/${product.slug}`} key={product.id} className="group">
                             <div className="border rounded-lg overflow-hidden h-full flex flex-col">
                                 <div className="aspect-[4/3] w-full bg-black">
                                    <Image
                                        src={getPlaceholderImage(product.images[0])}
                                        alt={t(product.name)}
                                        width={400}
                                        height={300}
                                        className="w-full h-full object-contain transition-transform group-hover:scale-105"
                                        data-ai-hint={`${t(product.name).toLowerCase()}`}
                                    />
                                 </div>
                                 <div className="p-4 flex-grow flex flex-col">
                                     <h3 className="font-semibold group-hover:text-primary">{t(product.name)}</h3>
                                     <p className="text-sm text-muted-foreground mt-auto pt-2">${product.price.toFixed(2)}</p>
                                 </div>
                             </div>
                         </Link>
                     ))}
                 </div>
            </div>
        )}
    </div>
  );
}
