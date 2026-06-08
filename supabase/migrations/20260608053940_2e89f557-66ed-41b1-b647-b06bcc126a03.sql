CREATE OR REPLACE FUNCTION public.get_customer_name(_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT name FROM public.customers WHERE id = _id;
$$;

CREATE OR REPLACE FUNCTION public.get_supplier_name(_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT name FROM public.suppliers WHERE id = _id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_customer_name(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_customer_name(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_name(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_supplier_name(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_supplier_name(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_supplier_name(uuid) TO authenticated;
