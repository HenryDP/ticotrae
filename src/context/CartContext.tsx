import React, { createContext, useContext, useState, useEffect } from 'react';
import { Producto } from '../types';

export interface CartItem {
  producto: Producto;
  cantidad: number;
  talla: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (producto: Producto, cantidad?: number, talla?: string) => void;
  removeFromCart: (productoId: string) => void;
  clearCart: () => void;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('ticotrae_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('ticotrae_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (producto: Producto, cantidad: number = 1, talla: string = 'Estándar') => {
    setCart(prev => {
      const existing = prev.find(item => item.producto.id === producto.id && item.talla === talla);
      if (existing) {
        return prev.map(item => 
          item.producto.id === producto.id && item.talla === talla
            ? { ...item, cantidad: item.cantidad + cantidad }
            : item
        );
      }
      return [...prev, { producto, cantidad, talla }];
    });
  };

  const removeFromCart = (productoId: string) => {
    setCart(prev => prev.filter(item => item.producto.id !== productoId));
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, totalItems }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
