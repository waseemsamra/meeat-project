
"use client";

import type { AnyCartItem, CartItem, Product, BoxCartItem } from '@/lib/types';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CartContextType {
  cartItems: AnyCartItem[];
  addToCart: (product: Product, selectedUnit: string, quantity: number, selectedStyle: string, selectedRub: string, price: number) => void;
  addBoxToCart: (boxName: string, items: Product[], price: number) => void;
  removeFromCart: (itemId: string, selectedUnit?: string) => void;
  updateQuantity: (itemId: string, quantity: number, selectedUnit?: string) => void;
  clearCart: () => void;
  clearCartAndNotify: () => void;
  cartCount: number;
  cartTotal: number;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cartItems, setCartItems] = useState<AnyCartItem[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const localData = window.localStorage.getItem('primecuts_cart');
      if (localData) {
        setCartItems(JSON.parse(localData));
      }
    } catch (error) {
      console.error("Failed to parse cart from localStorage", error);
    }
  }, []);

  const saveCart = useCallback((cart: AnyCartItem[]) => {
    try {
      window.localStorage.setItem('primecuts_cart', JSON.stringify(cart));
    } catch (error) {
      console.error("Failed to save cart to localStorage", error);
    }
  }, []);

  const addToCart = useCallback((product: Product, selectedUnit: string, quantity: number, selectedStyle: string, selectedRub: string, price: number) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => !item.isBox && item.product.id === product.id && item.selectedUnit === selectedUnit && item.selectedStyle === selectedStyle && item.selectedRub === selectedRub);
      
      let newItems;
      if (existingItem) {
        newItems = prevItems.map(item =>
          !item.isBox && item.product.id === product.id && item.selectedUnit === selectedUnit && item.selectedStyle === selectedStyle && item.selectedRub === selectedRub
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        newItems = [...prevItems, { id: `${product.id}-${selectedUnit}-${selectedStyle}-${selectedRub}`, product, selectedUnit, quantity, price, selectedStyle, selectedRub, isBox: false }];
      }
      saveCart(newItems);
      return newItems;
    });

    toast({
      title: "Added to cart",
      description: `${product.name} (${selectedUnit}) has been added to your cart.`,
    });
  }, [saveCart, toast]);

  const addBoxToCart = useCallback((boxName: string, items: Product[], price: number) => {
    setCartItems(prevItems => {
        const newBoxItem: BoxCartItem = {
            id: `box-${Date.now()}`,
            isBox: true,
            name: boxName,
            items: items,
            price: price, // Use the dynamically calculated price
            quantity: 1,
        };
        const newItems = [...prevItems, newBoxItem];
        saveCart(newItems);
        return newItems;
    });
     toast({
      title: "Box added to cart",
      description: `Your custom "${boxName}" has been added to your cart.`,
    });
  }, [saveCart, toast]);


  const removeFromCart = useCallback((itemId: string) => {
    let removedItemName = '';
    let newItems: AnyCartItem[] = [];
    setCartItems(prevItems => {
      const itemToRemove = prevItems.find(item => item.id === itemId);
      if(itemToRemove) {
          removedItemName = itemToRemove.isBox ? itemToRemove.name : (itemToRemove as CartItem).product.name;
      }
      newItems = prevItems.filter(item => item.id !== itemId);
      saveCart(newItems);
      return newItems;
    });

    if (removedItemName) {
        toast({
            title: "Item removed",
            description: `"${removedItemName}" has been removed from your cart.`,
        });
    }
  }, [saveCart, toast]);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    setCartItems(prevItems => {
      if (quantity <= 0) {
        const newItems = prevItems.filter(item => item.id !== itemId);
        saveCart(newItems);
        return newItems;
      }
      const newItems = prevItems.map(item =>
        item.id === itemId
          ? { ...item, quantity }
          : item
      );
      saveCart(newItems);
      return newItems;
    });
  }, [saveCart]);

  const clearCart = useCallback(() => {
    setCartItems([]);
    saveCart([]);
  }, [saveCart]);

  const clearCartAndNotify = useCallback(() => {
    clearCart();
    toast({
      title: "Cart cleared",
      description: "Your shopping cart is now empty.",
    });
  }, [clearCart, toast]);

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  const cartTotal = cartItems.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        addBoxToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        clearCartAndNotify,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
    