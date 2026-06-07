import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Edit, Trash2, FolderTree } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCurrentUser } from "@/lib/auth";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/categories")({ component: CategoriesPage });

function CategoriesPage() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["categories-with-counts"],
    queryFn: async () => {
      const { data: cats } = await supabase.from("categories").select("*").order("name");
      const { data: prods } = await supabase.from("products").select("category_id");
      const counts = new Map<string, number>();
      (prods ?? []).forEach((p) => { if (p.category_id) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1); });
      return (cats ?? []).map((c) => ({ ...c, productCount: counts.get(c.id) ?? 0 }));
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: name.trim(), description: desc.trim() || null };
      if (editing) {
        const { error } = await supabase.from("categories").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories-with-counts"] }); qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Saved"); setOpen(false); setEditing(null); setName(""); setDesc(""); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("categories").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories-with-counts"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  function openNew() { setEditing(null); setName(""); setDesc(""); setOpen(true); }
  function openEdit(c: any) { setEditing(c); setName(c.name); setDesc(c.description ?? ""); setOpen(true); }

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organize your products into categories"
        actions={user?.canManage && <Button onClick={openNew}><Plus className="size-4" /> Add Category</Button>}
      />
      <Card>
        {isLoading ? <div className="p-10 text-center text-muted-foreground">Loading...</div>
          : (data?.length ?? 0) === 0 ? (
            <EmptyState icon={<FolderTree className="size-10" />} title="No categories" description="Create categories to group products."
              action={user?.canManage && <Button onClick={openNew}>Add Category</Button>} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead><TableHead>Description</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  {user?.canManage && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.description ?? "—"}</TableCell>
                    <TableCell className="text-right num">{c.productCount}</TableCell>
                    {user?.canManage && (
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Edit className="size-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete category?")) del.mutate(c.id); }}><Trash2 className="size-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
