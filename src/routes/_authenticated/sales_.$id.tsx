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

export const Route = createFileRoute("/_authenticated/sales_/$id")({ component: SaleDetail });

function SaleDetail() {
  const { id } = useParams({ from: "/_authenticated/sales_/$id" });
  const { data } = useQuery({
    queryKey: ["sale", id],
    queryFn: async () => {
      const { data: s } = await supabase.from("sales").select("*, customer:customers(*)").eq("id", id).maybeSingle();
      const { data: items } = await supabase.from("sale_items").select("*, product:products(name, sku)").eq("sale_id", id);
      return { sale: s, items: items ?? [] };
    },
  });

  function pdf(action: "download" | "print") {
    if (!data?.sale) return;
    generateInvoicePDF({
      kind: "sale",
      invoice_no: data.sale.invoice_no,
      date: data.sale.created_at,
      party: data.sale.customer ?? { name: "Walk-in Customer" },
      items: data.items.map((it: any) => ({
        name: it.product?.name ?? "Unknown", sku: it.product?.sku,
        quantity: it.quantity, unit_price: Number(it.unit_price),
        gst_rate: Number(it.gst_rate), tax_amount: Number(it.tax_amount),
        total: Number(it.total),
      })),
      subtotal: Number(data.sale.subtotal),
      tax: Number(data.sale.tax),
      discount: Number(data.sale.discount),
      total: Number(data.sale.total),
      notes: data.sale.notes,
    }, action);
  }

  if (!data?.sale) return <div className="p-6">Loading...</div>;
  const s = data.sale;

  return (
    <div>
      <PageHeader title={`Invoice ${s.invoice_no}`} description={fmtDate(s.created_at)}
        actions={<div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/sales"><ArrowLeft className="size-4" /> Back</Link></Button>
          <Button variant="outline" onClick={() => pdf("print")}><Printer className="size-4" /> Print</Button>
          <Button onClick={() => pdf("download")}><Download className="size-4" /> Download PDF</Button>
        </div>} />

      <div className="grid gap-4 lg:grid-cols-3 mb-4">
        <Card className="p-4 lg:col-span-2">
          <p className="text-xs uppercase text-muted-foreground mb-1">Customer</p>
          <p className="font-semibold">{s.customer?.name ?? "Walk-in Customer"}</p>
          {s.customer?.email && <p className="text-sm text-muted-foreground">{s.customer.email}</p>}
          {s.customer?.phone && <p className="text-sm num">{s.customer.phone}</p>}
          {s.customer?.address && <p className="text-sm text-muted-foreground">{s.customer.address}</p>}
        </Card>
        <Card className="p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span className="num">{fmtMoney(s.subtotal)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span className="num">{fmtMoney(s.tax)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span className="num">- {fmtMoney(s.discount)}</span></div>
          <div className="flex justify-between font-semibold border-t pt-2 text-base"><span>Total</span><span className="num">{fmtMoney(s.total)}</span></div>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">GST</TableHead><TableHead className="text-right">Tax</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
          <TableBody>
            {data.items.map((it: any) => (
              <TableRow key={it.id}>
                <TableCell><div className="font-medium">{it.product?.name}</div><div className="text-xs text-muted-foreground num">{it.product?.sku}</div></TableCell>
                <TableCell className="text-right num">{it.quantity}</TableCell>
                <TableCell className="text-right num">{fmtMoney(it.unit_price)}</TableCell>
                <TableCell className="text-right num">{it.gst_rate}%</TableCell>
                <TableCell className="text-right num">{fmtMoney(it.tax_amount)}</TableCell>
                <TableCell className="text-right num">{fmtMoney(it.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {s.notes && <Card className="mt-4 p-4"><p className="text-xs uppercase text-muted-foreground mb-1">Notes</p><p className="text-sm">{s.notes}</p></Card>}
    </div>
  );
}
