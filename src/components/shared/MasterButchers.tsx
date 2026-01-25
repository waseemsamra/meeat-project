'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { getPlaceholderImage } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { CleaverIcon, CowIcon } from '../icons';
import { Box, Recycle, Truck, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore } from '@/firebase';
import { collection, orderBy, query } from 'firebase/firestore';
import type { ButcherTab } from '@/lib/types';
import { useTranslation } from '@/hooks/useTranslation';
import { Skeleton } from '../ui/skeleton';

const iconMap: { [key: string]: React.FC<any> } = {
  CleaverIcon: CleaverIcon,
  Box: Box,
  Truck: Truck,
  CowIcon: CowIcon,
  Recycle: Recycle,
};

const TabSkeleton = () => (
    <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
    </div>
)

const ContentSkeleton = () => (
    <div className="bg-primary text-primary-foreground rounded-lg overflow-hidden p-8 lg:p-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
                <Skeleton className="h-8 w-3/4 bg-primary-foreground/20" />
                <Skeleton className="h-4 w-full bg-primary-foreground/20" />
                <Skeleton className="h-4 w-full bg-primary-foreground/20" />
                <Skeleton className="h-4 w-5/6 bg-primary-foreground/20" />
                <Skeleton className="h-12 w-32 mt-2 bg-secondary/80" />
            </div>
            <Skeleton className="aspect-square w-full bg-primary-foreground/20 rounded-lg" />
        </div>
    </div>
)

export function MasterButchers() {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const { t } = useTranslation();
  const firestore = useFirestore();

  const tabsQuery = useMemo(() => firestore ? query(collection(firestore, 'butcherTabs'), orderBy('order')) : null, [firestore]);
  const { data: tabsData, isLoading } = useCollection<ButcherTab>(tabsQuery);

  useEffect(() => {
    if (!activeTab && tabsData && tabsData.length > 0) {
      setActiveTab(tabsData[0].id);
    }
  }, [tabsData, activeTab]);

  const activeTabData = useMemo(() => {
    return tabsData?.find(tab => tab.id === activeTab);
  }, [tabsData, activeTab]);

  return (
    <section className="bg-background py-16">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
          <div className="md:col-span-1 lg:col-span-1">
            <div className="flex flex-col gap-2">
              {isLoading ? <TabSkeleton /> : tabsData?.map(tab => {
                const IconComponent = iconMap[tab.icon] || CleaverIcon;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "w-full text-left p-4 rounded-lg transition-colors flex items-center gap-4",
                            activeTab === tab.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        )}
                        >
                        <IconComponent className="h-6 w-6" />
                        <span className="font-semibold">{t(tab.title)}</span>
                    </button>
                )
              })}
            </div>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            {isLoading ? <ContentSkeleton /> : activeTabData && (
              <div className="bg-primary text-primary-foreground rounded-lg overflow-hidden p-8 lg:p-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div>
                          <h2 className="text-3xl font-bold font-headline">{t(activeTabData.contentTitle)}</h2>
                          <div className="mt-4 max-w-none space-y-4">
                              {t(activeTabData.contentDescription).split('\n').map((p, i) => <p key={i}>{p}</p>)}
                          </div>
                           <Button asChild variant="secondary" size="lg" className="mt-6">
                              <Link href={activeTabData.contentButtonLink || '#'}>{t(activeTabData.contentButtonText)}</Link>
                          </Button>
                      </div>
                      <div className="relative aspect-square w-full">
                           <Image 
                              src={getPlaceholderImage(activeTabData.contentImage)}
                              alt={t(activeTabData.contentTitle)}
                              fill
                              className="object-cover rounded-lg shadow-lg"
                              data-ai-hint={activeTabData.contentImageHint}
                          />
                      </div>
                  </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
