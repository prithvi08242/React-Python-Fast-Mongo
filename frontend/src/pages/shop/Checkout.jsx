import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useCart } from "@/context/CartContext";

export default function Checkout() {
  const { items, total, clear } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ shipping_name: "", shipping_address: "", shipping_city: "", shipping_zip: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const placeOrder = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/shop/orders", {
        ...form,
        items: items.map((i) => ({ product_id: i.id, qty: i.qty })),
      });
      clear();
      navigate(`/shop/orders?placed=${data.id}`);
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return <div data-testid="checkout-empty" className="max-w-3xl mx-auto px-6 py-24 text-center text-zinc-400">Your cart is empty.</div>;
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-10 grid gap-8 md:grid-cols-2">
      <div>
        <h1 className="font-heading text-3xl font-black tracking-tighter text-zinc-50">Checkout</h1>
        {error && <div data-testid="checkout-error" className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</div>}
        <form onSubmit={placeOrder} className="mt-6 space-y-4" data-testid="checkout-form">
          <input data-testid="ship-name" value={form.shipping_name} onChange={set("shipping_name")} required placeholder="Full name" className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100" />
          <input data-testid="ship-address" value={form.shipping_address} onChange={set("shipping_address")} required placeholder="Address" className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100" />
          <div className="grid grid-cols-2 gap-4">
            <input data-testid="ship-city" value={form.shipping_city} onChange={set("shipping_city")} required placeholder="City" className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100" />
            <input data-testid="ship-zip" value={form.shipping_zip} onChange={set("shipping_zip")} required placeholder="ZIP" className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100" />
          </div>
          <button data-testid="place-order-button" disabled={loading} className="w-full rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white">
            {loading ? "Placing order…" : `Place order · $${total.toFixed(2)}`}
          </button>
        </form>
      </div>
      <div>
        <h3 className="font-heading font-bold text-zinc-100">Order summary</h3>
        <div className="mt-4 space-y-2" data-testid="checkout-summary">
          {items.map((i) => (
            <div key={i.id} className="flex justify-between text-sm text-zinc-300">
              <span>{i.name} × {i.qty}</span>
              <span className="font-mono">${(i.price * i.qty).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-between border-t border-zinc-800 pt-4">
          <span className="text-zinc-400">Total</span>
          <span data-testid="checkout-total" className="font-mono text-lg text-emerald-400">${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
