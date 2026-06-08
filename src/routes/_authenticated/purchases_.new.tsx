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

type Line = { product_id: string; name: string; sku: string; quantity: number; unit_price: number; gst_rate: number };

export const Route = createFileRoute("/_authenticated/purchases_/new")({ component: NewPurchase });

function NewPurchase() {
  const nav = useNavigate();
  const [supplierId, setSupplierId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [pickProduct, setPickProduct] = useState("");

  const { data: suppliers } = useQuery({ queryKey: ["suppliers-min"], queryFn: async () => (await supabase.rpc("list_supplier_options")).data ?? [] });
  const { data: products } = useQuery({ queryKey: ["products-min"], queryFn: async () => (await supabase.from("products").select("id,name,sku,purchase_price,gst_rate").order("name")).data ?? [] });

  const totals = useMemo(() => {
    let subtotal = 0, tax = 0;
    for (const l of lines) {
      const lineSub = l.quantity * l.unit_price;
      subtotal += lineSub;
      tax += lineSub * l.gst_rate / 100;
    }
    return { subtotal, tax, total: subtotal + tax };
  }, [lines]);

  function addProduct() {
    if (!pickProduct) return;
    const p = products?.find((x) => x.id === pickProduct);
    if (!p) return;
    if (lines.some((l) => l.product_id === p.id)) return toast.info("Already added");
    setLines((arr) => [...arr, { product_id: p.id, name: p.name, sku: p.sku, quantity: 1, unit_price: Number(p.purchase_price), gst_rate: Number(p.gst_rate) }]);
    setPickProduct("");
  }
  function updateLine(idx: number, patch: Partial<Line>) { setLines((arr) => arr.map((l, i) => i === idx ? { ...l, ...patch } : l)); }
  function removeLine(idx: number) { setLines((arr) => arr.filter((_, i) => i !== idx)); }

  const save = useMutation({
    mutationFn: async () => {
      if (lines.length === 0) throw new Error("Add at least one product");
      const { data: user } = await supabase.auth.getUser();
      const { data: po, error } = await supabase.from("purchases").insert({
        supplier_id: supplierId || null,
        subtotal: +totals.subtotal.toFixed(2),
        tax: +totals.tax.toFixed(2),
        total: +totals.total.toFixed(2),
        notes: notes || null,
        created_by: user.user?.id,
      }).select("id, invoice_no").single();
      if (error) throw error;
      const items = lines.map((l) => ({
        purchase_id: po.id,
        product_id: l.product_id,
        quantity: l.quantity,
        unit_price: l.unit_price,
        total: +(l.quantity * l.unit_price * (1 + l.gst_rate / 100)).toFixed(2),
      }));
      const { error: e2 } = await supabase.from("purchase_items").insert(items);
      if (e2) throw e2;
      return po;
    },
    onSuccess: (po) => { toast.success(`Purchase ${po.invoice_no} created`); nav({ to: "/purchases/$id", params: { id: po.id } }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="New Purchase Order" description="Stock is automatically increased when saved"
        actions={<Button asChild variant="outline"><Link to="/purchases"><ArrowLeft className="size-4" /> Back</Link></Button>} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Select value={supplierId || "none"} onValueChange={(v) => setSupplierId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {(suppliers ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Add product</Label>
              <div className="flex gap-2">
                <Select value={pickProduct} onValueChange={setPickProduct}>
                  <SelectTrigger><SelectValue placeholder="Choose product" /></SelectTrigger>
                  <SelectContent>
                    {(products ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={addProduct}><Plus className="size-4" /></Button>
              </div>
            </div>
          </div>

          <Table>
            <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="w-20">Qty</TableHead><TableHead className="w-32">Unit price</TableHead><TableHead className="w-24">GST%</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {lines.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No items yet — add a product above</TableCell></TableRow>}
              {lines.map((l, i) => {
                const sub = l.quantity * l.unit_price;
                const total = sub * (1 + l.gst_rate / 100);
                return (
                  <TableRow key={i}>
                    <TableCell><div className="font-medium">{l.name}</div><div className="text-xs text-muted-foreground num">{l.sku}</div></TableCell>
                    <TableCell><Input type="number" min={1} value={l.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} /></TableCell>
                    <TableCell><Input type="number" step="0.01" value={l.unit_price} onChange={(e) => updateLine(i, { unit_price: Number(e.target.value) })} /></TableCell>
                    <TableCell><Input type="number" step="0.01" value={l.gst_rate} onChange={(e) => updateLine(i, { gst_rate: Number(e.target.value) })} /></TableCell>
                    <TableCell className="text-right num">{fmtMoney(total)}</TableCell>
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
          <div className="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span className="num">{fmtMoney(totals.total)}</span></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending || lines.length === 0}>
            {save.isPending ? "Saving..." : "Save Purchase"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
