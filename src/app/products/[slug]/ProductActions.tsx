

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCart } from '@/hooks/useCart';
import type { Product, InventoryLot, Country } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ProductOptionGroup } from './ProductOptionGroup';
import { QuantitySelector } from './QuantitySelector';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/hooks/useSettings';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';

interface ProductActionsProps {
  product: Product;
  inventoryLots: InventoryLot[];
  countries: Country[] | null;
}

export function ProductActions({ product, inventoryLots, countries }: ProductActionsProps) {
  const { addToCart } = useCart();
  const { defaultCurrency } = useSettings();
  const { t } = useTranslation();
  
  const [selectedStyle, setSelectedStyle] = useState<string | undefined>(product.styles?.[0]);
  const [selectedRub, setSelectedRub] = useState<string | undefined>(product.rubs?.[0]);
  const [quantity, setQuantity] = useState(1.0); // Start at 1.0 for 1kg
  const [currentPrice, setCurrentPrice] = useState(product.price);

  useEffect(() => {
    if (product.perKgPrice) {
      const calculatedPrice = quantity * product.perKgPrice;
      const discount = product.discount || 0;
      const finalPrice = calculatedPrice * (1 - discount / 100);
      setCurrentPrice(finalPrice);
    } else {
      setCurrentPrice(product.price * quantity);
    }
  }, [quantity, product.perKgPrice, product.price, product.discount]);


  const country = countries?.find(c => c.name.en === product.countryOfOrigin);

  const handleAddToCart = () => {
    const selectedUnit = `${quantity.toFixed(2)}kg`;
    addToCart(product, selectedUnit, 1, selectedStyle || '', selectedRub || '', currentPrice);
  };
  
  const isLoading = !inventoryLots;

  const totalWeight = useMemo(() => {
    if (quantity >= 1) {
        return `${quantity.toFixed(2)}kg`;
    }
    return `${Math.round(quantity * 1000)}g`;
  }, [quantity]);

  return (
    <div className="space-y-6">
        <div>
            <div className="flex items-end gap-2">
                <span className="text-sm font-bold text-accent">{defaultCurrency?.code}</span>
                <p className="text-4xl font-bold text-accent">{currentPrice.toFixed(2)}</p>
                {product.perKgPrice && (
                    <span className="text-lg text-muted-foreground self-end mb-1">
                        {defaultCurrency?.code} {product.perKgPrice.toFixed(2)}/Kg
                    </span>
                )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Including VAT</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="p-4 flex flex-col items-center justify-center text-center">
                <p className="text-sm text-muted-foreground">Sold & Shipped</p>
                <p className="font-bold">Me'eat</p>
            </Card>
             {country && (
                <Card className="p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-sm text-muted-foreground">Origin</p>
                    <div className="flex items-center gap-2 font-bold">
                         <Image
                            src={`https://flagcdn.com/w40/${country.code}.png`}
                            alt={`${t(country.name)} flag`}
                            width={20}
                            height={15}
                            className="rounded-sm"
                        />
                        <span>{t(country.name)}</span>
                    </div>
                </Card>
            )}
             {product.cutWeight && (
                <Card className="p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-sm text-muted-foreground">Approx. Weight</p>
                    <p className="font-bold">{t(product.cutWeight)}</p>
                </Card>
            )}
        </div>


        <div className="border p-4 rounded-md">
            <div className="prose prose-sm dark:prose-invert max-w-none">
                <p>{t(product.description)}</p>
            </div>
        </div>

        <div className="flex items-end gap-4">
            <div className="flex-shrink-0">
                <Label className="font-semibold mb-2 block">Weight</Label>
                <QuantitySelector quantity={quantity} setQuantity={setQuantity} />
            </div>
            {totalWeight && <div className="font-semibold text-lg whitespace-nowrap pb-2"> = {totalWeight}</div>}
        </div>
      
      {product.category === 'Beef' && product.styles && product.styles.length > 0 && (
        <ProductOptionGroup title="Style" options={product.styles} selected={selectedStyle!} onSelect={setSelectedStyle} />
      )}
      
      {product.category === 'Beef' && product.rubs && product.rubs.length > 0 && (
        <ProductOptionGroup title="Rub" options={product.rubs} selected={selectedRub!} onSelect={setSelectedRub} />
      )}

      <div>
        <Label className="font-semibold mb-2 block">Special Request</Label>
        <Textarea placeholder="Add any special instructions for your order..."/>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Button size="lg" className="w-full flex-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleAddToCart} disabled={isLoading}>
            { isLoading ? "Loading stock..." : "Add to cart" }
        </Button>
      </div>
    </div>
  );
}
