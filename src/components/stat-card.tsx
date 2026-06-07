import { ReactNode } from "react";
import { Card } from "./ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, icon, tone = "primary", hint,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: "primary" | "success" | "warning" | "destructive" | "muted";
  hint?: string;
}) {
  const toneClasses: Record<string, string> = {
    primary: "bg-accent text-accent-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/15 text-destructive",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <Card className="p-5 shadow-elegant">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold num truncate">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("grid place-items-center size-10 rounded-lg shrink-0", toneClasses[tone])}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
