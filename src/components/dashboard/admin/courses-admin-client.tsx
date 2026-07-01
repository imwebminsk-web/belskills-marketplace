"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Check,
  EyeOff,
  MoreHorizontalIcon,
  X,
} from "lucide-react";

import {
  adminApproveCourse,
  adminRejectCourse,
  adminUnpublishCourse,
} from "@/app/actions/course-admin-actions";
import type { AdminCourseRow } from "@/app/dashboard/admin/courses/page";
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
import type { CourseModerationStatus } from "@/lib/course/course-status";

type CoursesAdminClientProps = {
  initialCourses: AdminCourseRow[];
};

type TabFilter = "pending" | "all";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

function StatusBadge({ status }: { status: CourseModerationStatus }) {
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
    case "draft":
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Черновик
        </Badge>
      );
  }
}

export function CoursesAdminClient({
  initialCourses,
}: CoursesAdminClientProps) {
  const router = useRouter();
  const [courses, setCourses] = useState(initialCourses);
  const [activeTab, setActiveTab] = useState<TabFilter>("pending");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminCourseRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredRows = useMemo(() => {
    if (activeTab === "pending") {
      return courses.filter((row) => row.status === "moderation");
    }
    return courses;
  }, [activeTab, courses]);

  function patchRow(courseId: string, patch: Partial<AdminCourseRow>) {
    setCourses((prev) =>
      prev.map((row) =>
        row.courseId === courseId ? { ...row, ...patch } : row,
      ),
    );
  }

  function runAction(
    courseId: string,
    action: () => Promise<{ success: boolean; error?: string }>,
    patch: Partial<AdminCourseRow>,
  ) {
    setActionError(null);
    setPendingId(courseId);
    startTransition(async () => {
      const result = await action();
      setPendingId(null);
      if (!result.success) {
        setActionError(result.error ?? "Не удалось выполнить действие.");
        return;
      }
      patchRow(courseId, patch);
      router.refresh();
    });
  }

  function handleApprove(row: AdminCourseRow) {
    runAction(row.courseId, () => adminApproveCourse(row.courseId), {
      status: "published",
      rejectionReason: null,
    });
  }

  function handleUnpublish(row: AdminCourseRow) {
    runAction(row.courseId, () => adminUnpublishCourse(row.courseId), {
      status: "hidden",
      rejectionReason: null,
    });
  }

  function openRejectDialog(row: AdminCourseRow) {
    setRejectTarget(row);
    setRejectReason("");
    setActionError(null);
  }

  function handleRejectSubmit() {
    if (!rejectTarget) return;

    const courseId = rejectTarget.courseId;
    const reason = rejectReason.trim();

    setActionError(null);
    setPendingId(courseId);
    startTransition(async () => {
      const result = await adminRejectCourse(courseId, reason);
      setPendingId(null);
      if (!result.success) {
        setActionError(result.error ?? "Не удалось отклонить курс.");
        return;
      }
      patchRow(courseId, {
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
                  <TableHead>Название курса</TableHead>
                  <TableHead>Организация</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead className="w-[72px] text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground h-24 text-center"
                    >
                      {activeTab === "pending"
                        ? "Нет курсов на модерации."
                        : "Курсы не найдены."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => {
                    const isRowPending =
                      isPending && pendingId === row.courseId;

                    return (
                      <TableRow key={row.courseId}>
                        <TableCell>
                          <div className="font-medium">{row.title}</div>
                          {row.rejectionReason ? (
                            <p className="text-muted-foreground mt-1 max-w-md text-xs">
                              Причина: {row.rejectionReason}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.organizationName}
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
                                aria-label="Действия с курсом"
                              >
                                <MoreHorizontalIcon className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
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
                              {row.status !== "moderation" &&
                              row.status !== "published" ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem disabled>
                                    Нет доступных действий
                                  </DropdownMenuItem>
                                </>
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
            <DialogTitle>Отклонить курс</DialogTitle>
            <DialogDescription>
              Укажите причину отклонения для «{rejectTarget?.title}». Текст
              увидит преподаватель организации.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Например: неполное описание программы или некорректная обложка."
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
