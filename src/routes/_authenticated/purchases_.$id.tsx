import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtMoney, fmtDate } from "@/lib/format";
import { generateInvoicePDF } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/purchases_/$id")({ component: PurchaseDetail });

function PurchaseDetail() {
  const { id } = useParams({ from: "/_authenticated/purchases_/$id" });
  const { data } = useQuery({
    queryKey: ["purchase", id],
    queryFn: async () => {
      const { data: p } = await supabase.from("purchases").select("*").eq("id", id).maybeSingle();
      const { data: items } = await supabase.from("purchase_items").select("*, product:products(name, sku)").eq("purchase_id", id);
      let supplierName: string | null = null;
      if (p?.supplier_id) {
        const { data: name } = await supabase.rpc("get_supplier_name", { _id: p.supplier_id });
        supplierName = name;
      }
      return { purchase: p, items: items ?? [], supplierName };
    },
  });

  function downloadPDF(action: "download" | "print") {
    if (!data?.purchase) return;
    generateInvoicePDF({
      kind: "purchase",
      invoice_no: data.purchase.invoice_no,
      date: data.purchase.created_at,
      party: data.supplierName ? { name: data.supplierName } : { name: "—" },
      items: data.items.map((it: any) => ({
        name: it.product?.name ?? "Unknown", sku: it.product?.sku,
        quantity: it.quantity, unit_price: Number(it.unit_price), total: Number(it.total),
      })),
      subtotal: Number(data.purchase.subtotal),
      tax: Number(data.purchase.tax),
      total: Number(data.purchase.total),
      notes: data.purchase.notes,
    }, action);
  }

  if (!data?.purchase) return <div className="p-6">Loading...</div>;
  const p = data.purchase;

  return (
    <div>
      <PageHeader title={`Purchase ${p.invoice_no}`} description={fmtDate(p.created_at)}
        actions={<div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/purchases"><ArrowLeft className="size-4" /> Back</Link></Button>
          <Button variant="outline" onClick={() => downloadPDF("print")}><Printer className="size-4" /> Print</Button>
          <Button onClick={() => downloadPDF("download")}><Download className="size-4" /> Download PDF</Button>
        </div>} />

      <div className="grid gap-4 lg:grid-cols-3 mb-4">
        <Card className="p-4 lg:col-span-2">
          <p className="text-xs uppercase text-muted-foreground mb-1">Supplier</p>
          <p className="font-semibold">{data.supplierName ?? "—"}</p>
        </Card>
        <Card className="p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span className="num">{fmtMoney(p.subtotal)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span className="num">{fmtMoney(p.tax)}</span></div>
          <div className="flex justify-between font-semibold border-t pt-2"><span>Total</span><span className="num">{fmtMoney(p.total)}</span></div>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Unit price</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
          <TableBody>
            {data.items.map((it: any) => (
              <TableRow key={it.id}>
                <TableCell><div className="font-medium">{it.product?.name}</div><div className="text-xs text-muted-foreground num">{it.product?.sku}</div></TableCell>
                <TableCell className="text-right num">{it.quantity}</TableCell>
                <TableCell className="text-right num">{fmtMoney(it.unit_price)}</TableCell>
                <TableCell className="text-right num">{fmtMoney(it.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {p.notes && <Card className="mt-4 p-4"><p className="text-xs uppercase text-muted-foreground mb-1">Notes</p><p className="text-sm">{p.notes}</p></Card>}
    </div>
  );
}
