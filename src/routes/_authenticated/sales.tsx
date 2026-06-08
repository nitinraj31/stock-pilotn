import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, ReceiptText, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtMoney, fmtDate } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/sales")({ component: SalesPage });

function SalesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["sales-list"],
    queryFn: async () => {
      const { data: sales } = await supabase.from("sales").select("*").order("created_at", { ascending: false });
      const { data: names } = await supabase.rpc("list_customer_options");
      const nameMap = new Map((names ?? []).map((c) => [c.id, c.name]));
      return (sales ?? []).map((s: any) => ({ ...s, customerName: s.customer_id ? nameMap.get(s.customer_id) ?? "Walk-in" : "Walk-in" }));
    },
  });

  return (
    <div>
      <PageHeader title="Sales" description="Sales invoices and history"
        actions={<Button asChild><Link to="/sales/new"><Plus className="size-4" /> New Sale</Link></Button>} />
      <Card>
        {isLoading ? <div className="p-10 text-center text-muted-foreground">Loading...</div>
          : (data?.length ?? 0) === 0 ? <EmptyState icon={<ReceiptText className="size-10" />} title="No sales" description="Create your first sale invoice." action={<Button asChild><Link to="/sales/new">New Sale</Link></Button>} />
          : (
            <Table>
              <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead className="text-right">Tax</TableHead><TableHead className="text-right">Discount</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {(data ?? []).map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell><Link to="/sales/$id" params={{ id: s.id }} className="text-primary hover:underline num">{s.invoice_no}</Link></TableCell>
                    <TableCell>{fmtDate(s.created_at)}</TableCell>
                    <TableCell>{s.customerName}</TableCell>
                    <TableCell className="text-right num">{fmtMoney(s.subtotal)}</TableCell>
                    <TableCell className="text-right num">{fmtMoney(s.tax)}</TableCell>
                    <TableCell className="text-right num">{fmtMoney(s.discount)}</TableCell>
                    <TableCell className="text-right num font-medium">{fmtMoney(s.total)}</TableCell>
                    <TableCell><Button asChild size="icon" variant="ghost"><Link to="/sales/$id" params={{ id: s.id }}><ExternalLink className="size-4" /></Link></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </Card>
    </div>
  );
}
