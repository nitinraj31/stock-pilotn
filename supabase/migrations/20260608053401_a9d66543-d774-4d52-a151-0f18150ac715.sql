
-- Customers: admin/manager only
DROP POLICY IF EXISTS customers_select ON public.customers;
CREATE POLICY customers_select ON public.customers FOR SELECT TO authenticated
USING (public.is_admin_or_manager(auth.uid()));

-- Suppliers: admin/manager only
DROP POLICY IF EXISTS suppliers_select ON public.suppliers;
CREATE POLICY suppliers_select ON public.suppliers FOR SELECT TO authenticated
USING (public.is_admin_or_manager(auth.uid()));

-- Profiles: self or admin
DROP POLICY IF EXISTS profiles_select_auth ON public.profiles;
CREATE POLICY profiles_select_self_or_admin ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- user_roles: self or admin
DROP POLICY IF EXISTS user_roles_select_auth ON public.user_roles;
CREATE POLICY user_roles_select_self_or_admin ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- Storage: restrict write ops on product-images to admin/manager
DROP POLICY IF EXISTS product_images_insert ON storage.objects;
DROP POLICY IF EXISTS product_images_update ON storage.objects;
DROP POLICY IF EXISTS product_images_delete ON storage.objects;

CREATE POLICY product_images_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.is_admin_or_manager(auth.uid()));

CREATE POLICY product_images_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND public.is_admin_or_manager(auth.uid()))
WITH CHECK (bucket_id = 'product-images' AND public.is_admin_or_manager(auth.uid()));

CREATE POLICY product_images_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND public.is_admin_or_manager(auth.uid()));

-- Revoke EXECUTE on SECURITY DEFINER helpers from app roles.
-- These are intended to be called only from RLS policy expressions, which
-- still work because policies execute with the policy owner's privileges.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_manager(uuid) FROM PUBLIC, anon, authenticated;
