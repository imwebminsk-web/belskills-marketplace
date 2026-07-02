"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  createTrialOrganization,
  type CreateTrialOrganizationState,
} from "@/app/actions/organization-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { OrganizationTypeValue } from "@/lib/validations/organization-schema";

const empty: CreateTrialOrganizationState = {};

const ORGANIZATION_TYPE_OPTIONS: {
  value: OrganizationTypeValue;
  title: string;
  description: string;
}[] = [
  {
    value: "school",
    title: "Онлайн-школа",
    description: "Публичный каталог курсов, продажа ученикам",
  },
  {
    value: "corporate",
    title: "Корпоративное обучение",
    description: "Закрытое обучение для сотрудников по инвайтам",
  },
];

type BecomeCreatorSectionProps = {
  schoolBrandName: string | null;
  organizationType: OrganizationTypeValue | null;
};

export function BecomeCreatorSection({
  schoolBrandName,
  organizationType,
}: BecomeCreatorSectionProps) {
  const [state, formAction, pending] = useActionState(
    createTrialOrganization,
    empty,
  );
  const [selectedOrgType, setSelectedOrgType] = useState<OrganizationTypeValue>(
    "school",
  );
  const currentOrgType = organizationType ?? "school";
  const managedOrgTitle =
    currentOrgType === "corporate" ? "Корпоративное обучение" : "Ваша школа";
  const managedOrgDescription =
    currentOrgType === "corporate"
      ? "Вы управляете корпоративным интранетом."
      : "Вы управляете школой как автор или куратор.";
  const managedNameLabel =
    currentOrgType === "corporate"
      ? "Название организации"
      : "Неофициальное название (Бренд)";
  const nameLabel =
    selectedOrgType === "corporate"
      ? "Название организации"
      : "Неофициальное название (Бренд)";
  const namePlaceholder =
    selectedOrgType === "corporate"
      ? "Например: ООО 'Рога и Копыта'"
      : "Например: Школа английского или ООО «Компания»";

  if (schoolBrandName) {
    return (
      <Card className="max-w-lg border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle>{managedOrgTitle}</CardTitle>
          <CardDescription>{managedOrgDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{managedNameLabel}</Label>
            <p className="text-sm font-medium">{schoolBrandName}</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/courses">Перейти к курсам</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle>Стать автором</CardTitle>
        <CardDescription>
          Создайте онлайн-школу или корпоративный портал обучения (бесплатный
          Trial).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Тип организации</legend>
            {ORGANIZATION_TYPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
                  "has-[:checked]:border-brand has-[:checked]:bg-brand/5",
                  "hover:bg-muted/40",
                )}
              >
                <input
                  type="radio"
                  name="org_type"
                  value={option.value}
                  defaultChecked={option.value === "school"}
                  onChange={() => setSelectedOrgType(option.value)}
                  required
                  className="border-input text-brand mt-1 size-4 shrink-0 accent-[var(--brand)]"
                />
                <span className="min-w-0 space-y-1">
                  <span className="block text-sm font-medium">{option.title}</span>
                  <span className="text-muted-foreground block text-xs leading-relaxed">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="schoolName">{nameLabel}</Label>
            <Input
              id="schoolName"
              name="schoolName"
              type="text"
              placeholder={namePlaceholder}
              required
              minLength={2}
              autoComplete="organization"
            />
          </div>
          {state.error ? (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Создаём…" : "Создать организацию"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
