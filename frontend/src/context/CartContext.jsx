import React, { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);
const KEY = "shop_cart";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.id === product.id);
      if (found) return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + qty } : i));
      return [...prev, { id: product.id, name: product.name, price: product.price, image: product.image, qty }];
    });
  };

  const setQty = (id, qty) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i)));

  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
  const clear = () => setItems([]);

  const count = items.reduce((n, i) => n + i.qty, 0);
  const total = Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;

  return (
    <CartContext.Provider value={{ items, addItem, setQty, removeItem, clear, count, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
