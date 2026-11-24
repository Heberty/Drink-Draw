import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const fieldStyles =
  "w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-50";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input data-slot="input" className={cn(fieldStyles, "h-10", className)} {...props} />;
}
