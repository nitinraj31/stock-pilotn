import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, ShoppingCart, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtMoney, fmtDate } from "@/lib/format";
import { useCurrentUser } from "@/lib/auth";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/purchases")({ component: PurchasesPage });

function PurchasesPage() {
  const { data: user } = useCurrentUser();
  const { data, isLoading } = useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const { data: purchases } = await supabase.from("purchases").select("*").order("created_at", { ascending: false });
      const { data: names } = await supabase.rpc("list_supplier_options");
      const nameMap = new Map((names ?? []).map((s) => [s.id, s.name]));
      return (purchases ?? []).map((p: any) => ({ ...p, supplierName: p.supplier_id ? nameMap.get(p.supplier_id) ?? "—" : "—" }));
    },
  });

  return (
    <div>
      <PageHeader title="Purchases" description="Track purchase orders and supplier invoices"
        actions={user?.canManage && <Button asChild><Link to="/purchases/new"><Plus className="size-4" /> New Purchase</Link></Button>} />
      <Card>
        {isLoading ? <div className="p-10 text-center text-muted-foreground">Loading...</div>
          : (data?.length ?? 0) === 0 ? <EmptyState icon={<ShoppingCart className="size-10" />} title="No purchases" description="Create a purchase order to add stock from a supplier." action={user?.canManage && <Button asChild><Link to="/purchases/new">New Purchase</Link></Button>} />
          : (
            <Table>
              <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Supplier</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead className="text-right">Tax</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {(data ?? []).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell><Link to="/purchases/$id" params={{ id: p.id }} className="text-primary hover:underline num">{p.invoice_no}</Link></TableCell>
                    <TableCell>{fmtDate(p.created_at)}</TableCell>
                    <TableCell>{p.supplierName}</TableCell>
                    <TableCell className="text-right num">{fmtMoney(p.subtotal)}</TableCell>
                    <TableCell className="text-right num">{fmtMoney(p.tax)}</TableCell>
                    <TableCell className="text-right num font-medium">{fmtMoney(p.total)}</TableCell>
                    <TableCell><Button asChild size="icon" variant="ghost"><Link to="/purchases/$id" params={{ id: p.id }}><ExternalLink className="size-4" /></Link></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </Card>
    </div>
  );
}
