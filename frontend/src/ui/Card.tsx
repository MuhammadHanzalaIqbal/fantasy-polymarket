import type { ReactNode } from "react";
import { cn } from "./cn";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-zinc-950/30 p-4", className)}>
      {children}
    </div>
  );
}