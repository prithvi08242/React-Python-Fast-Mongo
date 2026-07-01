import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useCart } from "@/context/CartContext";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [notFound, setNotFound] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    api.get(`/shop/products/${id}`).then(({ data }) => setProduct(data)).catch(() => setNotFound(true));
  }, [id]);

  if (notFound) return <div data-testid="product-not-found" className="max-w-3xl mx-auto px-6 py-24 text-center text-zinc-400">Product not found. <Link to="/shop" className="text-blue-400">Back to shop</Link></div>;
  if (!product) return <div className="px-6 py-24 text-center font-mono text-sm text-zinc-500">loading…</div>;

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
      <Link to="/shop" data-testid="back-to-shop" className="text-xs font-mono text-zinc-500 hover:text-blue-400">&larr; back to shop</Link>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-xl border border-zinc-800 bg-black">
          <img data-testid="product-image" src={product.image} alt={product.name} className="h-full w-full object-cover" />
        </div>
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-zinc-500">{product.category}</span>
          <h1 data-testid="product-title" className="mt-2 font-heading text-3xl font-black tracking-tight text-zinc-50">{product.name}</h1>
          <p data-testid="product-detail-price" className="mt-3 font-mono text-2xl text-emerald-400">${product.price.toFixed(2)}</p>
          <p className="mt-4 text-zinc-400 leading-relaxed">{product.description}</p>
          <p data-testid="product-stock" className="mt-2 font-mono text-sm text-zinc-500">in stock: {product.stock}</p>

          <div className="mt-6 flex items-center gap-3">
            <input data-testid="qty-input" type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} className="w-20 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100" />
            <button data-testid="detail-add-to-cart" onClick={() => { addItem(product, qty); setAdded(true); }} className="rounded-md bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white">Add to cart</button>
            <button data-testid="buy-now" onClick={() => { addItem(product, qty); navigate("/shop/cart"); }} className="rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-5 py-2.5 text-sm text-zinc-100">Buy now</button>
          </div>
          {added && <p data-testid="added-confirmation" className="mt-4 font-mono text-sm text-emerald-400">added to cart ✓</p>}
        </div>
      </div>
    </div>
  );
}
