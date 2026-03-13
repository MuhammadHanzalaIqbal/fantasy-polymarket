import { cn } from "./cn";
export function Badge({ children, className }: { children: string; className?: string }) {
  return (
    <span className={cn("rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold", className)}>
      {children}
    </span>
  );
}