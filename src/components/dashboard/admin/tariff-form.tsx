"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  upsertTariff,
  type TariffRow,
} from "@/app/actions/tariff-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { kopecksToRubles } from "@/lib/utils/pricing";
import type { Json } from "@/types/database.types";

function jsonArrayToLines(value: Json | null | undefined): string {
  if (!Array.isArray(value)) {
    return "";
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .join("\n");
}

function limitsToInput(value: Json | null | undefined): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "{}";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

type TariffFormProps = {
  tariff?: TariffRow | null;
  onSuccess?: (row: TariffRow) => void;
  onCancel?: () => void;
};

export function TariffForm({ tariff, onSuccess, onCancel }: TariffFormProps) {
  const isEditing = Boolean(tariff);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(tariff?.is_active ?? true);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    if (isActive) {
      formData.set("is_active", "true");
    } else {
      formData.delete("is_active");
    }

    startTransition(async () => {
      const result = await upsertTariff(formData);
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success(isEditing ? "Тариф обновлён" : "Тариф создан");
      onSuccess?.(result.data);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tariff-id">ID</Label>
          <Input
            id="tariff-id"
            name="id"
            defaultValue={tariff?.id ?? ""}
            readOnly={isEditing}
            required
            placeholder="pro-plus"
            className={isEditing ? "bg-muted" : undefined}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tariff-name">Название</Label>
          <Input
            id="tariff-name"
            name="name"
            defaultValue={tariff?.name ?? ""}
            required
            placeholder="Профессиональный"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tariff-description">Описание</Label>
        <Textarea
          id="tariff-description"
          name="description"
          defaultValue={tariff?.description ?? ""}
          rows={3}
          placeholder="Краткое описание тарифа для админки и лендинга"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="tariff-price">Цена / месяц (BYN)</Label>
          <Input
            id="tariff-price"
            name="price_monthly"
            type="number"
            min={0}
            step={1}
            defaultValue={
              tariff?.price_monthly ? kopecksToRubles(tariff.price_monthly) : 0
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tariff-priority">Приоритет</Label>
          <Input
            id="tariff-priority"
            name="priority_level"
            type="number"
            min={0}
            step={1}
            defaultValue={tariff?.priority_level ?? 0}
            required
          />
        </div>
        <div className="flex items-end gap-2 pb-2">
          <Checkbox
            id="tariff-active"
            checked={isActive}
            onCheckedChange={(checked) => setIsActive(checked === true)}
          />
          <Label htmlFor="tariff-active" className="cursor-pointer font-normal">
            Активен
          </Label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="tariff-discount-3">Скидка 3 мес. (%)</Label>
          <Input
            id="tariff-discount-3"
            name="discount_3_months"
            type="number"
            min={0}
            max={100}
            step={1}
            defaultValue={tariff?.discount_3_months ?? 0}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tariff-discount-6">Скидка 6 мес. (%)</Label>
          <Input
            id="tariff-discount-6"
            name="discount_6_months"
            type="number"
            min={0}
            max={100}
            step={1}
            defaultValue={tariff?.discount_6_months ?? 0}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tariff-discount-12">Скидка 12 мес. (%)</Label>
          <Input
            id="tariff-discount-12"
            name="discount_12_months"
            type="number"
            min={0}
            max={100}
            step={1}
            defaultValue={tariff?.discount_12_months ?? 0}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tariff-limits-text">Лимиты (текст для витрины)</Label>
        <Textarea
          id="tariff-limits-text"
          name="limits_text"
          defaultValue={jsonArrayToLines(tariff?.limits_text)}
          rows={5}
          placeholder="Добавить текстовое описание лимита…"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tariff-features">Возможности</Label>
          <Textarea
            id="tariff-features"
            name="features"
            defaultValue={jsonArrayToLines(tariff?.features)}
            rows={6}
            placeholder="Добавить возможность…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tariff-presents">Бонусы</Label>
          <Textarea
            id="tariff-presents"
            name="presents"
            defaultValue={jsonArrayToLines(tariff?.presents)}
            rows={6}
            placeholder="Добавить бонус…"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label htmlFor="tariff-limits">Лимиты (JSON)</Label>
        <div className="bg-muted/40 text-muted-foreground space-y-3 rounded-lg border p-4 text-sm">
          <p className="text-foreground font-medium">Шпаргалка по лимитам (JSON)</p>
          <p>
            Используйте формат JSON для настройки системных ограничений. Значение{" "}
            <code className="bg-muted rounded px-1 font-mono text-xs">null</code>{" "}
            означает безлимит.
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <code className="font-mono text-xs">&quot;max_courses&quot;: число | null</code>{" "}
              — максимальное количество курсов.
            </li>
            <li>
              <code className="font-mono text-xs">&quot;max_lessons&quot;: число | null</code>{" "}
              — максимальное количество уроков в курсе.
            </li>
            <li>
              <code className="font-mono text-xs">&quot;max_users&quot;: число | null</code>{" "}
              — лимит сотрудников (только для корпораций).
            </li>
            <li>
              <code className="font-mono text-xs">&quot;lms_unlocked&quot;: true | false</code>{" "}
              — доступ к LMS. Если{" "}
              <code className="bg-muted rounded px-1 font-mono text-xs">false</code>, уроки
              станут демо-версиями.
            </li>
          </ul>
          <div className="space-y-2">
            <p className="text-foreground font-medium">Пример для Каталога:</p>
            <pre className="bg-background overflow-x-auto rounded-md border p-3 font-mono text-xs">
              {`{"max_courses": 3, "max_lessons": 3, "lms_unlocked": false, "max_users": null}`}
            </pre>
          </div>
          <div className="space-y-2">
            <p className="text-foreground font-medium">Пример для Системы обучения:</p>
            <pre className="bg-background overflow-x-auto rounded-md border p-3 font-mono text-xs">
              {`{"max_courses": 12, "max_lessons": null, "lms_unlocked": true, "max_users": null}`}
            </pre>
          </div>
        </div>
        <Textarea
          id="tariff-limits"
          name="limits"
          defaultValue={limitsToInput(tariff?.limits)}
          rows={6}
          className="font-mono text-sm"
          placeholder='{"max_courses": 3, "max_lessons": 3, "lms_unlocked": false, "max_users": null}'
        />
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Отмена
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Сохранение…" : isEditing ? "Сохранить" : "Создать тариф"}
        </Button>
      </div>
    </form>
  );
}
