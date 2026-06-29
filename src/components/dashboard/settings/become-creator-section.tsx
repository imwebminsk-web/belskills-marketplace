"use client";

import Link from "next/link";
import { useActionState } from "react";

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

const empty: CreateTrialOrganizationState = {};

type BecomeCreatorSectionProps = {
  schoolBrandName: string | null;
};

export function BecomeCreatorSection({
  schoolBrandName,
}: BecomeCreatorSectionProps) {
  const [state, formAction, pending] = useActionState(
    createTrialOrganization,
    empty,
  );

  if (schoolBrandName) {
    return (
      <Card className="max-w-lg border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle>Ваша школа</CardTitle>
          <CardDescription>
            Вы управляете школой как автор или куратор.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Неофициальное название (Бренд)</Label>
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
          Откройте свою школу и начните создавать курсы (Бесплатный Trial).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schoolName">Название школы</Label>
            <Input
              id="schoolName"
              name="schoolName"
              type="text"
              placeholder="Например: Школа английского"
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
            {pending ? "Создаём школу…" : "Создать школу"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
