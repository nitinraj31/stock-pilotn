import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/suppliers_/$id")({ component: SupplierDetail });

function SupplierDetail() {
  const { id } = useParams({ from: "/_authenticated/suppliers_/$id" });
  const { data } = useQuery({
    queryKey: ["supplier", id],
    queryFn: async () => {
      const { data: s } = await supabase.from("suppliers").select("*").eq("id", id).maybeSingle();
      const { data: purchases } = await supabase.from("purchases").select("*").eq("supplier_id", id).order("created_at", { ascending: false });
      return { supplier: s, purchases: purchases ?? [] };
    },
  });
  const total = (data?.purchases ?? []).reduce((s, p) => s + Number(p.total ?? 0), 0);

  return (
    <div>
      <PageHeader title={data?.supplier?.name ?? "Supplier"} description={data?.supplier?.email ?? ""}
        actions={<Button asChild variant="outline"><Link to="/suppliers"><ArrowLeft className="size-4" /> Back</Link></Button>} />
      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium num">{data?.supplier?.phone ?? "—"}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">GSTIN</p><p className="font-medium num">{data?.supplier?.gst_number ?? "—"}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total purchased</p><p className="font-medium num">{fmtMoney(total)}</p></Card>
      </div>
      <Card>
        <div className="px-4 py-3 border-b font-medium text-sm">Purchase History</div>
        {(data?.purchases.length ?? 0) === 0 ? <div className="p-8 text-center text-muted-foreground">No purchases yet.</div>
          : (
            <Table>
              <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead className="text-right">Tax</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {(data?.purchases ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell><Link to="/purchases/$id" params={{ id: p.id }} className="text-primary hover:underline num">{p.invoice_no}</Link></TableCell>
                    <TableCell>{fmtDate(p.created_at)}</TableCell>
                    <TableCell className="text-right num">{fmtMoney(p.subtotal)}</TableCell>
                    <TableCell className="text-right num">{fmtMoney(p.tax)}</TableCell>
                    <TableCell className="text-right num font-medium">{fmtMoney(p.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </Card>
    </div>
  );
}
