"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export interface CartItem {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  prefix: string;
  price: number;
  size?: string;
  color?: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  isHydrated: boolean;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string, size?: string, color?: string) => void;
  updateQuantity: (
    id: string,
    quantity: number,
    size?: string,
    color?: string,
  ) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("primaveral-cart");
      if (saved) setItems(JSON.parse(saved) as CartItem[]);
    } catch {
      localStorage.removeItem("primaveral-cart");
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("primaveral-cart", JSON.stringify(items));
    window.dispatchEvent(new Event("cartUpdated"));
  }, [items]);

  const sameItem = (
    item: CartItem,
    id: string,
    size?: string,
    color?: string,
  ) => item.id === id && item.size === size && item.color === color;

  const addItem = (item: Omit<CartItem, "quantity">) => {
    setItems((current) => {
      const existing = current.find((candidate) =>
        sameItem(candidate, item.id, item.size, item.color),
      );
      if (existing) {
        return current.map((candidate) =>
          sameItem(candidate, item.id, item.size, item.color)
            ? { ...candidate, quantity: Math.min(candidate.quantity + 1, 20) }
            : candidate,
        );
      }
      return [...current, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (id: string, size?: string, color?: string) =>
    setItems((current) =>
      current.filter((item) => !sameItem(item, id, size, color)),
    );

  const updateQuantity = (
    id: string,
    quantity: number,
    size?: string,
    color?: string,
  ) =>
    setItems((current) =>
      current
        .map((item) =>
          sameItem(item, id, size, color)
            ? { ...item, quantity: Math.min(Math.max(quantity, 0), 20) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );

  const value = {
    items,
    isHydrated,
    addItem,
    removeItem,
    updateQuantity,
    clearCart: () => setItems([]),
    getTotalPrice: () =>
      items.reduce((total, item) => total + item.price * item.quantity, 0),
    getItemCount: () => items.reduce((total, item) => total + item.quantity, 0),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
