import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Trash2 } from "lucide-react";

export default function Cart() {
  const { items, setQty, removeItem, total, count } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h1 className="font-heading text-2xl font-black text-zinc-50">Your cart is empty</h1>
        <Link to="/shop" data-testid="cart-empty-shop-link" className="mt-4 inline-block rounded-md bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white">Browse products</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-heading text-3xl font-black tracking-tighter text-zinc-50">Cart</h1>
      <p data-testid="cart-count" className="mt-1 font-mono text-sm text-zinc-500">{count} item(s)</p>

      <div className="mt-6 space-y-3" data-testid="cart-items">
        {items.map((it) => (
          <div key={it.id} data-testid={`cart-item-${it.id}`} className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <img src={it.image} alt={it.name} className="h-16 w-16 rounded-md object-cover bg-black" />
            <div className="flex-1 min-w-0">
              <p className="font-heading font-bold text-zinc-100 truncate">{it.name}</p>
              <p className="font-mono text-sm text-emerald-400">${it.price.toFixed(2)}</p>
            </div>
            <input data-testid={`cart-qty-${it.id}`} type="number" min={1} value={it.qty} onChange={(e) => setQty(it.id, Number(e.target.value))} className="w-16 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-zinc-100" />
            <span data-testid={`cart-line-total-${it.id}`} className="w-24 text-right font-mono text-zinc-200">${(it.price * it.qty).toFixed(2)}</span>
            <button data-testid={`cart-remove-${it.id}`} onClick={() => removeItem(it.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <span className="text-zinc-400">Total</span>
        <span data-testid="cart-total" className="font-mono text-2xl text-emerald-400">${total.toFixed(2)}</span>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Link to="/shop" className="rounded-md bg-zinc-800 border border-zinc-700 px-5 py-2.5 text-sm text-zinc-100">Continue shopping</Link>
        <button
          data-testid="checkout-button"
          onClick={() => navigate(user ? "/shop/checkout" : "/login")}
          className="rounded-md bg-blue-600 hover:bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white"
        >
          {user ? "Checkout" : "Login to checkout"}
        </button>
      </div>
    </div>
  );
}
