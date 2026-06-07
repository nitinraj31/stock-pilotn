import { ReactNode, useState } from "react";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, FolderTree, Truck, Users, ShoppingCart,
  ReceiptText, BarChart3, Settings, LogOut, Menu, X, Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean };
const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: Package },
  { to: "/categories", label: "Categories", icon: FolderTree },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/purchases", label: "Purchases", icon: ShoppingCart },
  { to: "/sales", label: "Sales", icon: ReceiptText },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings, adminOnly: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data: user } = useCurrentUser();
  const router = useRouter();
  const qc = useQueryClient();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform lg:static lg:flex lg:translate-x-0",
          open ? "flex translate-x-0" : "hidden lg:flex -translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-5 border-b border-sidebar-border">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid place-items-center size-9 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Boxes className="size-5" />
            </span>
            <span className="text-base">StockPilot</span>
          </Link>
          <button className="lg:hidden text-sidebar-foreground/70" onClick={() => setOpen(false)}>
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV.filter((n) => !n.adminOnly || user?.isAdmin).map((n) => {
            const active = loc.pathname === n.to || loc.pathname.startsWith(n.to + "/");
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3 text-xs">
            <p className="font-medium truncate">{user?.name}</p>
            <p className="text-sidebar-foreground/60 truncate">{user?.email}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {(user?.roles ?? []).map((r) => (
                <span key={r} className="rounded bg-sidebar-accent px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-sidebar-accent-foreground">{r}</span>
              ))}
            </div>
          </div>
          <Button variant="secondary" size="sm" className="w-full" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card/80 backdrop-blur px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} className="text-foreground">
            <Menu className="size-5" />
          </button>
          <span className="font-semibold">StockPilot</span>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
