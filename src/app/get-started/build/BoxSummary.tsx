
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getPlaceholderImage } from '@/lib/utils';
import { Box, X, ShoppingBag } from 'lucide-react';
import { useBoxBuilder } from '@/hooks/useBoxBuilder';
import { useCart } from '@/hooks/useCart';
import { useRouter } from 'next/navigation';

export function BoxSummary() {
  const [subscription, setSubscription] = useState('every-3-weeks');
  const { boxItems, removeFromBox, totalPoints, currentPoints, boxTotalPrice, clearBox, boxName } = useBoxBuilder();
  const { addBoxToCart } = useCart();
  const router = useRouter();

  const isBoxFull = currentPoints >= totalPoints;

  const handleAddBoxToCart = () => {
    if (!isBoxFull) return;
    addBoxToCart(boxName, boxItems, boxTotalPrice);
    clearBox();
    router.push('/cart');
  };

  return (
    <Card className="sticky top-24 flex flex-col h-[calc(100vh-7rem)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-4">
          <Box className="h-8 w-8 text-primary" />
          <span className="text-2xl font-headline">Your Box</span>
          <div className="flex flex-col items-end gap-1 ml-auto text-right">
             <div className="flex items-center gap-2">
                <div className="relative h-6 w-6">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                        <path
                            className="text-muted"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.8"
                        />
                        <path
                            className="text-primary"
                            strokeDasharray={`${(currentPoints / totalPoints) * 100}, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.8"
                            strokeLinecap="round"
                        />
                    </svg>
                </div>
                <span className="text-lg font-bold">{currentPoints}/{totalPoints} pts</span>
             </div>
             <span className="text-lg font-bold text-destructive">${boxTotalPrice.toFixed(2)}</span>
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground ml-12 -mt-2">Box size: {boxName}</p>
      </CardHeader>
      
      <ScrollArea className="flex-grow">
        <CardContent className="space-y-4 px-4">
            {boxItems.length > 0 ? (
                boxItems.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="flex items-center gap-4 py-2 border-b last:border-b-0">
                        <div className="relative bg-muted rounded-md w-16 h-16 flex-shrink-0">
                            <Image src={getPlaceholderImage(item.images[0])} alt={item.name} fill className="object-contain" />
                            <div className="absolute -top-2 -left-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                                {item.points}pts
                            </div>
                        </div>
                        <div className="flex-grow">
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-sm text-muted-foreground">x 1</p>
                        </div>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8" onClick={() => removeFromBox(item.id, index)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ))
            ) : (
                <div className="text-center py-10 text-muted-foreground">
                    <p>Your box is empty.</p>
                    <p className="text-sm">Start by adding items from the left.</p>
                </div>
            )}
        </CardContent>
      </ScrollArea>
      
      <div className="p-6 mt-auto border-t space-y-4">
        <div>
            <p className="text-center text-green-600 font-semibold text-sm mb-4">
                {isBoxFull && totalPoints > 0
                    ? 'Your box is full!'
                    : totalPoints - currentPoints > 0
                    ? `Fill your box to continue - ${totalPoints - currentPoints} points remaining`
                    : ''}
            </p>
            <RadioGroup value={subscription} onValueChange={setSubscription} className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="every-3-weeks" id="3-weeks" />
                    <Label htmlFor="3-weeks" className="font-normal">Every 3 Weeks</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="every-4-weeks" id="4-weeks" />
                    <Label htmlFor="4-weeks" className="font-normal">Every 4 Weeks</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="every-5-weeks" id="5-weeks" />
                    <Label htmlFor="5-weeks" className="font-normal">Every 5 Weeks</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="every-6-weeks" id="6-weeks" />
                    <Label htmlFor="6-weeks" className="font-normal">Every 6 Weeks</Label>
                </div>
            </RadioGroup>
        </div>
        <Button size="lg" className="w-full" disabled={!isBoxFull || totalPoints === 0} onClick={handleAddBoxToCart}>
            <ShoppingBag className="mr-2 h-5 w-5" />
            Add Box to Cart
        </Button>
      </div>
    </Card>
  );
}
