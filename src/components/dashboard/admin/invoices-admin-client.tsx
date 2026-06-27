"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExternalLinkIcon, MoreHorizontalIcon } from "lucide-react";

import {
  approveBillingRequest,
  cancelBillingRequest,
} from "@/app/actions/billing-admin-actions";
import type { AdminBillingRequestRow } from "@/app/dashboard/admin/invoices/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPriceByn } from "@/lib/utils/pricing";
import { formatInvoiceNumber } from "@/lib/utils/invoice-format";
import { cn } from "@/lib/utils";

type InvoicesAdminClientProps = {
  initialRequests: AdminBillingRequestRow[];
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatTierLabel(row: AdminBillingRequestRow): string {
  const months =
    row.periodMonths === 1 ? "1 мес." : `${row.periodMonths} мес.`;
  return `${row.tierName} · ${months}`;
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

export function InvoicesAdminClient({
  initialRequests,
}: InvoicesAdminClientProps) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApprove(requestId: string) {
    setActionError(null);
    setPendingId(requestId);

    startTransition(async () => {
      const result = await approveBillingRequest(requestId);

      if (!result.success) {
        setActionError(result.error);
        setPendingId(null);
        return;
      }

      setRequests((prev) =>
        prev.map((row) =>
          row.id === requestId ? { ...row, status: "paid" } : row,
        ),
      );
      setPendingId(null);
      router.refresh();
    });
  }

  function handleCancel(requestId: string) {
    setActionError(null);
    setPendingId(requestId);

    startTransition(async () => {
      const result = await cancelBillingRequest(requestId);

      if (!result.success) {
        setActionError(result.error);
        setPendingId(null);
        return;
      }

      setRequests((prev) =>
        prev.map((row) =>
          row.id === requestId ? { ...row, status: "cancelled" } : row,
        ),
      );
      setPendingId(null);
      router.refresh();
    });
  }

  const rowBusy = (id: string) => isPending && pendingId === id;

  return (
    <div className="space-y-4">
      {actionError ? (
        <p className="text-destructive text-sm" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>№ Счета</TableHead>
              <TableHead>Компания</TableHead>
              <TableHead>Тариф</TableHead>
              <TableHead className="text-right">Сумма</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground h-24 text-center text-sm"
                >
                  Заявок на оплату пока нет.
                </TableCell>
              </TableRow>
            ) : (
              requests.map((row) => {
                const busy = rowBusy(row.id);

                return (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(row.createdAt)}
                    </TableCell>
                    <TableCell className="font-mono text-sm whitespace-nowrap">
                      {formatInvoiceNumber(row.invoiceNumber)}
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate">
                      {row.companyName?.trim() || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatTierLabel(row)}
                    </TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">
                      {formatPriceByn(row.amountKopecks)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {row.status === "pending" ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              disabled={busy}
                              aria-label="Действия со счётом"
                            >
                              <MoreHorizontalIcon className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem
                              className={cn(
                                "text-brand focus:text-brand cursor-pointer",
                              )}
                              disabled={busy}
                              onClick={() => handleApprove(row.id)}
                            >
                              {busy ? "Обработка…" : "✅ Подтвердить оплату"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive cursor-pointer"
                              disabled={busy}
                              onClick={() => handleCancel(row.id)}
                            >
                              ❌ Отменить
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <a
                                href={`/dashboard/invoices/${row.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex cursor-pointer items-center gap-2"
                              >
                                📄 Посмотреть счёт
                                <ExternalLinkIcon className="size-3.5 opacity-60" />
                              </a>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a
                            href={`/dashboard/invoices/${row.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            📄 Счёт
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
