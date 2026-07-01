import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Terminal, LogOut, User, FlaskConical, ShoppingCart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export const Header = () => {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const loc = useLocation();
  const linkCls = (path) =>
    `text-sm font-medium transition-colors ${
      loc.pathname === path ? "text-blue-400" : "text-zinc-400 hover:text-zinc-100"
    }`;

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-zinc-950/80 border-b border-zinc-800">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8 max-w-[1600px] mx-auto">
        <Link to="/" data-testid="brand-logo" className="flex items-center gap-2 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
            <Terminal className="w-4 h-4" />
          </span>
          <span className="font-heading font-black tracking-tight text-zinc-50 text-lg">
            PracticeGround
          </span>
        </Link>

        <nav className="flex items-center gap-5 sm:gap-6">
          <Link to="/practice" data-testid="nav-practice" className={linkCls("/practice")}>
            Practice
          </Link>
          <Link to="/rest-playground" data-testid="nav-api" className={linkCls("/rest-playground")}>
            API Playground
          </Link>
          <Link to="/shop" data-testid="nav-shop" className={linkCls("/shop")}>
            Shop
          </Link>
          <Link to="/shop/cart" data-testid="nav-cart" className="relative text-zinc-400 hover:text-zinc-100 transition-colors">
            <ShoppingCart className="w-5 h-5" />
            {count > 0 && (
              <span data-testid="cart-badge" className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <span data-testid="current-user-email" className="hidden sm:flex items-center gap-1.5 text-sm text-zinc-400">
                <User className="w-4 h-4" /> {user.email}
              </span>
              <button
                data-testid="logout-button"
                onClick={logout}
                className="flex items-center gap-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 text-sm text-zinc-100 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              data-testid="nav-login"
              className="flex items-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-500 px-4 py-1.5 text-sm font-medium text-white transition-colors"
            >
              <FlaskConical className="w-4 h-4" /> Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export const SectionShell = ({ num, title, desc, children }) => (
  <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
    <Link to="/practice" data-testid="back-to-practice" className="text-xs font-mono text-zinc-500 hover:text-blue-400 transition-colors">
      &larr; back to sections
    </Link>
    <div className="mt-4 flex items-center gap-3">
      <span className="font-mono text-sm font-semibold text-blue-400 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800">
        {String(num).padStart(2, "0")}
      </span>
      <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tighter text-zinc-50">{title}</h1>
    </div>
    <p className="mt-2 text-zinc-400">{desc}</p>
    <div className="mt-8">{children}</div>
  </div>
);

export const Panel = ({ title, children, testid }) => (
  <div data-testid={testid} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 lg:p-8 shadow-2xl shadow-black/40">
    {title && <h3 className="font-heading text-lg font-bold text-zinc-100 mb-5">{title}</h3>}
    {children}
  </div>
);
