import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { Header } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Practice from "@/pages/Practice";
import SectionPage from "@/pages/SectionPage";
import ApiPlayground from "@/pages/ApiPlayground";
import Shop from "@/pages/shop/Shop";
import ProductDetail from "@/pages/shop/ProductDetail";
import Cart from "@/pages/shop/Cart";
import Checkout from "@/pages/shop/Checkout";
import Orders from "@/pages/shop/Orders";

function App() {
  return (
    <div className="App min-h-screen bg-background">
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Header />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/practice" element={<ProtectedRoute><Practice /></ProtectedRoute>} />
              <Route path="/practice/:slug" element={<ProtectedRoute><SectionPage /></ProtectedRoute>} />
              <Route path="/rest-playground" element={<ProtectedRoute><ApiPlayground /></ProtectedRoute>} />
              <Route path="/shop" element={<ProtectedRoute><Shop /></ProtectedRoute>} />
              <Route path="/shop/product/:id" element={<ProtectedRoute><ProductDetail /></ProtectedRoute>} />
              <Route path="/shop/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
              <Route path="/shop/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
              <Route path="/shop/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
