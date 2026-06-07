import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Edit, Trash2, Truck, ExternalLink } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/suppliers")({ component: SuppliersPage });

function SuppliersPage() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", gst_number: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => (await supabase.from("suppliers").select("*").order("name")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, email: form.email || null, phone: form.phone || null, address: form.address || null, gst_number: form.gst_number || null };
      if (edit) { const { error } = await supabase.from("suppliers").update(payload).eq("id", edit.id); if (error) throw error; }
      else { const { error } = await supabase.from("suppliers").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); toast.success("Saved"); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("suppliers").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  function openNew() { setEdit(null); setForm({ name: "", email: "", phone: "", address: "", gst_number: "" }); setOpen(true); }
  function openEdit(s: any) { setEdit(s); setForm({ name: s.name, email: s.email ?? "", phone: s.phone ?? "", address: s.address ?? "", gst_number: s.gst_number ?? "" }); setOpen(true); }

  return (
    <div>
      <PageHeader title="Suppliers" description="Manage vendor contacts and purchase history" actions={user?.canManage && <Button onClick={openNew}><Plus className="size-4" /> Add Supplier</Button>} />
      <Card>
        {isLoading ? <div className="p-10 text-center text-muted-foreground">Loading...</div>
          : (data?.length ?? 0) === 0 ? <EmptyState icon={<Truck className="size-10" />} title="No suppliers" action={user?.canManage && <Button onClick={openNew}>Add Supplier</Button>} />
          : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>GSTIN</TableHead><TableHead>Address</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {(data ?? []).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm">
                      {s.email && <div className="text-muted-foreground">{s.email}</div>}
                      {s.phone && <div className="num">{s.phone}</div>}
                    </TableCell>
                    <TableCell className="num text-xs">{s.gst_number ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{s.address ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button asChild size="icon" variant="ghost"><Link to="/suppliers/$id" params={{ id: s.id }}><ExternalLink className="size-4" /></Link></Button>
                        {user?.canManage && <>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Edit className="size-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete supplier?")) del.mutate(s.id); }}><Trash2 className="size-4 text-destructive" /></Button>
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
          <DialogHeader><DialogTitle>{edit ? "Edit Supplier" : "New Supplier"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>GSTIN</Label><Input value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} /></div>
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
