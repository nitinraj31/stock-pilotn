import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductForm } from "@/components/product-form";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/products_/$id")({ component: EditProduct });

function EditProduct() {
  const { id } = useParams({ from: "/_authenticated/products_/$id" });
  const nav = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => (await supabase.from("products").select("*").eq("id", id).maybeSingle()).data,
  });

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!data) return <div className="p-6">Product not found.</div>;

  return (
    <div>
      <PageHeader title="Edit Product" description={data.sku} />
      <ProductForm initial={data} onDone={() => nav({ to: "/products" })} />
    </div>
  );
}
