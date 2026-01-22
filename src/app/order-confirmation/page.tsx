
'use client';

import { Suspense } from 'react';
import { ConfirmationPage } from './ConfirmationPage';
import { Skeleton } from '@/components/ui/skeleton';

function ConfirmationPageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-12 text-center max-w-4xl">
            <Skeleton className="h-12 w-full mb-8" />
            <div className="grid grid-cols-4 gap-8 mb-8">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
            <Skeleton className="h-12 w-full mb-12" />
            <Skeleton className="h-8 w-1/3 mx-auto mb-8" />
            <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
    )
}

export default function OrderConfirmationPage() {
    return (
        <Suspense fallback={<ConfirmationPageSkeleton />}>
            <ConfirmationPage />
        </Suspense>
    );
}
