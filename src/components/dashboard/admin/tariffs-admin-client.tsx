"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import {
  deleteLegacyTariffs,
  type TariffRow,
} from "@/app/actions/tariff-actions";
import { TariffForm } from "@/components/dashboard/admin/tariff-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  groupTariffsByCategory,
  TARIFF_CATEGORY_TABS,
  type TariffCategory,
} from "@/lib/tariffs/format-tier-limits";
import { formatPriceByn } from "@/lib/utils/pricing";

type TariffsAdminClientProps = {
  initialTariffs: TariffRow[];
};

function sortTariffs(rows: TariffRow[]): TariffRow[] {
  return [...rows].sort(
    (a, b) =>
      b.priority_level - a.priority_level || a.name.localeCompare(b.name, "ru"),
  );
}

function sortGroupedTariffs(
  groups: Record<TariffCategory, TariffRow[]>,
): Record<TariffCategory, TariffRow[]> {
  return {
    catalog: sortTariffs(groups.catalog),
    lms: sortTariffs(groups.lms),
    corporate: sortTariffs(groups.corporate),
    free: sortTariffs(groups.free),
  };
}

function TariffsTable({
  tariffs,
  emptyMessage,
  onEdit,
}: {
  tariffs: TariffRow[];
  emptyMessage: string;
  onEdit: (row: TariffRow) => void;
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Название</TableHead>
            <TableHead>Цена / мес.</TableHead>
            <TableHead>Скидки</TableHead>
            <TableHead>Приоритет</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead className="w-[100px] text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tariffs.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-muted-foreground h-24 text-center"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            tariffs.map((tariff) => (
              <TableRow key={tariff.id}>
                <TableCell className="font-mono text-sm">{tariff.id}</TableCell>
                <TableCell>
                  <div className="font-medium">{tariff.name}</div>
                  {tariff.description ? (
                    <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                      {tariff.description}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>{formatPriceByn(tariff.price_monthly)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  3: {tariff.discount_3_months}% · 6: {tariff.discount_6_months}
                  % · 12: {tariff.discount_12_months}%
                </TableCell>
                <TableCell>{tariff.priority_level}</TableCell>
                <TableCell>
                  {tariff.is_active ? (
                    <Badge variant="secondary">Активен</Badge>
                  ) : (
                    <Badge variant="outline">Скрыт</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(tariff)}
                    aria-label={`Редактировать ${tariff.name}`}
                  >
                    <PencilIcon className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function TariffsAdminClient({ initialTariffs }: TariffsAdminClientProps) {
  const router = useRouter();
  const [tariffs, setTariffs] = useState(initialTariffs);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TariffRow | null>(null);
  const [isDeletingLegacy, startDeleteLegacyTransition] = useTransition();

  const groupedTariffs = useMemo(
    () => sortGroupedTariffs(groupTariffsByCategory(tariffs)),
    [tariffs],
  );

  const activeCount = useMemo(
    () => tariffs.filter((tariff) => tariff.is_active).length,
    [tariffs],
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(row: TariffRow) {
    setEditing(row);
    setDialogOpen(true);
  }

  function handleSuccess(row: TariffRow) {
    setTariffs((prev) => {
      const index = prev.findIndex((item) => item.id === row.id);
      if (index === -1) {
        return sortTariffs([...prev, row]);
      }
      const next = [...prev];
      next[index] = row;
      return sortTariffs(next);
    });
    setDialogOpen(false);
    setEditing(null);
  }

  function handleDeleteLegacy() {
    if (
      !window.confirm(
        "Удалить тарифы basic, pro и premium из базы? Это действие нельзя отменить.",
      )
    ) {
      return;
    }

    startDeleteLegacyTransition(async () => {
      const result = await deleteLegacyTariffs();

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setTariffs((prev) =>
        prev.filter((tariff) => !result.data.deletedIds.includes(tariff.id)),
      );
      toast.success("Старые тарифы удалены");
      router.refresh();
    });
  }

  const emptyMessages: Record<TariffCategory, string> = {
    catalog: "Тарифы каталога не найдены.",
    lms: "Тарифы платформы для обучения не найдены.",
    corporate: "Корпоративные тарифы не найдены.",
    free: "Бесплатных тарифов нет.",
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="w-fit"
          disabled={isDeletingLegacy}
          onClick={handleDeleteLegacy}
        >
          {isDeletingLegacy
            ? "Удаление…"
            : "Удалить старые тарифы (basic, pro, premium)"}
        </Button>

        <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          {activeCount} активных · {tariffs.length} всего
        </p>
        <Button type="button" onClick={openCreate}>
          <PlusIcon className="mr-2 size-4" />
          Добавить тариф
        </Button>
        </div>
      </div>

      <Tabs defaultValue="catalog" className="flex flex-col gap-4">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1">
          {TARIFF_CATEGORY_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="min-h-9 px-3 py-2"
            >
              {tab.label}
              <Badge variant="secondary" className="ml-2 tabular-nums">
                {groupedTariffs[tab.value].length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {TARIFF_CATEGORY_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-0">
            <TariffsTable
              tariffs={groupedTariffs[tab.value]}
              emptyMessage={emptyMessages[tab.value]}
              onEdit={openEdit}
            />
          </TabsContent>
        ))}
      </Tabs>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditing(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Редактировать: ${editing.name}` : "Новый тариф"}
            </DialogTitle>
          </DialogHeader>
          <TariffForm
            key={editing?.id ?? "new"}
            tariff={editing}
            onSuccess={handleSuccess}
            onCancel={() => {
              setDialogOpen(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
