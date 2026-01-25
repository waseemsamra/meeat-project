
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getPlaceholderImage } from '@/lib/utils';
import type { CartItem, AnyCartItem } from '@/lib/types';
import { useSettings } from '@/hooks/useSettings';
import { useTranslation } from '@/hooks/useTranslation';

export default function CartPage() {
  const { cartItems, updateQuantity, removeFromCart, clearCartAndNotify, cartTotal, cartCount } = useCart();
  const { defaultCurrency } = useSettings();
  const currencySymbol = defaultCurrency?.symbol || '$';
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold font-headline mb-8">Your Cart</h1>
      
      {cartItems.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-6 text-2xl font-headline">Your cart is empty</h2>
          <p className="mt-2 text-muted-foreground">Looks like you haven't added any prime cuts yet.</p>
          <Button asChild className="mt-6">
            <Link href="/products">Start Shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map(item => {
                if (item.isBox) {
                    return (
                        <Card key={item.id} className="overflow-hidden">
                            <CardContent className="p-4 flex gap-4">
                               <div className="grid grid-cols-3 gap-2 w-[150px] h-[100px] aspect-[3/2] flex-shrink-0 bg-muted rounded-md p-1">
                                  {item.items.slice(0, 6).map((subItem, index) => (
                                    <div key={index} className="relative w-full h-full bg-muted rounded-sm">
                                    <Image
                                      src={getPlaceholderImage(subItem.images[0])}
                                      alt={t(subItem.name)}
                                      fill
                                      className="object-contain"
                                    />
                                    </div>
                                  ))}
                                </div>
                                <div className="flex-grow flex flex-col sm:flex-row justify-between gap-4">
                                <div className="flex-grow">
                                  <h3 className="font-headline text-lg">{item.name}</h3>
                                  <p className="text-sm text-muted-foreground">{item.items.length} items</p>
                                  <p className="text-sm font-semibold">{currencySymbol}{item.price.toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                  <p className="font-medium">Qty: 1</p>
                                   <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}>
                                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                                   </Button>
                                </div>
                              </div>
                            </CardContent>
                        </Card>
                    )
                }

                const regularItem = item as CartItem;
                return (
                  <Card key={regularItem.id} className="overflow-hidden">
                    <CardContent className="p-4 flex gap-4">
                      <div className="relative w-[150px] h-[100px] aspect-[3/2] rounded-md bg-muted flex-shrink-0">
                      <Image
                        src={getPlaceholderImage(regularItem.product.images[0])}
                        alt={t(regularItem.product.name)}
                        fill
                        className="object-contain"
                        data-ai-hint={`${regularItem.product.category.toLowerCase()} ${regularItem.product.cutType.toLowerCase()}`}
                      />
                      </div>
                      <div className="flex-grow flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex-grow">
                          <h3 className="font-headline text-lg">{t(regularItem.product.name)}</h3>
                          <p className="text-sm text-muted-foreground">{regularItem.selectedUnit}</p>
                          <p className="text-sm text-muted-foreground">{regularItem.selectedStyle} / {regularItem.selectedRub}</p>
                          <p className="text-sm font-semibold">{currencySymbol}{regularItem.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="flex items-center gap-2">
                              <Button variant="outline" size="icon" onClick={() => updateQuantity(regularItem.id, regularItem.quantity - 1)}>
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                type="number"
                                value={regularItem.quantity}
                                onChange={(e) => updateQuantity(regularItem.id, parseInt(e.target.value) || 1)}
                                className="w-16 h-10 text-center"
                                min="1"
                              />
                              <Button variant="outline" size="icon" onClick={() => updateQuantity(regularItem.id, regularItem.quantity + 1)}>
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                           <Button variant="ghost" size="icon" onClick={() => removeFromCart(regularItem.id)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                           </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
            })}
            <Button variant="outline" onClick={clearCartAndNotify}>Clear Cart</Button>
          </div>
          
          <aside className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-2xl font-headline">Order Summary</h2>
                <div className="flex justify-between">
                  <span>Subtotal ({cartCount} items)</span>
                  <span>{currencySymbol}{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-muted-foreground">Calculated at next step</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Estimated Total</span>
                  <span>{currencySymbol}{cartTotal.toFixed(2)}</span>
                </div>
                <Button asChild size="lg" className="w-full">
                  <Link href="/checkout">Proceed to Checkout</Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}
