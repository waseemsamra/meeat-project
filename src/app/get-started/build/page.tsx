
'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Product, Attribute, Country, Grade, CutType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getPlaceholderImage } from '@/lib/utils';
import { BoxBuilderStepper } from './BoxBuilderStepper';
import { BoxSummary } from './BoxSummary';
import { Input } from '@/components/ui/input';
import { Search, Snowflake, Plus, CheckCircle, X, Sparkles, Loader2 } from 'lucide-react';
import { useBoxBuilder } from '@/hooks/useBoxBuilder';
import { BoxBuilderProvider } from '@/context/BoxBuilderProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getAiCuratedBox } from './actions';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCart } from '@/hooks/useCart';
import { useTranslation } from '@/hooks/useTranslation';

const ProductCard = ({ product }: { product: Product }) => {
    const { addToBox, totalPoints, currentPoints } = useBoxBuilder();
    const { t } = useTranslation();
    const imageUrl = getPlaceholderImage(product.images?.[0]);
    const pointsAvailable = totalPoints - currentPoints;
    const canAdd = product.points ? product.points <= pointsAvailable : false;
    
    if (!imageUrl) {
        return null;
    }

    return (
        <Card className="overflow-hidden transition-shadow hover:shadow-lg group flex flex-col">
            <div className="p-4 flex-grow flex flex-col">
                <div className="relative mb-4">
                    <Image
                        src={imageUrl}
                        alt={t(product.name)}
                        width={600}
                        height={400}
                        className="aspect-[4/3] w-full object-cover rounded-md"
                        data-ai-hint={`${product.category.toLowerCase()} ${product.cutType.toLowerCase()}`}
                    />
                    {product.temperature === 'Frozen' && (
                         <div className="absolute top-2 right-2 bg-blue-100/80 text-blue-800 backdrop-blur-sm rounded-full p-2 shadow-md">
                            <Snowflake className="h-5 w-5" />
                        </div>
                    )}
                </div>
                <h3 className="text-md font-semibold mb-1 group-hover:text-primary">{t(product.name)}</h3>
                 <div className="flex justify-between items-center mt-auto pt-2">
                    <p className="text-sm text-muted-foreground">{t(product.cutType)}</p>
                    <p className="font-bold text-lg text-destructive">
                        ${product.price.toFixed(2)}
                    </p>
                </div>
                
                <div className="mt-4 flex gap-2">
                    <div className="border rounded-md px-3 py-2 text-sm font-semibold flex items-center justify-center">
                       {product.points || 0}pts
                    </div>
                    <Button className="w-full" variant="outline" onClick={() => addToBox(product)} disabled={!canAdd}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Box
                    </Button>
                </div>
            </div>
        </Card>
    );
};


const ProductCardSkeleton = () => (
    <Card className="flex flex-col">
        <div className="p-4 flex-grow">
            <Skeleton className="aspect-[4/3] w-full mb-4" />
            <Skeleton className="h-5 w-3/4 mb-1" />
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-3 w-1/6 mt-1" />
        </div>
        <div className="p-4 border-t">
            <Skeleton className="h-10 w-full" />
        </div>
    </Card>
);

function BuildBoxPageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="h-6 w-full max-w-lg mx-auto bg-muted rounded-md mb-8" />
            <div className="h-10 w-48 mx-auto bg-muted rounded-md mb-12" />
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                <div className="lg:col-span-3 space-y-8">
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-md" />
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                        {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <Skeleton className="h-[calc(100vh-7rem)] w-full rounded-lg"/>
                </div>
            </div>
        </div>
    )
}

function BuildBoxPageContent() {
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const { addToBox, clearBox, boxItems, boxTotalPrice, totalPoints, boxName } = useBoxBuilder();
  const { addBoxToCart } = useCart();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [isCurating, setIsCurating] = useState(false);
  const [curatorPrompt, setCuratorPrompt] = useState('');
  const [curationReasoning, setCurationReasoning] = useState('');

  // Data fetching
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(useMemo(() => firestore ? collection(firestore, 'products') : null, [firestore]));
  const { data: categories, isLoading: isLoadingCategories } = useCollection<Attribute>(useMemo(() => firestore ? collection(firestore, 'categories') : null, [firestore]));
  
  const isLoading = isLoadingProducts || isLoadingCategories;

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  
  // Update searchQuery state if the URL parameter changes
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
    setSelectedCategory(searchParams.get('category') || 'All');
  }, [searchParams]);

  // Memoized filtering logic
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(product => {
      const categoryMatch = selectedCategory === 'All' || product.category === selectedCategory;
      const searchMatch = searchQuery === '' || 
                          product.name.en?.toLowerCase().includes(searchQuery.toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [products, selectedCategory, searchQuery]);
  
  // Effect to update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedCategory !== 'All') {
      params.set('category', selectedCategory);
    } else {
      params.delete('category');
    }
    if (searchQuery) {
      params.set('search', searchQuery);
    } else {
      params.delete('search');
    }

    router.replace(`${pathname}?${params.toString()}`);
  }, [selectedCategory, searchQuery, pathname, router, searchParams]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }

  const handleCuration = async () => {
    if (!curatorPrompt) {
        toast({ variant: 'destructive', title: 'Prompt is empty', description: 'Please tell us what you\'re looking for.' });
        return;
    }
    setIsCurating(true);
    clearBox();

    const result = await getAiCuratedBox({ prompt: curatorPrompt });
    
    if (result.success && result.products) {
        result.products.forEach(p => addToBox(p));
        setCurationReasoning(result.reasoning || "Here's a selection we think you'll love.");
        setIsSuccessModalOpen(true);
    } else {
        toast({ variant: 'destructive', title: 'Curation Failed', description: result.error });
    }

    setIsCurating(false);
  }

  return (
    <div className="container mx-auto px-4 py-12">
        <BoxBuilderStepper currentStep={3} />
        <h1 className="text-4xl font-bold font-headline mt-8 mb-12">Build Your Box</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            <div className="lg:col-span-3">
                 <Card className="mb-8 bg-muted/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="text-primary" />
                            <span>AI Box Curator</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert>
                            <AlertTitle>Need some inspiration?</AlertTitle>
                            <AlertDescription>
                                Describe what you're looking for, and our expert AI butcher will fill your box for you. Try "weeknight dinners for two" or "a barbecue with friends".
                            </AlertDescription>
                        </Alert>
                        <Textarea 
                            placeholder="e.g., I'm planning a weekend barbecue for 6 people..."
                            value={curatorPrompt}
                            onChange={(e) => setCuratorPrompt(e.target.value)}
                            disabled={isCurating}
                        />
                        <Button onClick={handleCuration} disabled={isCurating}>
                            {isCurating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            {isCurating ? 'Curating...' : 'Curate For Me'}
                        </Button>
                    </CardContent>
                </Card>


                <div className="mb-8 flex items-center gap-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            placeholder="Search product..." 
                            className="pl-10 w-full"
                            value={searchQuery}
                            onChange={handleSearchChange}
                        />
                    </div>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isLoadingCategories}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Types</SelectItem>
                            {categories?.map(cat => <SelectItem key={cat.id} value={cat.name.en || ''}>{t(cat.name)}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Points" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Points</SelectItem>
                            <SelectItem value="low">Low to High</SelectItem>
                            <SelectItem value="high">High to Low</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {isLoading ? (
                    Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} />)
                    ) : filteredProducts.length > 0 ? (
                    filteredProducts.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))
                    ) : (
                    <div className="col-span-full text-center py-16">
                        <h2 className="text-2xl font-headline">No Products Found</h2>
                        <p className="mt-2 text-muted-foreground">Try adjusting your filters to find what you're looking for.</p>
                    </div>
                    )}
                </div>
            </div>
            <div className="lg:col-span-1">
                <BoxSummary />
            </div>
        </div>
         <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-center text-2xl font-headline">Your Box is Curated!</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center text-center py-4">
                    <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                    {curationReasoning ? (
                         <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md w-full">
                            <p className="font-semibold text-foreground mb-2">Here's why we chose these items:</p>
                            <p>{curationReasoning}</p>
                        </div>
                    ) : (
                        <p className="text-muted-foreground">You've successfully filled your box with premium cuts.</p>
                    )}
                </div>
                 <div className="flex flex-col gap-2 mt-4">
                    <Button onClick={() => setIsSuccessModalOpen(false)} size="lg">View &amp; Edit Box</Button>
                    <Button onClick={() => { clearBox(); setIsSuccessModalOpen(false); }} variant="outline">Start Over</Button>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}

function BuildBoxPageWrapper() {
  const searchParams = useSearchParams();
  const points = parseInt(searchParams.get('points') || '0', 10);
  const boxName = searchParams.get('box') || 'Custom Box';

  return (
    <BoxBuilderProvider totalPoints={points} boxName={boxName}>
      <BuildBoxPageContent />
    </BoxBuilderProvider>
  );
}

export default function BuildBoxPage() {
    return (
        <Suspense fallback={<BuildBoxPageSkeleton />}>
            <BuildBoxPageWrapper />
        </Suspense>
    )
}
