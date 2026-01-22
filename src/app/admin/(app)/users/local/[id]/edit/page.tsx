
'use client';

import { useParams } from 'next/navigation';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { CustomerForm } from '../../../CustomerForm';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

function EditCustomerPageSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export default function EditLocalCustomerPage() {
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();

  const customerRef = useMemo(() => (firestore ? doc(firestore, 'users', id) : null), [firestore, id]);
  const { data: customer, isLoading } = useDoc<User>(customerRef);

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-8">Edit Local Customer</h1>
        <EditCustomerPageSkeleton />
      </div>
    );
  }

  if (!customer) {
    return <div>Customer not found.</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Edit Local Customer</h1>
      <CustomerForm customer={customer} isOnlineCustomer={false} />
    </div>
  );
}
