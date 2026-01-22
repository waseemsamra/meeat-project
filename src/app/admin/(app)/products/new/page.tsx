
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductForm } from "../ProductForm";
import type { Product } from '@/lib/types';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

function NewProductPageSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function NewProductPageContent() {
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const cloneFromId = searchParams.get('cloneFrom');

  const productToCloneRef = useMemo(
    () => (firestore && cloneFromId ? doc(firestore, 'products', cloneFromId) : null),
    [firestore, cloneFromId]
  );
  const { data: productToClone, isLoading } = useDoc<Product>(productToCloneRef);

  const formTitle = productToClone ? `Cloning "${productToClone.name}"` : "Add New Product";

  if (cloneFromId && isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-8">Cloning Product...</h1>
        <NewProductPageSkeleton />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">{formTitle}</h1>
      <ProductForm product={productToClone ?? undefined} isCloning={!!cloneFromId} />
    </div>
  );
}

export default function NewProductPage() {
  return (
    <Suspense fallback={<NewProductPageSkeleton />}>
        <NewProductPageContent />
    </Suspense>
  );
}
