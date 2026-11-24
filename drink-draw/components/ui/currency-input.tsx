"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { amountFromDigits, formatCurrencyInput, parsePrice, priceFromCents } from "@/lib/compare";

type Props = Omit<ComponentProps<typeof Input>, "value" | "onChange" | "onPaste" | "type" | "inputMode"> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function CurrencyInput({ value, onValueChange, ...props }: Props) {
  const cents = parsePrice(value);
  const displayed = cents === null ? value : formatCurrencyInput(cents);

  return <Input
    {...props}
    type="text"
    inputMode="decimal"
    placeholder="R$ 0,00"
    value={displayed}
    onChange={(event) => {
      const text = event.currentTarget.value;
      const next = amountFromDigits(text);
      if (next === null) return;
      onValueChange(cents === 0 && next === "0,00" && text.length < displayed.length ? "" : next);
    }}
    onPaste={(event) => {
      const pasted = event.clipboardData.getData("text").trim();
      if (!pasted) return;
      event.preventDefault();
      const next = parsePrice(pasted);
      if (next !== null) onValueChange(priceFromCents(next));
    }}
  />;
}
