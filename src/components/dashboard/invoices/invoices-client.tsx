"use client";

import Link from "next/link";

import type { InvoiceRow } from "@/app/dashboard/invoices/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPriceByn } from "@/lib/utils/pricing";
import { formatInvoiceNumber } from "@/lib/utils/invoice-format";
import { cn } from "@/lib/utils";

type InvoicesClientProps = {
  invoices: InvoiceRow[];
};

function formatInvoiceDate(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

function formatPeriodLabel(months: number): string {
  if (months === 1) {
    return "1 мес";
  }
  return `${months} мес`;
}

function formatDescription(invoice: InvoiceRow): string {
  return `Оплата тарифа ${invoice.tierName} (${formatPeriodLabel(invoice.periodMonths)})`;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "paid":
      return (
        <Badge
          variant="outline"
          className="border-brand/40 bg-brand/10 text-brand"
        >
          Оплачено
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          Отменено
        </Badge>
      );
    case "pending":
    default:
      return (
        <Badge
          variant="outline"
          className="border-amber-500/40 bg-amber-500/15 text-amber-950 dark:text-amber-100"
        >
          Ожидает оплаты
        </Badge>
      );
  }
}

export function InvoicesClient({ invoices }: InvoicesClientProps) {
  return (
    <Tabs defaultValue="invoices" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2 rounded-lg bg-muted p-1">
        <TabsTrigger
          value="invoices"
          className="rounded-md transition-all data-[state=active]:bg-brand data-[state=active]:text-white data-active:bg-brand data-active:text-white"
        >
          Счета
        </TabsTrigger>
        <TabsTrigger
          value="acts"
          className="rounded-md transition-all data-[state=active]:bg-brand data-[state=active]:text-white data-active:bg-brand data-active:text-white"
        >
          Акты
        </TabsTrigger>
      </TabsList>

      <TabsContent value="invoices" className="mt-6">
        {invoices.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed py-16 text-center text-sm">
            У вас пока нет выставленных счетов.
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>№ Счета</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действие</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatInvoiceDate(invoice.createdAt)}
                    </TableCell>
                    <TableCell className="font-mono text-sm whitespace-nowrap">
                      {formatInvoiceNumber(invoice.invoiceNumber)}
                    </TableCell>
                    <TableCell className="max-w-[16rem] truncate sm:max-w-none">
                      {formatDescription(invoice)}
                    </TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">
                      {formatPriceByn(invoice.amountKopecks)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        asChild
                        variant="secondary"
                        size="sm"
                        className={cn("shrink-0")}
                      >
                        <Link href={`/dashboard/invoices/${invoice.id}`}>
                          Скачать счёт
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="acts" className="mt-6">
        <div className="text-muted-foreground rounded-lg border border-dashed py-16 text-center text-sm">
          Здесь пока пусто
        </div>
      </TabsContent>
    </Tabs>
  );
}
