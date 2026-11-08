import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import { useAuth } from "./auth";
import type { Cart } from "./types";

const EMPTY: Cart = { items: [], total: 0, count: 0 };

interface CartValue {
  cart: Cart;
  loading: boolean;
  refresh: () => Promise<void>;
  add: (productId: number, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  remove: (itemId: number) => Promise<void>;
  setCart: (cart: Cart) => void;
}

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [cart, setCart] = useState<Cart>(EMPTY);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!localStorage.getItem("bg_token")) {
      setCart(EMPTY);
      return;
    }
    try {
      setCart(await api.cart());
    } catch {
      setCart(EMPTY);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [user?.id, token, refresh]);

  const add = useCallback(async (productId: number, quantity = 1) => {
    setCart(await api.addToCart(productId, quantity));
  }, []);

  const updateQuantity = useCallback(async (itemId: number, quantity: number) => {
    setCart(await api.updateCartItem(itemId, quantity));
  }, []);

  const remove = useCallback(async (itemId: number) => {
    setCart(await api.removeCartItem(itemId));
  }, []);

  return (
    <CartContext.Provider value={{ cart, loading, refresh, add, updateQuantity, remove, setCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart 必须在 CartProvider 内使用");
  return value;
}
