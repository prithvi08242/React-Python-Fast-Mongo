import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { COUNTRIES, ZIP_LOOKUP, SHIPPING_METHODS, statesForCountry } from "@/data/locations";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function Checkout() {
  const { items, total, clear } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    shipping_name: "",
    shipping_address: "",
    shipping_country: "",
    shipping_state: "",
    shipping_city: "",
    shipping_zip: "",
    shipping_method: "standard",
  });
  const [zipStatus, setZipStatus] = useState(""); // "", looking, found, notfound
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const zipTimer = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onCountryChange = (name) => {
    // cascading reset: changing country clears the dependent state
    setForm((f) => ({ ...f, shipping_country: name, shipping_state: "" }));
  };

  const onZipChange = (value) => {
    set("shipping_zip", value);
    if (zipTimer.current) clearTimeout(zipTimer.current);
    const key = value.trim().toUpperCase();
    if (key.length < 3) {
      setZipStatus("");
      return;
    }
    // simulate an async ZIP lookup service (practice waits)
    setZipStatus("looking");
    zipTimer.current = setTimeout(() => {
      const match = ZIP_LOOKUP[key];
      if (match) {
        setForm((f) => ({
          ...f,
          shipping_zip: value,
          shipping_country: match.country,
          shipping_state: match.state,
          shipping_city: match.city,
        }));
        setZipStatus("found");
      } else {
        setZipStatus("notfound");
      }
    }, 900);
  };

  const availableStates = statesForCountry(form.shipping_country);
  const method = SHIPPING_METHODS.find((m) => m.id === form.shipping_method) || SHIPPING_METHODS[0];
  const grandTotal = Math.round((total + method.cost) * 100) / 100;

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
      navigate(`/shop/order/${data.id}`);
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return <div data-testid="checkout-empty" className="max-w-3xl mx-auto px-6 py-24 text-center text-zinc-400">Your cart is empty.</div>;
  }

  const inputCls = "w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none";

  return (
    <div className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-10 grid gap-8 md:grid-cols-[1.4fr_1fr]">
      <div>
        <h1 className="font-heading text-3xl font-black tracking-tighter text-zinc-50">Checkout</h1>
        {error && <div data-testid="checkout-error" className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</div>}

        <form onSubmit={placeOrder} className="mt-6 space-y-5" data-testid="checkout-form">
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-zinc-400">Full name</label>
            <input data-testid="ship-name" value={form.shipping_name} onChange={(e) => set("shipping_name", e.target.value)} required className={`mt-1.5 ${inputCls}`} />
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-zinc-400">Address</label>
            <input data-testid="ship-address" value={form.shipping_address} onChange={(e) => set("shipping_address", e.target.value)} required className={`mt-1.5 ${inputCls}`} />
          </div>

          {/* ZIP with async auto-populate */}
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              ZIP / Postal code <span className="text-zinc-600 normal-case">(try 400001, 90001, 10115, M5H)</span>
            </label>
            <div className="relative mt-1.5">
              <input data-testid="ship-zip" value={form.shipping_zip} onChange={(e) => onZipChange(e.target.value)} required className={inputCls} placeholder="Enter ZIP to auto-fill" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {zipStatus === "looking" && <Loader2 data-testid="zip-loading" className="w-4 h-4 text-blue-400 animate-spin" />}
                {zipStatus === "found" && <CheckCircle2 data-testid="zip-found" className="w-4 h-4 text-emerald-400" />}
                {zipStatus === "notfound" && <XCircle data-testid="zip-notfound" className="w-4 h-4 text-amber-400" />}
              </span>
            </div>
            <p data-testid="zip-status-text" className="mt-1 h-4 font-mono text-xs">
              {zipStatus === "looking" && <span className="text-blue-400">looking up postal code…</span>}
              {zipStatus === "found" && <span className="text-emerald-400">location auto-filled ✓</span>}
              {zipStatus === "notfound" && <span className="text-amber-400">unknown code — enter manually</span>}
            </p>
          </div>

          {/* Cascading country -> state */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-zinc-400">Country</label>
              <select data-testid="ship-country" value={form.shipping_country} onChange={(e) => onCountryChange(e.target.value)} required className={`mt-1.5 ${inputCls}`}>
                <option value="">Select country</option>
                {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-zinc-400">State / Province</label>
              <select
                data-testid="ship-state"
                value={form.shipping_state}
                onChange={(e) => set("shipping_state", e.target.value)}
                required
                disabled={!form.shipping_country}
                className={`mt-1.5 ${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <option value="">{form.shipping_country ? "Select state" : "Select country first"}</option>
                {availableStates.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-zinc-400">City</label>
            <input data-testid="ship-city" value={form.shipping_city} onChange={(e) => set("shipping_city", e.target.value)} required className={`mt-1.5 ${inputCls}`} />
          </div>

          {/* Shipping method radio -> dynamic ETA/cost */}
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-zinc-400">Shipping method</label>
            <div className="mt-2 space-y-2" data-testid="shipping-methods">
              {SHIPPING_METHODS.map((m) => (
                <label key={m.id} data-testid={`shipping-method-${m.id}`} className={`flex items-center justify-between rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${form.shipping_method === m.id ? "border-blue-500 bg-blue-500/10" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"}`}>
                  <span className="flex items-center gap-2.5">
                    <input type="radio" name="ship-method" checked={form.shipping_method === m.id} onChange={() => set("shipping_method", m.id)} />
                    <span className="text-zinc-100">{m.label}</span>
                    <span className="text-xs text-zinc-500">{m.eta}</span>
                  </span>
                  <span className="font-mono text-sm text-emerald-400">{m.cost === 0 ? "FREE" : `$${m.cost.toFixed(2)}`}</span>
                </label>
              ))}
            </div>
            <p data-testid="delivery-estimate" className="mt-2 font-mono text-xs text-zinc-400">
              Estimated delivery: <span className="text-blue-400">{method.eta}</span>
            </p>
          </div>

          <button data-testid="place-order-button" disabled={loading} className="w-full rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-60 px-4 py-3 text-sm font-semibold text-white">
            {loading ? "Placing order…" : `Place order · $${grandTotal.toFixed(2)}`}
          </button>
        </form>
      </div>

      {/* Order summary */}
      <div className="md:sticky md:top-24 self-start rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="font-heading font-bold text-zinc-100">Order summary</h3>
        <div className="mt-4 space-y-2" data-testid="checkout-summary">
          {items.map((i) => (
            <div key={i.id} className="flex justify-between text-sm text-zinc-300">
              <span className="truncate pr-2">{i.name} × {i.qty}</span>
              <span className="font-mono shrink-0">${(i.price * i.qty).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1.5 border-t border-zinc-800 pt-4 text-sm">
          <div className="flex justify-between text-zinc-400"><span>Subtotal</span><span data-testid="summary-subtotal" className="font-mono">${total.toFixed(2)}</span></div>
          <div className="flex justify-between text-zinc-400"><span>Shipping ({method.label})</span><span data-testid="summary-shipping" className="font-mono">{method.cost === 0 ? "FREE" : `$${method.cost.toFixed(2)}`}</span></div>
          <div className="flex justify-between border-t border-zinc-800 pt-2 mt-2">
            <span className="text-zinc-200">Total</span>
            <span data-testid="checkout-total" className="font-mono text-lg text-emerald-400">${grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
