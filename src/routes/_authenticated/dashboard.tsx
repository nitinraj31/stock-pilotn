import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingCart, ReceiptText, Users, Truck, IndianRupee, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { fmtMoney, fmtNumber } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { seedDemoData } from "@/lib/seed.functions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const seed = useServerFn(seedDemoData);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [
        { count: productCount },
        { count: customerCount },
        { count: supplierCount },
        { data: salesAgg },
        { data: purchasesAgg },
        { data: lowStock },
        { data: recentSales },
        { data: salesByMonth },
      ] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("customers").select("*", { count: "exact", head: true }),
        supabase.from("suppliers").select("*", { count: "exact", head: true }),
        supabase.from("sales").select("total, created_at"),
        supabase.from("purchases").select("total"),
        supabase.from("products").select("id, name, sku, quantity, reorder_level").order("quantity"),
        supabase.from("sales").select("id, invoice_no, total, created_at, customer:customers(name)").order("created_at", { ascending: false }).limit(6),
        supabase.from("sales").select("total, created_at"),
      ]);

      const totalSales = (salesAgg ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0);
      const totalPurchases = (purchasesAgg ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0);

      // Monthly chart (last 6 months)
      const months: { label: string; key: string; sales: number }[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.push({ key, label: d.toLocaleDateString("en-IN", { month: "short" }), sales: 0 });
      }
      for (const s of salesByMonth ?? []) {
        const d = new Date(s.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const m = months.find((x) => x.key === key);
        if (m) m.sales += Number(s.total ?? 0);
      }

      // Daily (last 14 days)
      const days: { label: string; key: string; sales: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days.push({ key, label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), sales: 0 });
      }
      for (const s of salesByMonth ?? []) {
        const key = new Date(s.created_at).toISOString().slice(0, 10);
        const day = days.find((x) => x.key === key);
        if (day) day.sales += Number(s.total ?? 0);
      }

      const lowStockItems = (lowStock ?? []).filter((p) => p.quantity <= p.reorder_level);

      return {
        productCount: productCount ?? 0,
        customerCount: customerCount ?? 0,
        supplierCount: supplierCount ?? 0,
        totalSales, totalPurchases,
        revenue: totalSales - totalPurchases,
        months, days,
        lowStockItems,
        recentSales: recentSales ?? [],
      };
    },
  });

  async function runSeed() {
    toast.promise(seed().then(() => qc.invalidateQueries()), {
      loading: "Seeding demo data...",
      success: "Demo data ready",
      error: "Failed to seed",
    });
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your inventory, sales and stock health"
        actions={<Button variant="outline" size="sm" onClick={runSeed}>Seed demo data</Button>}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Products" value={fmtNumber(data?.productCount)} icon={<Package className="size-5" />} />
        <StatCard label="Customers" value={fmtNumber(data?.customerCount)} icon={<Users className="size-5" />} tone="muted" />
        <StatCard label="Suppliers" value={fmtNumber(data?.supplierCount)} icon={<Truck className="size-5" />} tone="muted" />
        <StatCard label="Total Sales" value={fmtMoney(data?.totalSales ?? 0)} icon={<ReceiptText className="size-5" />} tone="success" />
        <StatCard label="Total Purchases" value={fmtMoney(data?.totalPurchases ?? 0)} icon={<ShoppingCart className="size-5" />} tone="warning" />
        <StatCard label="Revenue" value={fmtMoney(data?.revenue ?? 0)} icon={<IndianRupee className="size-5" />} tone={(data?.revenue ?? 0) >= 0 ? "success" : "destructive"} hint="Sales − Purchases" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Monthly Sales (last 6 months)</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.months ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 250)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
                <Bar dataKey="sales" fill="oklch(0.52 0.18 256)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="size-4 text-warning-foreground" />
            <h2 className="text-sm font-semibold">Low Stock Alerts</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {data?.lowStockItems.length ?? 0} item(s) at or below reorder level
          </p>
          <div className="space-y-2 max-h-64 overflow-auto">
            {(data?.lowStockItems ?? []).slice(0, 8).map((p) => (
              <Link key={p.id} to="/products" className="block rounded-md border p-3 hover:bg-accent">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.sku}</p>
                  </div>
                  <span className={`num text-sm rounded px-2 py-1 ${p.quantity === 0 ? "bg-destructive/15 text-destructive" : "bg-warning/20 text-warning-foreground"}`}>
                    {p.quantity}
                  </span>
                </div>
              </Link>
            ))}
            {(data?.lowStockItems.length ?? 0) === 0 && !isLoading && (
              <p className="text-sm text-muted-foreground">All stock levels healthy.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold mb-4">Sales — last 14 days</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.days ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 250)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
                <Line type="monotone" dataKey="sales" stroke="oklch(0.52 0.18 256)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-3">Recent Sales</h2>
          <div className="space-y-2">
            {(data?.recentSales ?? []).map((s: any) => (
              <Link key={s.id} to="/sales/$id" params={{ id: s.id }} className="flex items-center justify-between gap-2 rounded-md border p-2.5 hover:bg-accent">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.invoice_no}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.customer?.name ?? "Walk-in"}</p>
                </div>
                <span className="num text-sm font-medium">{fmtMoney(s.total)}</span>
              </Link>
            ))}
            {(data?.recentSales.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">No sales yet.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
