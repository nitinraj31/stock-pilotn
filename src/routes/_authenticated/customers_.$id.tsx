import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/customers_/$id")({ component: CustomerDetail });

function CustomerDetail() {
  const { id } = useParams({ from: "/_authenticated/customers_/$id" });
  const { data } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const { data: c } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
      const { data: sales } = await supabase.from("sales").select("*").eq("customer_id", id).order("created_at", { ascending: false });
      return { customer: c, sales: sales ?? [] };
    },
  });
  const total = (data?.sales ?? []).reduce((s, p) => s + Number(p.total ?? 0), 0);

  return (
    <div>
      <PageHeader title={data?.customer?.name ?? "Customer"} description={data?.customer?.email ?? ""}
        actions={<Button asChild variant="outline"><Link to="/customers"><ArrowLeft className="size-4" /> Back</Link></Button>} />
      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium num">{data?.customer?.phone ?? "—"}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Orders</p><p className="font-medium num">{data?.sales.length ?? 0}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total spent</p><p className="font-medium num">{fmtMoney(total)}</p></Card>
      </div>
      <Card>
        <div className="px-4 py-3 border-b font-medium text-sm">Purchase History</div>
        {(data?.sales.length ?? 0) === 0 ? <div className="p-8 text-center text-muted-foreground">No sales yet.</div>
          : (
            <Table>
              <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead className="text-right">Tax</TableHead><TableHead className="text-right">Discount</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {(data?.sales ?? []).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell><Link to="/sales/$id" params={{ id: s.id }} className="text-primary hover:underline num">{s.invoice_no}</Link></TableCell>
                    <TableCell>{fmtDate(s.created_at)}</TableCell>
                    <TableCell className="text-right num">{fmtMoney(s.subtotal)}</TableCell>
                    <TableCell className="text-right num">{fmtMoney(s.tax)}</TableCell>
                    <TableCell className="text-right num">{fmtMoney(s.discount)}</TableCell>
                    <TableCell className="text-right num font-medium">{fmtMoney(s.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </Card>
    </div>
  );
}
