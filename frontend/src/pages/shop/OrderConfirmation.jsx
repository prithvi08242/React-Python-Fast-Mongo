import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { CheckCircle2, Package, Truck, MapPin } from "lucide-react";

export default function OrderConfirmation() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/shop/orders/${id}`).then(({ data }) => setOrder(data)).catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return (
      <div data-testid="order-not-found" className="max-w-2xl mx-auto px-6 py-24 text-center text-zinc-400">
        Order not found. <Link to="/shop/orders" className="text-blue-400">View my orders</Link>
      </div>
    );
  }
  if (!order) return <div className="px-6 py-24 text-center font-mono text-sm text-zinc-500">loading order…</div>;

  const s = order.shipping || {};

  return (
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in-up" data-testid="order-confirmation-page">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/40">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="mt-5 font-heading text-3xl font-black tracking-tighter text-zinc-50">Order placed!</h1>
        <p className="mt-2 text-zinc-400">Thank you — your order has been confirmed.</p>
        <p data-testid="confirmation-order-id" className="mt-3 inline-block rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-sm text-blue-400">
          Order #{order.id}
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-2 text-zinc-300"><Truck className="w-4 h-4 text-blue-400" /> <span className="font-heading font-bold">Shipping</span></div>
          <p data-testid="confirmation-method" className="mt-3 text-sm text-zinc-300 capitalize">{s.method} shipping</p>
          <p data-testid="confirmation-eta" className="text-sm text-zinc-500">ETA: {s.eta}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-2 text-zinc-300"><MapPin className="w-4 h-4 text-blue-400" /> <span className="font-heading font-bold">Deliver to</span></div>
          <p data-testid="confirmation-address" className="mt-3 text-sm text-zinc-400 leading-relaxed">
            {s.name}<br />
            {s.address}<br />
            {s.city}{s.state ? `, ${s.state}` : ""} {s.zip}<br />
            {s.country}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center gap-2 text-zinc-300"><Package className="w-4 h-4 text-blue-400" /> <span className="font-heading font-bold">Items</span></div>
        <div className="mt-3 space-y-2" data-testid="confirmation-items">
          {order.items.map((i) => (
            <div key={i.product_id} data-testid={`confirmation-item-${i.product_id}`} className="flex justify-between text-sm text-zinc-300">
              <span>{i.name} × {i.qty}</span>
              <span className="font-mono">${i.subtotal.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1.5 border-t border-zinc-800 pt-3 text-sm">
          <div className="flex justify-between text-zinc-400"><span>Subtotal</span><span className="font-mono">${(order.subtotal ?? order.total).toFixed(2)}</span></div>
          <div className="flex justify-between text-zinc-400"><span>Shipping</span><span className="font-mono">{order.shipping_cost ? `$${order.shipping_cost.toFixed(2)}` : "FREE"}</span></div>
          <div className="flex justify-between border-t border-zinc-800 pt-2 mt-2">
            <span className="text-zinc-200">Total paid</span>
            <span data-testid="confirmation-total" className="font-mono text-lg text-emerald-400">${order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <Link to="/shop/orders" data-testid="view-all-orders" className="rounded-md bg-zinc-800 border border-zinc-700 px-5 py-2.5 text-sm text-zinc-100 hover:bg-zinc-700">View all orders</Link>
        <Link to="/shop" data-testid="continue-shopping" className="rounded-md bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white">Continue shopping</Link>
      </div>
    </div>
  );
}
