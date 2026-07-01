import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [params] = useSearchParams();
  const placedId = params.get("placed");

  useEffect(() => {
    api.get("/shop/orders").then(({ data }) => { setOrders(data.data); setLoading(false); });
  }, []);

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-heading text-3xl font-black tracking-tighter text-zinc-50">My Orders</h1>

      {placedId && (
        <div data-testid="order-placed-banner" className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-300">
          Order placed successfully! Confirmation: <span className="font-mono">{placedId.slice(0, 8)}</span>
        </div>
      )}

      {loading ? (
        <p className="mt-8 font-mono text-sm text-zinc-500">loading orders…</p>
      ) : orders.length === 0 ? (
        <div className="mt-8 text-zinc-400">
          No orders yet. <Link to="/shop" className="text-blue-400">Start shopping</Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4" data-testid="orders-list">
          {orders.map((o) => (
            <div key={o.id} data-testid={`order-${o.id}`} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-zinc-400">#{o.id.slice(0, 8)}</span>
                <span data-testid={`order-status-${o.id}`} className="rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-mono text-emerald-300">{o.status}</span>
              </div>
              <div className="mt-3 space-y-1">
                {o.items.map((i) => (
                  <div key={i.product_id} className="flex justify-between text-sm text-zinc-300">
                    <span>{i.name} × {i.qty}</span>
                    <span className="font-mono">${i.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between border-t border-zinc-800 pt-3">
                <span className="text-zinc-400 text-sm">Total</span>
                <span data-testid={`order-total-${o.id}`} className="font-mono text-emerald-400">${o.total.toFixed(2)}</span>
              </div>
              <p className="mt-2 font-mono text-xs text-zinc-600">ship to: {o.shipping.name}, {o.shipping.city} {o.shipping.zip}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
