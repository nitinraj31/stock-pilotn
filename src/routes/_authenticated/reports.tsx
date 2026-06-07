import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtMoney, fmtDate } from "@/lib/format";
import { StatCard } from "@/components/stat-card";
import { TrendingUp, TrendingDown, IndianRupee, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/reports")({ component: ReportsPage });

function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
  const [from, setFrom] = useState(monthAgo.toISOString().slice(0, 10));
  const [to, setTo] = useState(today);

  const { data } = useQuery({
    queryKey: ["reports", from, to],
    queryFn: async () => {
      const fromIso = new Date(from).toISOString();
      const toIso = new Date(new Date(to).getTime() + 86400000).toISOString();

      const { data: sales } = await supabase.from("sales").select("*, customer:customers(name)").gte("created_at", fromIso).lt("created_at", toIso).order("created_at", { ascending: false });
      const { data: purchases } = await supabase.from("purchases").select("*, supplier:suppliers(name)").gte("created_at", fromIso).lt("created_at", toIso).order("created_at", { ascending: false });
      const { data: products } = await supabase.from("products").select("*, category:categories(name)").order("name");

      const saleTotal = (sales ?? []).reduce((s, x) => s + Number(x.total), 0);
      const saleSub = (sales ?? []).reduce((s, x) => s + Number(x.subtotal), 0);
      const purchaseTotal = (purchases ?? []).reduce((s, x) => s + Number(x.total), 0);
      const profit = saleSub - (purchases ?? []).reduce((s, x) => s + Number(x.subtotal), 0);

      // Daily series
      const dayMap = new Map<string, number>();
      for (const s of sales ?? []) {
        const k = new Date(s.created_at).toISOString().slice(0, 10);
        dayMap.set(k, (dayMap.get(k) ?? 0) + Number(s.total));
      }
      const daily = Array.from(dayMap.entries()).sort().map(([date, total]) => ({ date, total }));

      // Monthly
      const monthMap = new Map<string, number>();
      for (const s of sales ?? []) {
        const d = new Date(s.created_at);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthMap.set(k, (monthMap.get(k) ?? 0) + Number(s.total));
      }
      const monthly = Array.from(monthMap.entries()).sort().map(([month, total]) => ({ month, total }));

      // Inventory value
      const invValue = (products ?? []).reduce((s, p) => s + Number(p.quantity) * Number(p.purchase_price), 0);
      const invRetail = (products ?? []).reduce((s, p) => s + Number(p.quantity) * Number(p.selling_price), 0);

      return {
        sales: sales ?? [], purchases: purchases ?? [], products: products ?? [],
        saleTotal, purchaseTotal, profit, daily, monthly, invValue, invRetail,
      };
    },
  });

  return (
    <div>
      <PageHeader title="Reports" description="Sales, purchases, profit & loss, and inventory" />

      <Card className="p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5"><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
        <StatCard label="Sales" value={fmtMoney(data?.saleTotal ?? 0)} icon={<TrendingUp className="size-5" />} tone="success" />
        <StatCard label="Purchases" value={fmtMoney(data?.purchaseTotal ?? 0)} icon={<TrendingDown className="size-5" />} tone="warning" />
        <StatCard label="Profit" value={fmtMoney(data?.profit ?? 0)} icon={<IndianRupee className="size-5" />} tone={(data?.profit ?? 0) >= 0 ? "success" : "destructive"} />
        <StatCard label="Inventory @ cost" value={fmtMoney(data?.invValue ?? 0)} icon={<Package className="size-5" />} hint={`Retail: ${fmtMoney(data?.invRetail ?? 0)}`} />
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily Sales</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Sales</TabsTrigger>
          <TabsTrigger value="purchase">Purchases</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="pl">P &amp; L</TabsTrigger>
        </TabsList>
        <TabsContent value="daily">
          <Card><Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Sales</TableHead></TableRow></TableHeader>
            <TableBody>
              {(data?.daily ?? []).map((d) => <TableRow key={d.date}><TableCell>{fmtDate(d.date)}</TableCell><TableCell className="text-right num">{fmtMoney(d.total)}</TableCell></TableRow>)}
              {(data?.daily.length ?? 0) === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">No sales in this range</TableCell></TableRow>}
            </TableBody>
          </Table></Card>
        </TabsContent>
        <TabsContent value="monthly">
          <Card><Table>
            <TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Sales</TableHead></TableRow></TableHeader>
            <TableBody>
              {(data?.monthly ?? []).map((m) => <TableRow key={m.month}><TableCell>{m.month}</TableCell><TableCell className="text-right num">{fmtMoney(m.total)}</TableCell></TableRow>)}
            </TableBody>
          </Table></Card>
        </TabsContent>
        <TabsContent value="purchase">
          <Card><Table>
            <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Supplier</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {(data?.purchases ?? []).map((p: any) => <TableRow key={p.id}><TableCell className="num">{p.invoice_no}</TableCell><TableCell>{fmtDate(p.created_at)}</TableCell><TableCell>{p.supplier?.name ?? "—"}</TableCell><TableCell className="text-right num">{fmtMoney(p.total)}</TableCell></TableRow>)}
            </TableBody>
          </Table></Card>
        </TabsContent>
        <TabsContent value="inventory">
          <Card><Table>
            <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Stock</TableHead><TableHead className="text-right">Reorder</TableHead><TableHead className="text-right">Value @ cost</TableHead></TableRow></TableHeader>
            <TableBody>
              {(data?.products ?? []).map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground num">{p.sku}</div></TableCell>
                  <TableCell>{p.category?.name ?? "—"}</TableCell>
                  <TableCell className="text-right num">{p.quantity}</TableCell>
                  <TableCell className="text-right num text-muted-foreground">{p.reorder_level}</TableCell>
                  <TableCell className="text-right num">{fmtMoney(p.quantity * Number(p.purchase_price))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></Card>
        </TabsContent>
        <TabsContent value="pl">
          <Card className="p-6 max-w-md space-y-3">
            <h3 className="font-semibold">Profit &amp; Loss</h3>
            <div className="flex justify-between text-sm"><span>Sales (subtotal)</span><span className="num">{fmtMoney((data?.sales ?? []).reduce((s, x) => s + Number(x.subtotal), 0))}</span></div>
            <div className="flex justify-between text-sm"><span>Purchases (subtotal)</span><span className="num">{fmtMoney((data?.purchases ?? []).reduce((s, x) => s + Number(x.subtotal), 0))}</span></div>
            <div className="flex justify-between text-sm"><span>Tax collected</span><span className="num">{fmtMoney((data?.sales ?? []).reduce((s, x) => s + Number(x.tax), 0))}</span></div>
            <div className="flex justify-between text-sm"><span>Tax paid</span><span className="num">{fmtMoney((data?.purchases ?? []).reduce((s, x) => s + Number(x.tax), 0))}</span></div>
            <div className="flex justify-between font-semibold border-t pt-2 text-base">
              <span>Gross Profit</span>
              <span className={`num ${(data?.profit ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>{fmtMoney(data?.profit ?? 0)}</span>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
