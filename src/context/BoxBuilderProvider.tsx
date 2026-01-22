
"use client";

import type { Product } from '@/lib/types';
import React, { createContext, useState, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';

interface BoxBuilderContextType {
  boxItems: Product[];
  addToBox: (product: Product, onSuccess?: () => void) => void;
  removeFromBox: (productId: string, index: number) => void;
  clearBox: () => void;
  totalPoints: number;
  currentPoints: number;
  boxTotalPrice: number;
  boxName: string;
}

export const BoxBuilderContext = createContext<BoxBuilderContextType | undefined>(undefined);

interface BoxBuilderProviderProps {
    children: React.ReactNode;
    totalPoints: number;
    boxName: string;
}

export const BoxBuilderProvider = ({ children, totalPoints, boxName }: BoxBuilderProviderProps) => {
  const [boxItems, setBoxItems] = useState<Product[]>([]);
  const { toast } = useToast();

  const currentPoints = useMemo(() => {
    return boxItems.reduce((acc, item) => acc + (item.points || 0), 0);
  }, [boxItems]);

  const boxTotalPrice = useMemo(() => {
    return boxItems.reduce((acc, item) => acc + item.price, 0);
  }, [boxItems]);

  const addToBox = useCallback((product: Product, onSuccess?: () => void) => {
    if (!product.points) {
        toast({
            variant: "destructive",
            title: "Cannot add item",
            description: "This product doesn't have a point value assigned.",
        });
        return;
    }

    const newTotalPoints = currentPoints + product.points;

    if(newTotalPoints > totalPoints) {
        toast({
            variant: "destructive",
            title: "Not enough points",
            description: "You don't have enough points to add this item.",
        });
        return;
    }

    setBoxItems(prevItems => [...prevItems, product]);

    toast({
      title: "Item added to box",
      description: `${product.name} has been added.`,
    });

    if (newTotalPoints === totalPoints) {
      onSuccess?.();
    }
  }, [currentPoints, totalPoints, toast]);

  const removeFromBox = useCallback((productId: string, index: number) => {
    let removedItemName = '';
    setBoxItems(prevItems => {
      const itemToRemove = prevItems[index];
      if (itemToRemove && itemToRemove.id === productId) {
        removedItemName = itemToRemove.name;
        const newItems = [...prevItems];
        newItems.splice(index, 1);
        return newItems;
      }
      return prevItems;
    });

    if (removedItemName) {
        toast({
            title: "Item removed",
            description: `"${removedItemName}" has been removed from your box.`,
        });
    }
  }, []);

  const clearBox = useCallback(() => {
    setBoxItems([]);
  }, []);


  return (
    <BoxBuilderContext.Provider
      value={{
        boxItems,
        addToBox,
        removeFromBox,
        clearBox,
        totalPoints,
        currentPoints,
        boxTotalPrice,
        boxName,
      }}
    >
      {children}
    </BoxBuilderContext.Provider>
  );
};
