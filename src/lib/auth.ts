import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "staff";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const roleSet = new Set<AppRole>((roles ?? []).map((r) => r.role as AppRole));
      return {
        id: user.id,
        email: user.email ?? profile?.email ?? "",
        name: profile?.full_name ?? user.email ?? "",
        roles: Array.from(roleSet),
        isAdmin: roleSet.has("admin"),
        isManager: roleSet.has("manager"),
        canManage: roleSet.has("admin") || roleSet.has("manager"),
      };
    },
  });
}
