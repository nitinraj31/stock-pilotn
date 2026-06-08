
CREATE OR REPLACE FUNCTION public.list_customer_options()
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name FROM public.customers c ORDER BY c.name;
$$;

CREATE OR REPLACE FUNCTION public.list_supplier_options()
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name FROM public.suppliers s ORDER BY s.name;
$$;

REVOKE EXECUTE ON FUNCTION public.list_customer_options() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_supplier_options() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_customer_options() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_supplier_options() TO authenticated;
