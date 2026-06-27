"use client";

import { useState } from "react";
import { PencilIcon, PlusIcon } from "lucide-react";

import type { TariffRow } from "@/app/actions/tariff-actions";
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
import { formatPriceByn } from "@/lib/utils/pricing";

type TariffsAdminClientProps = {
  initialTariffs: TariffRow[];
};

export function TariffsAdminClient({ initialTariffs }: TariffsAdminClientProps) {
  const [tariffs, setTariffs] = useState(initialTariffs);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TariffRow | null>(null);

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
        return [...prev, row].sort(
          (a, b) =>
            b.priority_level - a.priority_level || a.name.localeCompare(b.name),
        );
      }
      const next = [...prev];
      next[index] = row;
      return next.sort(
        (a, b) =>
          b.priority_level - a.priority_level || a.name.localeCompare(b.name),
      );
    });
    setDialogOpen(false);
    setEditing(null);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          {tariffs.length} тариф(ов) в каталоге
        </p>
        <Button type="button" onClick={openCreate}>
          <PlusIcon className="mr-2 size-4" />
          Добавить тариф
        </Button>
      </div>

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
                <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                  Тарифы не найдены. Создайте первый тариф.
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
                    3: {tariff.discount_3_months}% · 6: {tariff.discount_6_months}% · 12:{" "}
                    {tariff.discount_12_months}%
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
                      onClick={() => openEdit(tariff)}
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
