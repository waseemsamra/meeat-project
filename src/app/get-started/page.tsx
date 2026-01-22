
'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getPlaceholderImage } from '@/lib/utils';
import { useCollection, useFirestore } from '@/firebase';
import type { BoxOption } from '@/lib/types';
import { collection, orderBy, query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useSettings } from '@/hooks/useSettings';

function BoxSkeleton() {
  return (
    <Card className="flex flex-col items-center text-center p-8">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-8 w-3/4 mt-6" />
      <div className="text-muted-foreground mt-4 border-t pt-4 w-full space-y-2">
        <Skeleton className="h-4 w-1/2 mx-auto" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
      </div>
      <Skeleton className="h-8 w-1/3 my-4" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-12 w-full mt-6" />
    </Card>
  );
}

export default function GetStartedPage() {
  const firestore = useFirestore();
  const { defaultCurrency } = useSettings();

  const boxOptionsQuery = useMemo(
    () =>
      firestore
        ? query(collection(firestore, 'boxOptions'), orderBy('order'))
        : null,
    [firestore]
  );
  const { data: boxOptions, isLoading } = useCollection<BoxOption>(boxOptionsQuery);
  
  return (
    <div className="bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {isLoading ? (
             Array.from({ length: 3 }).map((_, i) => <BoxSkeleton key={i} />)
          ) : boxOptions && boxOptions.length > 0 ? (
            boxOptions.map((box) => (
              <Card
                key={box.id}
                className="flex flex-col items-center text-center p-8"
              >
                <div className="w-full aspect-[4/3] relative overflow-hidden rounded-lg bg-black">
                  <Image
                    src={getPlaceholderImage(box.imageId)}
                    alt={box.name}
                    fill
                    className="object-contain"
                    data-ai-hint="meat box"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
                <h2 className="text-3xl font-headline mt-6">{box.name}</h2>
                <div className="text-muted-foreground mt-4 border-t pt-4 w-full">
                  <p>Ideal for {box.people}</p>
                  <p>{box.weight}</p>
                </div>
                <p className="text-2xl font-bold text-destructive my-4">
                  {defaultCurrency?.symbol || '$'}{(typeof box.price === 'string' ? parseFloat(box.price) : box.price || 0).toFixed(2)} /meat
                </p>
                <Button
                  asChild
                  variant={box.name === 'Large Box' ? 'outline' : 'default'}
                  className="w-full"
                >
                  <Link href={`/get-started/build?box=${encodeURIComponent(box.name)}&points=${box.points || 0}`}>BUILD YOUR BOX</Link>
                </Button>
                <p className="text-sm text-muted-foreground mt-6">
                  {box.description}
                </p>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-16">
              <h2 className="text-2xl font-headline">No Boxes Available</h2>
              <p className="mt-2 text-muted-foreground">
                Please check back later or contact support.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
