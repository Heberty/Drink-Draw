import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { fieldStyles } from "@/components/ui/input";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldStyles, "min-h-16 resize-y py-2 leading-snug", className)}
      {...props}
    />
  );
}
