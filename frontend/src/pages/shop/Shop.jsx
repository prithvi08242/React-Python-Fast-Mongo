import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useCart } from "@/context/CartContext";

export default function Shop() {
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (search) params.set("search", search);
    api.get(`/shop/products?${params.toString()}`).then(({ data }) => {
      setProducts(data.data);
      setCategories(data.categories);
      setLoading(false);
    });
  }, [category, search]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tighter text-zinc-50">Gadget Store</h1>
      <p className="mt-2 text-zinc-400">Browse → add to cart → checkout → orders. A full e-commerce flow to automate.</p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <input
          data-testid="shop-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-blue-500 outline-none"
        />
        <button data-testid="cat-all" onClick={() => setCategory("all")} className={`rounded-md px-3 py-2 text-sm capitalize border ${category === "all" ? "bg-blue-600 border-blue-600 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-300"}`}>all</button>
        {categories.map((c) => (
          <button key={c} data-testid={`cat-${c}`} onClick={() => setCategory(c)} className={`rounded-md px-3 py-2 text-sm capitalize border ${category === c ? "bg-blue-600 border-blue-600 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-300"}`}>{c}</button>
        ))}
      </div>

      {loading ? (
        <p data-testid="shop-loading" className="mt-10 font-mono text-sm text-zinc-500">loading products…</p>
      ) : (
        <div data-testid="products-grid" className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <div key={p.id} data-testid={`product-card-${p.id}`} className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden transition-all hover:border-zinc-600">
              <Link to={`/shop/product/${p.id}`} data-testid={`product-link-${p.id}`} className="block aspect-square overflow-hidden bg-black">
                <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              </Link>
              <div className="flex flex-1 flex-col p-5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">{p.category}</span>
                <Link to={`/shop/product/${p.id}`} className="mt-1 font-heading font-bold text-zinc-100 hover:text-blue-400">{p.name}</Link>
                <p className="mt-2 text-sm text-zinc-400 line-clamp-2">{p.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span data-testid={`product-price-${p.id}`} className="font-mono text-lg text-emerald-400">${p.price.toFixed(2)}</span>
                  <button data-testid={`add-to-cart-${p.id}`} onClick={() => addItem(p)} className="rounded-md bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white">Add to cart</button>
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && <p data-testid="shop-empty" className="text-zinc-500">No products match.</p>}
        </div>
      )}
    </div>
  );
}
