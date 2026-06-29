"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Check,
  ExternalLinkIcon,
  FileText,
  MoreHorizontalIcon,
  X,
} from "lucide-react";

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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type InvoicesAdminClientProps = {
  initialRequests: AdminBillingRequestRow[];
};

type StatusFilter = "all" | "pending" | "paid" | "cancelled";

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tariffFilter, setTariffFilter] = useState("all");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const tariffOptions = useMemo(() => {
    const tiers = new Map<string, string>();
    for (const row of requests) {
      tiers.set(row.tierId, row.tierName);
    }
    return Array.from(tiers.entries()).sort(([, a], [, b]) =>
      a.localeCompare(b, "ru"),
    );
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...requests]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .filter((row) => {
        if (statusFilter !== "all" && row.status !== statusFilter) {
          return false;
        }

        if (tariffFilter !== "all" && row.tierId !== tariffFilter) {
          return false;
        }

        if (!query) {
          return true;
        }

        const company = (row.companyName?.trim() ?? "").toLowerCase();
        const formattedNumber = formatInvoiceNumber(row.invoiceNumber).toLowerCase();
        const rawNumber = String(row.invoiceNumber);

        return (
          company.includes(query) ||
          formattedNumber.includes(query) ||
          rawNumber.includes(query)
        );
      });
  }, [requests, search, statusFilter, tariffFilter]);

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

      <div className="flex flex-wrap items-center gap-4">
        <Input
          type="search"
          placeholder="Поиск по компании или № счета..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full max-w-sm"
          aria-label="Поиск по компании или номеру счёта"
        />
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="pending">Ожидает оплаты</SelectItem>
            <SelectItem value="paid">Оплачен</SelectItem>
            <SelectItem value="cancelled">Отменен</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tariffFilter} onValueChange={setTariffFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Все тарифы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все тарифы</SelectItem>
            {tariffOptions.map(([tierId, tierName]) => (
              <SelectItem key={tierId} value={tierId}>
                {tierName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
            {filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground h-24 text-center text-sm"
                >
                  {requests.length === 0
                    ? "Заявок на оплату пока нет."
                    : "Ничего не найдено по выбранным фильтрам."}
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((row) => {
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
                          {row.status === "pending" ? (
                            <>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                disabled={busy}
                                onClick={() => handleApprove(row.id)}
                              >
                                <Check className="text-emerald-500" />
                                {busy ? "Обработка…" : "Подтвердить оплату"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                disabled={busy}
                                onClick={() => handleCancel(row.id)}
                              >
                                <X className="text-destructive" />
                                Отменить
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          ) : null}
                          <DropdownMenuItem asChild>
                            <a
                              href={`/dashboard/invoices/${row.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex cursor-pointer items-center gap-1.5"
                            >
                              <FileText className="text-muted-foreground" />
                              Посмотреть счёт
                              <ExternalLinkIcon className="ml-auto size-3.5 opacity-60" />
                            </a>
                          </DropdownMenuItem>
                          {row.status === "paid" ? (
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/dashboard/acts/${row.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex cursor-pointer items-center gap-1.5"
                              >
                                <FileText className="text-muted-foreground" />
                                Скачать акт
                                <ExternalLinkIcon className="ml-auto size-3.5 opacity-60" />
                              </Link>
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
