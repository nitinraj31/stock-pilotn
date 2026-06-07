import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/lib/auth";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw redirect({ to: "/dashboard" });
  },
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();

  const { data: users } = useQuery({
    queryKey: ["users-roles"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const rMap = new Map<string, string[]>();
      (roles ?? []).forEach((r) => { const a = rMap.get(r.user_id) ?? []; a.push(r.role); rMap.set(r.user_id, a); });
      return (profiles ?? []).map((p) => ({ ...p, roles: rMap.get(p.id) ?? [] }));
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: "admin" | "manager" | "staff" }) => {
      await supabase.from("user_roles").delete().eq("user_id", user_id);
      const { error } = await supabase.from("user_roles").insert({ user_id, role });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users-roles"] }); toast.success("Role updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Settings" description="Manage users and roles (admin only)" />
      <Card>
        <div className="px-4 py-3 border-b font-medium text-sm">Team Members</div>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Joined</TableHead><TableHead>Role</TableHead></TableRow></TableHeader>
          <TableBody>
            {(users ?? []).map((u) => {
              const currentRole = (u.roles[0] ?? "staff") as "admin" | "manager" | "staff";
              const isMe = u.id === me?.id;
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name ?? "—"} {isMe && <Badge variant="outline" className="ml-1">You</Badge>}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="text-sm">{fmtDate(u.created_at)}</TableCell>
                  <TableCell>
                    <Select value={currentRole} onValueChange={(v) => setRole.mutate({ user_id: u.id, role: v as any })} disabled={isMe}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Card className="mt-6 p-5">
        <h3 className="font-semibold mb-2">Role permissions</h3>
        <ul className="text-sm space-y-1.5 text-muted-foreground">
          <li><Badge>Admin</Badge> Full access including team management.</li>
          <li><Badge variant="secondary">Manager</Badge> Manage products, categories, suppliers, customers and purchases. Can create and edit sales.</li>
          <li><Badge variant="outline">Staff</Badge> View everything and create sales invoices.</li>
        </ul>
      </Card>
    </div>
  );
}
