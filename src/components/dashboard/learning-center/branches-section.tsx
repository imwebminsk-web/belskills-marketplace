"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import {
  addBranch,
  deleteBranch,
  type AddBranchState,
  type OrganizationBranchRow,
} from "@/app/actions/showcase-actions";
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

const initialAddBranchState: AddBranchState = {};

type BranchesSectionProps = {
  branches: OrganizationBranchRow[];
  organizationId: string;
};

export function BranchesSection({
  branches,
  organizationId,
}: BranchesSectionProps) {
  const router = useRouter();
  const [addState, addFormAction, addPending] = useActionState(
    addBranch,
    initialAddBranchState,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (addState.success) {
      toast.success("Филиал добавлен");
      router.refresh();
    }
  }, [addState.success, router]);

  function handleDelete(branch: OrganizationBranchRow) {
    if (
      !window.confirm(
        `Удалить филиал «${branch.label?.trim() || branch.city}»?`,
      )
    ) {
      return;
    }

    setDeletingId(branch.id);
    startDeleteTransition(async () => {
      const result = await deleteBranch(branch.id, organizationId);

      if (!result.success) {
        toast.error(result.error);
        setDeletingId(null);
        return;
      }

      toast.success("Филиал удалён");
      setDeletingId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Список филиалов</CardTitle>
          <CardDescription>
            Адреса отображаются на публичной странице учебного центра.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Филиалы пока не добавлены.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {branches.map((branch) => {
                const busy = isDeleting && deletingId === branch.id;

                return (
                  <li
                    key={branch.id}
                    className="flex items-start justify-between gap-4 p-4"
                  >
                    <div className="min-w-0 space-y-1">
                      {branch.label ? (
                        <p className="font-medium">{branch.label}</p>
                      ) : null}
                      <p className="text-sm">
                        {branch.city}, {branch.address}
                      </p>
                      {branch.phone ? (
                        <p className="text-muted-foreground text-sm">
                          {branch.phone}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive shrink-0"
                      disabled={busy}
                      aria-label={`Удалить филиал ${branch.city}`}
                      onClick={() => handleDelete(branch)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Добавить филиал</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addFormAction} className="space-y-4">
            <input type="hidden" name="organization_id" value={organizationId} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="branch-city">Город</Label>
                <Input
                  id="branch-city"
                  name="city"
                  required
                  placeholder="Минск"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-label">Подпись (необязательно)</Label>
                <Input
                  id="branch-label"
                  name="label"
                  placeholder="Главный офис"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-address">Адрес</Label>
              <Input
                id="branch-address"
                name="address"
                required
                placeholder="ул. Примерная, 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-phone">Телефон (необязательно)</Label>
              <Input
                id="branch-phone"
                name="phone"
                type="tel"
                placeholder="+375 29 000-00-00"
              />
            </div>

            {addState.error ? (
              <p className="text-destructive text-sm" role="alert">
                {addState.error}
              </p>
            ) : null}

            <Button type="submit" disabled={addPending}>
              {addPending ? "Добавление…" : "Добавить филиал"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
