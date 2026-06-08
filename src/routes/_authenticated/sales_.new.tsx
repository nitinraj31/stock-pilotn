import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";

type Line = { product_id: string; name: string; sku: string; available: number; quantity: number; unit_price: number; gst_rate: number };

export const Route = createFileRoute("/_authenticated/sales_/new")({ component: NewSale });

function NewSale() {
  const nav = useNavigate();
  const [customerId, setCustomerId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [pickProduct, setPickProduct] = useState("");

  const { data: customers, isLoading: customersLoading } = useQuery({ queryKey: ["customers-min"], queryFn: async () => (await supabase.rpc("list_customer_options")).data ?? [] });
  const { data: products } = useQuery({ queryKey: ["products-sale"], queryFn: async () => (await supabase.from("products").select("id,name,sku,selling_price,gst_rate,quantity").order("name")).data ?? [] });

  const totals = useMemo(() => {
    let subtotal = 0, tax = 0;
    for (const l of lines) {
      const sub = l.quantity * l.unit_price;
      subtotal += sub;
      tax += sub * l.gst_rate / 100;
    }
    const total = Math.max(0, subtotal + tax - discount);
    return { subtotal, tax, total };
  }, [lines, discount]);

  function addProduct() {
    if (!pickProduct) return;
    const p = products?.find((x) => x.id === pickProduct);
    if (!p) return;
    if (lines.some((l) => l.product_id === p.id)) return toast.info("Already added");
    if (p.quantity <= 0) return toast.error("Out of stock");
    setLines((arr) => [...arr, { product_id: p.id, name: p.name, sku: p.sku, available: p.quantity, quantity: 1, unit_price: Number(p.selling_price), gst_rate: Number(p.gst_rate) }]);
    setPickProduct("");
  }
  function updateLine(idx: number, patch: Partial<Line>) {
    setLines((arr) => arr.map((l, i) => {
      if (i !== idx) return l;
      const next = { ...l, ...patch };
      if (next.quantity > next.available) { toast.warning(`Only ${next.available} in stock`); next.quantity = next.available; }
      if (next.quantity < 1) next.quantity = 1;
      return next;
    }));
  }
  function removeLine(idx: number) { setLines((arr) => arr.filter((_, i) => i !== idx)); }

  const save = useMutation({
    mutationFn: async () => {
      if (lines.length === 0) throw new Error("Add at least one product");
      const { data: user } = await supabase.auth.getUser();
      const { data: sale, error } = await supabase.from("sales").insert({
        customer_id: customerId || null,
        subtotal: +totals.subtotal.toFixed(2),
        tax: +totals.tax.toFixed(2),
        discount: +discount.toFixed(2),
        total: +totals.total.toFixed(2),
        notes: notes || null,
        created_by: user.user?.id,
      }).select("id, invoice_no").single();
      if (error) throw error;
      const items = lines.map((l) => {
        const sub = l.quantity * l.unit_price;
        const taxAmt = +(sub * l.gst_rate / 100).toFixed(2);
        return {
          sale_id: sale.id,
          product_id: l.product_id,
          quantity: l.quantity,
          unit_price: l.unit_price,
          gst_rate: l.gst_rate,
          tax_amount: taxAmt,
          total: +(sub + taxAmt).toFixed(2),
        };
      });
      const { error: e2 } = await supabase.from("sale_items").insert(items);
      if (e2) throw e2;
      return sale;
    },
    onSuccess: (sale) => { toast.success(`Sale ${sale.invoice_no} created`); nav({ to: "/sales/$id", params: { id: sale.id } }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="New Sale" description="Stock is automatically reduced when saved"
        actions={<Button asChild variant="outline"><Link to="/sales"><ArrowLeft className="size-4" /> Back</Link></Button>} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select value={customerId || "none"} onValueChange={(v) => setCustomerId(v === "none" ? "" : v)} disabled={customersLoading}>
                <SelectTrigger><SelectValue placeholder={customersLoading ? "Loading customers…" : "Walk-in customer"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Walk-in customer</SelectItem>
                  {(customers ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  {(customers ?? []).length === 0 && !customersLoading && <div className="px-2 py-4 text-sm text-muted-foreground text-center">No customers yet</div>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Add product</Label>
              <div className="flex gap-2">
                <Select value={pickProduct} onValueChange={setPickProduct}>
                  <SelectTrigger><SelectValue placeholder="Choose product" /></SelectTrigger>
                  <SelectContent>
                    {(products ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id} disabled={p.quantity <= 0}>
                        {p.name} ({p.sku}) — {p.quantity} in stock
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={addProduct}><Plus className="size-4" /></Button>
              </div>
            </div>
          </div>

          <Table>
            <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="w-20">Qty</TableHead><TableHead className="w-32">Price</TableHead><TableHead className="w-20">GST%</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {lines.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No items yet — add a product above</TableCell></TableRow>}
              {lines.map((l, i) => {
                const sub = l.quantity * l.unit_price;
                const lineTotal = sub * (1 + l.gst_rate / 100);
                return (
                  <TableRow key={i}>
                    <TableCell><div className="font-medium">{l.name}</div><div className="text-xs text-muted-foreground num">{l.sku} · {l.available} in stock</div></TableCell>
                    <TableCell><Input type="number" min={1} max={l.available} value={l.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} /></TableCell>
                    <TableCell><Input type="number" step="0.01" value={l.unit_price} onChange={(e) => updateLine(i, { unit_price: Number(e.target.value) })} /></TableCell>
                    <TableCell><Input type="number" step="0.01" value={l.gst_rate} onChange={(e) => updateLine(i, { gst_rate: Number(e.target.value) })} /></TableCell>
                    <TableCell className="text-right num">{fmtMoney(lineTotal)}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="size-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
          </div>
        </Card>

        <Card className="p-5 h-fit space-y-3">
          <h3 className="text-sm font-semibold">Summary</h3>
          <div className="flex justify-between text-sm"><span>Subtotal</span><span className="num">{fmtMoney(totals.subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span>Tax (GST)</span><span className="num">{fmtMoney(totals.tax)}</span></div>
          <div className="space-y-1.5">
            <Label>Discount (₹)</Label>
            <Input type="number" step="0.01" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
          </div>
          <div className="flex justify-between border-t pt-2 font-semibold text-lg"><span>Total</span><span className="num">{fmtMoney(totals.total)}</span></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending || lines.length === 0}>
            {save.isPending ? "Saving..." : "Save Sale"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
