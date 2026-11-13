import { cn } from "@/lib/utils";

/** shadcn-style loading skeleton. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-line", className)}
    />
  );
}
