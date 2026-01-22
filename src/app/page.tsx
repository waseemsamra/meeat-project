
'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { collection, query, where, limit, doc, orderBy } from 'firebase/firestore';
import type { Product, Country, HomepageSection, HeroSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getPlaceholderImage } from '@/lib/utils';
import { ShopByOrigin } from '@/components/shared/ShopByOrigin';
import { ShopByCut } from '@/components/shared/ShopByCut';
import { CleaverIcon, CowIcon, LeafIcon, TruckIcon } from '@/components/icons';
import { ChefHat, Package } from 'lucide-react';
import { DynamicProductSection } from '@/components/shared/DynamicProductSection';
import { useTranslation } from '@/hooks/useTranslation';

export default function Home() {
  const firestore = useFirestore();
  const { t } = useTranslation();
  
  const heroSettingsRef = useMemo(() => firestore ? doc(firestore, 'settings', 'hero') : null, [firestore]);
  const { data: heroSettings, isLoading: isLoadingHero } = useDoc<HeroSettings>(heroSettingsRef);

  const heroImage = heroSettings?.imageUrl ? getPlaceholderImage(heroSettings.imageUrl) : "https://picsum.photos/seed/hero-banner/1200/500";
  const heroTitle = heroSettings?.title;
  const heroSubtitle = heroSettings?.subtitle;
  const heroButtonText = heroSettings?.buttonText;
  const heroButtonLink = heroSettings?.buttonLink;
  
  const homepageSectionsQuery = useMemo(() => firestore ? query(collection(firestore, 'categoryBanners'), orderBy('order')) : null, [firestore]);
  const { data: homepageSections, isLoading: isLoadingSections } = useCollection<HomepageSection>(homepageSectionsQuery);

  const isLoading = isLoadingHero || isLoadingSections;

  const getAlignmentClasses = (alignment: 'left' | 'center' | 'right' | undefined) => {
    switch (alignment) {
      case 'center':
        return 'text-center items-center';
      case 'right':
        return 'text-right items-end';
      case 'left':
      default:
        return 'text-left items-start';
    }
  };
  
  return (
    <div className="flex flex-col min-h-dvh">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full bg-black">
           <div className="relative w-full h-[60vh] md:h-[84vh]">
                {isLoadingHero ? (
                    <Skeleton className="h-full w-full" />
                ) : (
                    <Image
                        src={heroImage}
                        alt="Hero Banner"
                        fill
                        className="object-cover"
                        style={{ objectPosition: 'center 25%' }}
                        priority
                    />
                )}
                 <div className="absolute inset-0 bg-black/40" />
                 <div className="relative z-10 h-full flex flex-col justify-end container mx-auto">
                    <div className={cn("flex flex-col w-full pb-12", getAlignmentClasses(heroSettings?.titleAlignment))}>
                        {heroTitle && (
                        <h1 className="text-4xl lg:text-6xl font-bold font-headline leading-tight drop-shadow-lg max-w-4xl text-white">
                            {t(heroTitle)}
                        </h1>
                        )}
                        {heroSubtitle && (
                        <p className="mt-4 max-w-2xl text-lg drop-shadow-md text-white">
                            {t(heroSubtitle)}
                        </p>
                        )}
                        {heroButtonText && heroButtonLink && (
                        <div className="mt-6">
                            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                            <Link href={heroButtonLink}>{t(heroButtonText)}</Link>
                            </Button>
                        </div>
                        )}
                    </div>
                </div>
            </div>
        </section>

        {/* Features Section */}
        <section className="py-8 bg-card border-b">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    <div className="flex items-center justify-center gap-3">
                        <LeafIcon className="h-8 w-8 text-primary"/>
                        <span className="text-sm font-medium">{t('grass_fed')}</span>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                        <TruckIcon className="h-8 w-8 text-primary"/>
                        <span className="text-sm font-medium">{t('delivery_wide')}</span>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                        <CleaverIcon className="h-8 w-8 text-primary"/>
                        <span className="text-sm font-medium">{t('cut_fresh')}</span>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                        <CowIcon className="h-8 w-8 text-primary"/>
                        <span className="text-sm font-medium">{t('family_owned')}</span>
                    </div>
                </div>
            </div>
        </section>

        <ShopByOrigin />
        <ShopByCut />

        {/* Featured Products */}
        <div className="bg-background">
            <DynamicProductSection type="featured" title="featured_products" />
        </div>

        {/* Deals Section */}
        <div className="bg-card">
            <DynamicProductSection type="deal" title="todays_deals" />
        </div>

        {/* Dynamically Generated Sections */}
        {isLoadingSections ? (
            <div className="container mx-auto px-4 py-8 space-y-12">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        ) : (
            homepageSections?.map((section, index) => (
                <div key={section.id} className={cn(index % 2 === 0 ? 'bg-background' : 'bg-card')}>
                    <DynamicProductSection type="category" section={section} title={section.title} />
                </div>
            ))
        )}

        {/* New "Choose Size of Box" Section */}
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
                    <div className="flex flex-col items-center text-center">
                    <div className="relative mb-4">
                        <span className="text-7xl font-bold text-gray-200 dark:text-gray-700 absolute -top-4 -left-2 z-0">1</span>
                        <Image src={getPlaceholderImage('block-to-box-1')} alt="Cut to order" width={200} height={150} className="rounded-lg object-contain relative z-10" data-ai-hint="raw meat" />
                    </div>
                    <h3 className="font-headline text-xl font-semibold text-primary">Cut to order</h3>
                    <p className="text-sm text-muted-foreground mt-2">Our native-breed meat is cut to your requirements by our skilled and expert butchers.</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                    <div className="relative mb-4">
                        <span className="text-7xl font-bold text-gray-200 dark:text-gray-700 absolute -top-4 -left-2 z-0">2</span>
                        <Image src={getPlaceholderImage('block-to-box-2')} alt="Package with care" width={200} height={150} className="rounded-lg object-contain relative z-10" data-ai-hint="meat packaging" />
                    </div>
                    <h3 className="font-headline text-xl font-semibold text-primary">Package with care</h3>
                    <p className="text-sm text-muted-foreground mt-2">The cuts are packaged into specially designed insulated boxes, with high-tech gel packs that keep the products cool for up to 48 hours on the road.</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                    <div className="relative mb-4">
                        <span className="text-7xl font-bold text-gray-200 dark:text-gray-700 absolute -top-4 -left-2 z-0">3</span>
                        <Image src={getPlaceholderImage('block-to-box-3')} alt="Delivered Fresh" width={200} height={150} className="rounded-lg object-contain relative z-10" data-ai-hint="sliced steak" />
                    </div>
                    <h3 className="font-headline text-xl font-semibold text-primary">Delivered Fresh</h3>
                    <p className="text-sm text-muted-foreground mt-2">Your order arrives with you perfectly chilled, always fresh. Unlike most other online butchers, we never freeze our meat.</p>
                    </div>
                </div>
                </div>
                 <div className="text-center mt-12">
                    <Button asChild variant="outline" size="lg">
                        <Link href="/get-started">Let Get Started</Link>
                    </Button>
                </div>
            </div>
        </section>

        {/* How It Works Section */}
        <section className="py-8 bg-card">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center md:text-4xl font-headline">{t('how_it_works')}</h2>
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Package className="h-8 w-8" />
                  </div>
                </div>
                <h3 className="mt-6 text-xl font-headline">{t('choose_your_cuts')}</h3>
                <p className="mt-2 text-muted-foreground">
                  {t('choose_your_cuts_desc')}
                </p>
              </div>
              <div className="text-center">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <TruckIcon className="h-8 w-8" />
                  </div>
                </div>
                <h3 className="mt-6 text-xl font-headline">{t('we_deliver_fresh')}</h3>
                <p className="mt-2 text-muted-foreground">
                  {t('we_deliver_fresh_desc')}
                </p>
              </div>
              <div className="text-center">
                 <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <ChefHat className="h-8 w-8" />
                  </div>
                </div>
                <h3 className="mt-6 text-xl font-headline">{t('enjoy_at_home')}</h3>
                <p className="mt-2 text-muted-foreground">
                  {t('enjoy_at_home_desc')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quality Guarantees */}
        <section className="py-8 bg-background">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="text-3xl font-bold md:text-4xl font-headline">{t('our_promise_of_quality')}</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                {t('our_promise_of_quality_desc')}
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="text-lg font-headline">Sustainably Sourced</h3>
                  <p className="mt-2 text-muted-foreground">Our animals are raised on open pastures by farmers who prioritize animal welfare and environmental stewardship.</p>
                </div>
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="text-lg font-headline">100% Grass-Fed Options</h3>
                  <p className="mt-2 text-muted-foreground">We offer a wide range of 100% grass-fed beef and lamb, known for its superior flavor and nutritional benefits.</p>
                </div>
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="text-lg font-headline">Expertly Butchered</h3>
                  <p className="mt-2 text-muted-foreground">Every cut is handled with precision and care by our team of experienced butchers to ensure the highest quality.</p>
                </div>
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="text-lg font-headline">Freshness Guaranteed</h3>
                  <p className="mt-2 text-muted-foreground">We guarantee your order will arrive fresh and ready to cook, thanks to our state-of-the-art packaging.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
