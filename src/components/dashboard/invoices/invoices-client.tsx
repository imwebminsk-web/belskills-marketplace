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

/** Active tab = tariff-card «Улучшить»: h-11 text-base font-semibold bg-brand text-brand-foreground hover:bg-brand/90 */
const invoiceTabTriggerClass = cn(
  "inline-flex flex-1 items-center justify-center rounded-lg border-none shadow-none transition-all",
  "h-11 text-base font-semibold",
  "outline-none ring-0 focus-visible:ring-0 focus-visible:outline-none",
  "before:hidden before:content-none after:hidden after:content-none",
  "min-h-0 px-4 py-0 text-muted-foreground hover:text-foreground",
  "bg-transparent hover:bg-muted",
  "group-data-[variant=default]/tabs-list:data-active:!shadow-none group-data-[variant=line]/tabs-list:data-active:!shadow-none",
  "data-[state=active]:border-none data-[state=active]:shadow-none",
  "data-[state=active]:!bg-brand data-[state=active]:!text-brand-foreground data-[state=active]:hover:!bg-brand/90",
  "data-active:!bg-brand data-active:!text-brand-foreground data-active:hover:!bg-brand/90",
);

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
  if (invoice.description?.trim()) {
    return invoice.description.trim();
  }
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
  const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");

  return (
    <Tabs defaultValue="invoices" className="w-full">
      <TabsList
        variant="line"
        className="flex h-auto w-full max-w-md gap-2 rounded-none p-0"
      >
        <TabsTrigger value="invoices" className={invoiceTabTriggerClass}>
          Счета
        </TabsTrigger>
        <TabsTrigger value="acts" className={invoiceTabTriggerClass}>
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
        {paidInvoices.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed py-16 text-center text-sm">
            У вас пока нет оплаченных счетов. Акты формируются только после
            оплаты.
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>№ Акта</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действие</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paidInvoices.map((invoice) => (
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
                        <Link
                          href={`/dashboard/acts/${invoice.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Скачать акт
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
    </Tabs>
  );
}
