
'use client';

import { ProductForm } from '../../ProductForm';
import type { Product } from '@/lib/types';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';

function EditProductPageSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-1/3" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="space-y-8">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function EditProductPage() {
  const firestore = useFirestore();
  const params = useParams();
  const id = params.id as string;
  
  const productRef = useMemo(
    () => (firestore && id ? doc(firestore, 'products', id) : null),
    [firestore, id]
  );
  const { data: product, isLoading } = useDoc<Product>(productRef);

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-8">Edit Product</h1>
        <EditProductPageSkeleton />
      </div>
    );
  }

  if (!product) {
      return <div>Product not found.</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Edit Product</h1>
      <ProductForm product={product} />
    </div>
  );
}
