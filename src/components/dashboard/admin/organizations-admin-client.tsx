"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Check,
  Eye,
  EyeOff,
  MoreHorizontalIcon,
  Pencil,
  X,
} from "lucide-react";

import {
  adminApproveOrganization,
  adminRejectOrganization,
  adminUnpublishOrganization,
} from "@/app/actions/organization-admin-actions";
import type { AdminOrganizationRow } from "@/app/dashboard/admin/organizations/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { OrganizationShowcaseStatus } from "@/lib/organization/profile-status";

type OrganizationsAdminClientProps = {
  initialOrganizations: AdminOrganizationRow[];
};

type TabFilter = "pending" | "all";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

function StatusBadge({ status }: { status: OrganizationShowcaseStatus }) {
  switch (status) {
    case "published":
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
        >
          Опубликовано
        </Badge>
      );
    case "moderation":
      return (
        <Badge
          variant="outline"
          className="border-amber-500/40 bg-amber-500/15 text-amber-950 dark:text-amber-100"
        >
          На модерации
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" className="bg-destructive/10 text-destructive">
          Отклонено
        </Badge>
      );
    case "hidden":
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          Снято с публикации
        </Badge>
      );
    case "blocked":
      return <Badge variant="destructive">Заблокировано</Badge>;
    case "draft":
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Черновик
        </Badge>
      );
  }
}

export function OrganizationsAdminClient({
  initialOrganizations,
}: OrganizationsAdminClientProps) {
  const router = useRouter();
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [activeTab, setActiveTab] = useState<TabFilter>("pending");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminOrganizationRow | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredRows = useMemo(() => {
    if (activeTab === "pending") {
      return organizations.filter((row) => row.status === "moderation");
    }
    return organizations;
  }, [activeTab, organizations]);

  function patchRow(
    organizationId: string,
    patch: Partial<AdminOrganizationRow>,
  ) {
    setOrganizations((prev) =>
      prev.map((row) =>
        row.organizationId === organizationId ? { ...row, ...patch } : row,
      ),
    );
  }

  function runAction(
    organizationId: string,
    action: () => Promise<{ success: boolean; error?: string }>,
    patch: Partial<AdminOrganizationRow>,
  ) {
    setActionError(null);
    setPendingId(organizationId);
    startTransition(async () => {
      const result = await action();
      setPendingId(null);
      if (!result.success) {
        setActionError(result.error ?? "Не удалось выполнить действие.");
        return;
      }
      patchRow(organizationId, patch);
      router.refresh();
    });
  }

  function handleApprove(row: AdminOrganizationRow) {
    runAction(row.organizationId, () => adminApproveOrganization(row.organizationId), {
      status: "published",
      rejectionReason: null,
    });
  }

  function handleUnpublish(row: AdminOrganizationRow) {
    runAction(
      row.organizationId,
      () => adminUnpublishOrganization(row.organizationId),
      { status: "hidden", rejectionReason: null },
    );
  }

  function openRejectDialog(row: AdminOrganizationRow) {
    setRejectTarget(row);
    setRejectReason("");
    setActionError(null);
  }

  function handleRejectSubmit() {
    if (!rejectTarget) return;

    const organizationId = rejectTarget.organizationId;
    const reason = rejectReason.trim();

    setActionError(null);
    setPendingId(organizationId);
    startTransition(async () => {
      const result = await adminRejectOrganization(organizationId, reason);
      setPendingId(null);
      if (!result.success) {
        setActionError(result.error ?? "Не удалось отклонить организацию.");
        return;
      }
      patchRow(organizationId, {
        status: "rejected",
        rejectionReason: reason,
      });
      setRejectTarget(null);
      setRejectReason("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {actionError ? (
        <p className="text-destructive text-sm" role="alert">
          {actionError}
        </p>
      ) : null}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabFilter)}
      >
        <TabsList>
          <TabsTrigger value="pending">На модерации</TabsTrigger>
          <TabsTrigger value="all">Все</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead className="w-[72px] text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-muted-foreground h-24 text-center"
                    >
                      {activeTab === "pending"
                        ? "Нет организаций на модерации."
                        : "Организации не найдены."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => {
                    const isRowPending = isPending && pendingId === row.organizationId;

                    return (
                      <TableRow key={row.organizationId}>
                        <TableCell>
                          <div className="font-medium">{row.displayName}</div>
                          {row.rejectionReason ? (
                            <p className="text-muted-foreground mt-1 max-w-md text-xs">
                              Причина: {row.rejectionReason}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(row.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                disabled={isRowPending}
                                aria-label="Действия с организацией"
                              >
                                <MoreHorizontalIcon className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                disabled={!row.slug}
                                onClick={() => {
                                  if (!row.slug) return;
                                  window.open(
                                    `/school/${encodeURIComponent(row.slug)}`,
                                    "_blank",
                                    "noopener,noreferrer",
                                  );
                                }}
                              >
                                <Eye className="size-4" />
                                Предпросмотр
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/admin/organizations/${row.organizationId}`}
                                >
                                  <Pencil className="size-4" />
                                  Редактировать
                                </Link>
                              </DropdownMenuItem>
                              {row.status === "moderation" ||
                              row.status === "published" ? (
                                <DropdownMenuSeparator />
                              ) : null}
                              {row.status === "moderation" ? (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleApprove(row)}
                                  >
                                    <Check className="size-4" />
                                    Одобрить
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openRejectDialog(row)}
                                  >
                                    <X className="size-4" />
                                    Отклонить
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                              {row.status === "published" ? (
                                <DropdownMenuItem
                                  onClick={() => handleUnpublish(row)}
                                >
                                  <EyeOff className="size-4" />
                                  Снять с публикации
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
        </TabsContent>
      </Tabs>

      <Dialog
        open={rejectTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонить организацию</DialogTitle>
            <DialogDescription>
              Укажите причину отклонения для «{rejectTarget?.displayName}». Текст
              увидит владелец учебного центра.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Например: не заполнены юридические реквизиты или некорректный логотип."
            rows={4}
            disabled={isPending}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectTarget(null)}
              disabled={isPending}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={isPending || rejectReason.trim().length < 3}
            >
              {isPending ? "Сохранение…" : "Отклонить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
