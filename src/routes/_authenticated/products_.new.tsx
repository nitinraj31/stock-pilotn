import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ProductForm } from "@/components/product-form";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/products_/new")({ component: NewProduct });

function NewProduct() {
  const nav = useNavigate();
  return (
    <div>
      <PageHeader title="Add Product" description="Create a new product in your catalog" />
      <ProductForm onDone={() => nav({ to: "/products" })} />
    </div>
  );
}
