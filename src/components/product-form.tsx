import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

type Product = {
  id?: string;
  name?: string; sku?: string; barcode?: string | null; category_id?: string | null;
  purchase_price?: number; selling_price?: number; opening_stock?: number;
  reorder_level?: number; gst_rate?: number; description?: string | null; image_url?: string | null;
  quantity?: number;
};

export function ProductForm({ initial, onDone }: { initial?: Product; onDone: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Product>(initial ?? {
    name: "", sku: "", barcode: "", category_id: null,
    purchase_price: 0, selling_price: 0, opening_stock: 0, reorder_level: 5, gst_rate: 18,
    description: "", image_url: null,
  });
  const [uploading, setUploading] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });

  const { data: imgUrl } = useQuery({
    queryKey: ["signed-img", form.image_url],
    queryFn: async () => {
      if (!form.image_url) return null;
      const { data } = await supabase.storage.from("product-images").createSignedUrl(form.image_url, 3600);
      return data?.signedUrl ?? null;
    },
    enabled: !!form.image_url,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: form.name, sku: form.sku, barcode: form.barcode || null,
        category_id: form.category_id || null,
        purchase_price: Number(form.purchase_price ?? 0),
        selling_price: Number(form.selling_price ?? 0),
        reorder_level: Number(form.reorder_level ?? 0),
        gst_rate: Number(form.gst_rate ?? 0),
        description: form.description || null,
        image_url: form.image_url || null,
      };
      if (initial?.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        payload.opening_stock = Number(form.opening_stock ?? 0);
        payload.quantity = Number(form.opening_stock ?? 0);
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(initial ? "Product updated" : "Product created");
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function handleUpload(file: File) {
    setUploading(true);
    const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    setUploading(false);
    if (error) return toast.error(error.message);
    setForm((f) => ({ ...f, image_url: path }));
  }

  return (
    <Card className="p-6 max-w-3xl">
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="grid gap-5 md:grid-cols-2">
        <div className="space-y-1.5 md:col-span-2">
          <Label>Product name *</Label>
          <Input required value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>SKU *</Label>
          <Input required value={form.sku ?? ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Barcode</Label>
          <Input value={form.barcode ?? ""} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={form.category_id ?? "none"} onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? null : v })}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None —</SelectItem>
              {(categories ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>GST rate (%)</Label>
          <Input type="number" step="0.01" value={form.gst_rate ?? 0} onChange={(e) => setForm({ ...form, gst_rate: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>Purchase price (₹)</Label>
          <Input type="number" step="0.01" value={form.purchase_price ?? 0} onChange={(e) => setForm({ ...form, purchase_price: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>Selling price (₹)</Label>
          <Input type="number" step="0.01" value={form.selling_price ?? 0} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })} />
        </div>
        {!initial && (
          <div className="space-y-1.5">
            <Label>Opening stock</Label>
            <Input type="number" value={form.opening_stock ?? 0} onChange={(e) => setForm({ ...form, opening_stock: Number(e.target.value) })} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Reorder level</Label>
          <Input type="number" value={form.reorder_level ?? 0} onChange={(e) => setForm({ ...form, reorder_level: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Description</Label>
          <Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Product image</Label>
          <div className="flex items-center gap-4">
            <div className="size-24 rounded-md border bg-muted grid place-items-center overflow-hidden">
              {imgUrl ? <img src={imgUrl} alt="" className="size-full object-cover" /> : <Upload className="size-5 text-muted-foreground" />}
            </div>
            <div className="flex flex-col gap-2">
              <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 text-sm hover:bg-accent">
                <Upload className="size-4" /> {form.image_url ? "Replace" : "Upload"} image
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
              </label>
              {form.image_url && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, image_url: null })}>
                  <X className="size-4" /> Remove
                </Button>
              )}
              {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
            </div>
          </div>
        </div>
        <div className="md:col-span-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
          <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save Product"}</Button>
        </div>
      </form>
    </Card>
  );
}
