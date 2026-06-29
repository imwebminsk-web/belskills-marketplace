"use client";

import { Button } from "@/components/ui/button";

type InvoicePrintButtonProps = {
  label?: string;
};

export function InvoicePrintButton({
  label = "Скачать счет",
}: InvoicePrintButtonProps) {
  return (
    <div className="no-print fixed right-6 bottom-6 z-50">
      <Button
        type="button"
        onClick={() => window.print()}
        className="bg-brand text-brand-foreground hover:bg-brand/90 shadow-lg"
      >
        {label}
      </Button>
    </div>
  );
}
