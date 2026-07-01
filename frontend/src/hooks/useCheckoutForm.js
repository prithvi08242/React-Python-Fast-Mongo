import { useRef, useState } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { ZIP_LOOKUP, SHIPPING_METHODS, statesForCountry } from "@/data/locations";

const INITIAL = {
  shipping_name: "",
  shipping_address: "",
  shipping_country: "",
  shipping_state: "",
  shipping_city: "",
  shipping_zip: "",
  shipping_method: "standard",
};

// Encapsulates all checkout form state, the async ZIP lookup, cascading
// country->state logic, derived totals, and order submission. Keeps the
// Checkout component focused on rendering.
export function useCheckoutForm({ items, total, clear, navigate }) {
  const [form, setForm] = useState(INITIAL);
  const [zipStatus, setZipStatus] = useState(""); // "", looking, found, notfound
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const zipTimer = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // cascading reset: changing country clears the dependent state
  const onCountryChange = (name) =>
    setForm((f) => ({ ...f, shipping_country: name, shipping_state: "" }));

  const onZipChange = (value) => {
    set("shipping_zip", value);
    if (zipTimer.current) clearTimeout(zipTimer.current);
    const key = value.trim().toUpperCase();
    if (key.length < 3) {
      setZipStatus("");
      return;
    }
    setZipStatus("looking"); // simulate an async ZIP lookup service
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

  return { form, set, onCountryChange, onZipChange, zipStatus, error, loading, availableStates, method, grandTotal, placeOrder };
}
