// Static location data for the Checkout practice page.
// Powers cascading country -> state dropdowns and ZIP auto-populate.

export const COUNTRIES = [
  {
    code: "IN",
    name: "India",
    states: ["Maharashtra", "Karnataka", "Delhi", "Tamil Nadu", "Gujarat"],
  },
  {
    code: "US",
    name: "United States",
    states: ["California", "New York", "Texas", "Washington", "Florida"],
  },
  {
    code: "DE",
    name: "Germany",
    states: ["Bavaria", "Berlin", "Hesse", "Saxony"],
  },
  {
    code: "CA",
    name: "Canada",
    states: ["Ontario", "Quebec", "British Columbia", "Alberta"],
  },
];

// zip -> { country, state, city }  (auto-populate practice)
export const ZIP_LOOKUP = {
  "400001": { country: "India", state: "Maharashtra", city: "Mumbai" },
  "560001": { country: "India", state: "Karnataka", city: "Bengaluru" },
  "110001": { country: "India", state: "Delhi", city: "New Delhi" },
  "600001": { country: "India", state: "Tamil Nadu", city: "Chennai" },
  "90001": { country: "United States", state: "California", city: "Los Angeles" },
  "10001": { country: "United States", state: "New York", city: "New York" },
  "73301": { country: "United States", state: "Texas", city: "Austin" },
  "98101": { country: "United States", state: "Washington", city: "Seattle" },
  "80331": { country: "Germany", state: "Bavaria", city: "Munich" },
  "10115": { country: "Germany", state: "Berlin", city: "Berlin" },
  "60311": { country: "Germany", state: "Hesse", city: "Frankfurt" },
  "M5H": { country: "Canada", state: "Ontario", city: "Toronto" },
  "H2X": { country: "Canada", state: "Quebec", city: "Montreal" },
};

export const SHIPPING_METHODS = [
  { id: "standard", label: "Standard", eta: "5–7 business days", cost: 0 },
  { id: "express", label: "Express", eta: "2–3 business days", cost: 9.99 },
  { id: "overnight", label: "Overnight", eta: "next business day", cost: 24.99 },
];

export const statesForCountry = (name) =>
  COUNTRIES.find((c) => c.name === name)?.states || [];
