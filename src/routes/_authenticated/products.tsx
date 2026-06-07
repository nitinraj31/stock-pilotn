import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, Edit, Trash2, Image as ImgIcon, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtMoney } from "@/lib/format";
import { useCurrentUser } from "@/lib/auth";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/products")({ component: ProductsPage });

function ProductsPage() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", search, categoryFilter],
    queryFn: async () => {
      let q = supabase.from("products").select("*, category:categories(name)").order("name");
      if (search) q = q.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`);
      if (categoryFilter !== "all") q = q.eq("category_id", categoryFilter);
      const { data } = await q;
      return data ?? [];
    },
  });

  const signedUrls = useQuery({
    queryKey: ["product-signed", (products ?? []).map((p) => p.image_url).join(",")],
    queryFn: async () => {
      const map: Record<string, string> = {};
      for (const p of products ?? []) {
        if (p.image_url) {
          const { data } = await supabase.storage.from("product-images").createSignedUrl(p.image_url, 3600);
          if (data?.signedUrl) map[p.image_url] = data.signedUrl;
        }
      }
      return map;
    },
    enabled: !!products && products.length > 0,
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Product deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your catalog, stock and pricing"
        actions={
          user?.canManage && (
            <Button asChild><Link to="/products/new"><Plus className="size-4" /> Add Product</Link></Button>
          )
        }
      />

      <Card className="p-4 mb-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search by name, SKU or barcode..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="sm:w-56"><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(categories ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">Loading...</div>
        ) : (products?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Package className="size-10" />}
            title="No products yet"
            description="Add your first product to start tracking inventory."
            action={user?.canManage ? <Button asChild><Link to="/products/new">Add Product</Link></Button> : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU / Barcode</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Purchase</TableHead>
                <TableHead className="text-right">Selling</TableHead>
                <TableHead className="text-right">GST</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                {user?.canManage && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(products ?? []).map((p: any) => {
                const lowStock = p.quantity <= p.reorder_level;
                const out = p.quantity === 0;
                const imgSrc = p.image_url ? signedUrls.data?.[p.image_url] : null;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-md bg-muted grid place-items-center overflow-hidden">
                          {imgSrc ? <img src={imgSrc} alt="" className="size-full object-cover" /> : <ImgIcon className="size-4 text-muted-foreground" />}
                        </div>
                        <div>
                          <p className="font-medium">{p.name}</p>
                          {p.description && <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="num text-xs">
                      <div>{p.sku}</div>
                      {p.barcode && <div className="text-muted-foreground">{p.barcode}</div>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{p.category?.name ?? "—"}</Badge></TableCell>
                    <TableCell className="text-right num">{fmtMoney(p.purchase_price)}</TableCell>
                    <TableCell className="text-right num">{fmtMoney(p.selling_price)}</TableCell>
                    <TableCell className="text-right num">{p.gst_rate}%</TableCell>
                    <TableCell className="text-right">
                      <span className={`num inline-block rounded px-2 py-1 text-sm ${out ? "bg-destructive/15 text-destructive" : lowStock ? "bg-warning/20 text-warning-foreground" : "bg-success/15 text-success"}`}>
                        {p.quantity}
                      </span>
                    </TableCell>
                    {user?.canManage && (
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button asChild size="icon" variant="ghost"><Link to="/products/$id" params={{ id: p.id }}><Edit className="size-4" /></Link></Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Delete ${p.name}?`)) del.mutate(p.id); }}><Trash2 className="size-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
