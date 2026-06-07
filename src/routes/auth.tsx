import { createFileRoute, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Boxes } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  function goAfterAuth() {
    nav({ to: (search.redirect as any) || "/dashboard", replace: true });
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    goAfterAuth();
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — check your email to confirm.");
    setTab("signin");
  }

  async function google() {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (res.error) toast.error((res.error as Error).message ?? "Google sign-in failed");
    if (res.redirected) return;
    goAfterAuth();
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-background to-accent/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-xl font-semibold tracking-tight">
          <span className="grid place-items-center size-10 rounded-lg bg-primary text-primary-foreground">
            <Boxes className="size-5" />
          </span>
          StockPilot
        </div>
        <Card className="p-6 shadow-elegant">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-5">
              <form onSubmit={signIn} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup" className="mt-5">
              <form onSubmit={signUp} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Full name</Label>
                  <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating..." : "Create account"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  The first user to sign up becomes an admin automatically.
                </p>
              </form>
            </TabsContent>
          </Tabs>
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={google}>
            <svg className="size-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.2 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2c-.4.4 6.6-4.8 6.6-14.2 0-1.2-.1-2.3-.4-3.5z"/></svg>
            Continue with Google
          </Button>
        </Card>
      </div>
    </div>
  );
}
