import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Edit, Trash2, Users, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser } from "@/lib/auth";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/customers")({ component: CustomersPage });

function CustomersPage() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => (await supabase.from("customers").select("*").order("name")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, email: form.email || null, phone: form.phone || null, address: form.address || null };
      if (edit) { const { error } = await supabase.from("customers").update(payload).eq("id", edit.id); if (error) throw error; }
      else { const { error } = await supabase.from("customers").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); toast.success("Saved"); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("customers").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  function openNew() { setEdit(null); setForm({ name: "", email: "", phone: "", address: "" }); setOpen(true); }
  function openEdit(c: any) { setEdit(c); setForm({ name: c.name, email: c.email ?? "", phone: c.phone ?? "", address: c.address ?? "" }); setOpen(true); }

  return (
    <div>
      <PageHeader title="Customers" description="Manage customers and view purchase history" actions={user?.canManage && <Button onClick={openNew}><Plus className="size-4" /> Add Customer</Button>} />
      <Card>
        {isLoading ? <div className="p-10 text-center text-muted-foreground">Loading...</div>
          : (data?.length ?? 0) === 0 ? <EmptyState icon={<Users className="size-10" />} title="No customers" action={user?.canManage && <Button onClick={openNew}>Add Customer</Button>} />
          : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Address</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {(data ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.email ?? "—"}</TableCell>
                    <TableCell className="num text-sm">{c.phone ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.address ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button asChild size="icon" variant="ghost"><Link to="/customers/$id" params={{ id: c.id }}><ExternalLink className="size-4" /></Link></Button>
                        {user?.canManage && <>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Edit className="size-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete customer?")) del.mutate(c.id); }}><Trash2 className="size-4 text-destructive" /></Button>
                        </>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit ? "Edit Customer" : "New Customer"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name.trim() || save.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
