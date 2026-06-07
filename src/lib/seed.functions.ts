import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEMO_CATEGORIES = [
  { name: "Electronics", description: "Phones, accessories, gadgets" },
  { name: "Stationery", description: "Pens, notebooks, office supplies" },
  { name: "Groceries", description: "Daily essentials" },
  { name: "Apparel", description: "Clothing and accessories" },
];

const DEMO_PRODUCTS = [
  { name: "Wireless Mouse", sku: "ELE-001", barcode: "8901234500011", category: "Electronics", purchase_price: 350, selling_price: 599, opening_stock: 50, reorder_level: 10, gst_rate: 18 },
  { name: "USB-C Cable 1m", sku: "ELE-002", barcode: "8901234500028", category: "Electronics", purchase_price: 90, selling_price: 199, opening_stock: 120, reorder_level: 30, gst_rate: 18 },
  { name: "Bluetooth Earbuds", sku: "ELE-003", barcode: "8901234500035", category: "Electronics", purchase_price: 1200, selling_price: 1999, opening_stock: 25, reorder_level: 8, gst_rate: 18 },
  { name: "A4 Notebook 200 pages", sku: "STA-001", barcode: "8901234500042", category: "Stationery", purchase_price: 60, selling_price: 120, opening_stock: 200, reorder_level: 40, gst_rate: 12 },
  { name: "Gel Pen (Blue)", sku: "STA-002", barcode: "8901234500059", category: "Stationery", purchase_price: 8, selling_price: 20, opening_stock: 500, reorder_level: 100, gst_rate: 12 },
  { name: "Stapler", sku: "STA-003", barcode: "8901234500066", category: "Stationery", purchase_price: 80, selling_price: 180, opening_stock: 4, reorder_level: 10, gst_rate: 18 },
  { name: "Basmati Rice 5kg", sku: "GRO-001", barcode: "8901234500073", category: "Groceries", purchase_price: 450, selling_price: 599, opening_stock: 30, reorder_level: 10, gst_rate: 5 },
  { name: "Refined Sunflower Oil 1L", sku: "GRO-002", barcode: "8901234500080", category: "Groceries", purchase_price: 140, selling_price: 175, opening_stock: 60, reorder_level: 15, gst_rate: 5 },
  { name: "Cotton T-Shirt (M)", sku: "APP-001", barcode: "8901234500097", category: "Apparel", purchase_price: 200, selling_price: 499, opening_stock: 0, reorder_level: 10, gst_rate: 12 },
  { name: "Denim Jeans", sku: "APP-002", barcode: "8901234500103", category: "Apparel", purchase_price: 600, selling_price: 1299, opening_stock: 18, reorder_level: 5, gst_rate: 12 },
];

const DEMO_SUPPLIERS = [
  { name: "BlueTech Distributors", email: "sales@bluetech.in", phone: "+91 98765 43210", address: "Mumbai, MH", gst_number: "27AAACB1234A1Z5" },
  { name: "Stationery World", email: "orders@stationeryworld.in", phone: "+91 90000 11111", address: "Delhi", gst_number: "07AABCS9876B1Z2" },
  { name: "FreshMart Wholesale", email: "wholesale@freshmart.in", phone: "+91 98111 22233", address: "Pune, MH", gst_number: "27AAACF5566C1Z9" },
];

const DEMO_CUSTOMERS = [
  { name: "Walk-in Customer", email: "", phone: "", address: "" },
  { name: "Rahul Sharma", email: "rahul@example.com", phone: "+91 90011 22334", address: "Bengaluru, KA" },
  { name: "Priya Verma", email: "priya@example.com", phone: "+91 91234 56789", address: "Hyderabad, TG" },
  { name: "Acme Corp", email: "ap@acme.com", phone: "+91 22 4000 0000", address: "Mumbai, MH" },
];

export const seedDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    // Categories
    const { data: existingCats } = await supabase.from("categories").select("id, name");
    const catMap = new Map((existingCats ?? []).map((c) => [c.name, c.id]));
    for (const c of DEMO_CATEGORIES) {
      if (!catMap.has(c.name)) {
        const { data } = await supabase.from("categories").insert(c).select("id, name").single();
        if (data) catMap.set(data.name, data.id);
      }
    }

    // Products
    const { data: existingProducts } = await supabase.from("products").select("id, sku");
    const skuSet = new Set((existingProducts ?? []).map((p) => p.sku));
    for (const p of DEMO_PRODUCTS) {
      if (skuSet.has(p.sku)) continue;
      await supabase.from("products").insert({
        name: p.name, sku: p.sku, barcode: p.barcode,
        category_id: catMap.get(p.category) ?? null,
        purchase_price: p.purchase_price, selling_price: p.selling_price,
        opening_stock: p.opening_stock, quantity: p.opening_stock,
        reorder_level: p.reorder_level, gst_rate: p.gst_rate,
      });
    }

    // Suppliers
    const { data: existingSup } = await supabase.from("suppliers").select("id, name");
    const supSet = new Set((existingSup ?? []).map((s) => s.name));
    for (const s of DEMO_SUPPLIERS) {
      if (!supSet.has(s.name)) await supabase.from("suppliers").insert(s);
    }

    // Customers
    const { data: existingCust } = await supabase.from("customers").select("id, name");
    const custSet = new Set((existingCust ?? []).map((c) => c.name));
    for (const c of DEMO_CUSTOMERS) {
      if (!custSet.has(c.name)) await supabase.from("customers").insert(c);
    }

    // Sales: create a few sample sales spanning the last 6 months
    const { data: products } = await supabase.from("products").select("id, name, selling_price, gst_rate").limit(20);
    const { data: customers } = await supabase.from("customers").select("id, name").limit(10);
    const { data: existingSales } = await supabase.from("sales").select("id").limit(1);

    if (products && customers && customers.length > 0 && (!existingSales || existingSales.length === 0)) {
      const userId = context.userId;
      const now = new Date();
      for (let i = 0; i < 18; i++) {
        const monthsAgo = Math.floor(i / 3);
        const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.floor(Math.random() * 28) + 1);
        const itemCount = 1 + Math.floor(Math.random() * 3);
        const lines: any[] = [];
        let subtotal = 0, tax = 0;
        for (let j = 0; j < itemCount; j++) {
          const p = products[Math.floor(Math.random() * products.length)];
          const qty = 1 + Math.floor(Math.random() * 4);
          const unit = Number(p.selling_price);
          const lineSub = unit * qty;
          const lineTax = +(lineSub * Number(p.gst_rate) / 100).toFixed(2);
          lines.push({ product_id: p.id, quantity: qty, unit_price: unit, gst_rate: p.gst_rate, tax_amount: lineTax, total: lineSub + lineTax });
          subtotal += lineSub; tax += lineTax;
        }
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const { data: sale } = await supabase.from("sales").insert({
          customer_id: customer.id,
          subtotal: +subtotal.toFixed(2),
          tax: +tax.toFixed(2),
          discount: 0,
          total: +(subtotal + tax).toFixed(2),
          created_by: userId,
          created_at: date.toISOString(),
        }).select("id").single();
        if (sale) {
          for (const l of lines) {
            await supabase.from("sale_items").insert({ ...l, sale_id: sale.id });
          }
        }
      }
    }

    return { ok: true };
  });
