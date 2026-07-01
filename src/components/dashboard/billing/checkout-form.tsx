"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { CheckCircle2, CreditCard, FileText, Landmark } from "lucide-react";

import { submitBillingRequest } from "@/app/actions/billing-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { BillingPeriod } from "@/lib/utils/pricing";
import { cn } from "@/lib/utils";

type PaymentMethod = "card" | "bank_transfer";

export type B2BBillingDetails = {
  unp: string;
  companyName: string;
  legalAddress: string;
  iban: string;
  bic: string;
  directorName: string;
  directorPosition: string;
  basisOfAuthority: string;
};

type CheckoutFormProps = {
  organizationId: string;
  tierId: string;
  period: BillingPeriod;
  initialB2BDetails?: B2BBillingDetails | null;
  couponId?: string | null;
  disabled?: boolean;
};

type FormState = {
  error?: string;
  success?: boolean;
  requestId?: string;
  paymentMethod?: PaymentMethod;
};

const initialState: FormState = {};

function FormGroup({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("space-y-3", className)}>
      <legend className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function BankField({
  id,
  label,
  name,
  placeholder,
  defaultValue,
  disabled,
  className,
  children,
}: {
  id: string;
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      {children ?? (
        <Input
          id={id}
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoComplete="off"
          disabled={disabled}
          className="h-9"
        />
      )}
    </div>
  );
}

export function CheckoutForm({
  organizationId,
  tierId,
  period,
  initialB2BDetails,
  couponId,
  disabled = false,
}: CheckoutFormProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const isBank = paymentMethod === "bank_transfer";

  const [state, formAction, pending] = useActionState(
    async (_prev: FormState, formData: FormData) => {
      const result = await submitBillingRequest(formData);
      if (!result.success) {
        return { error: result.error };
      }

      const method = formData.get("paymentMethod");
      const resolvedMethod: PaymentMethod =
        method === "bank_transfer" ? "bank_transfer" : "card";
      return {
        success: true,
        requestId: result.requestId,
        paymentMethod: resolvedMethod,
      };
    },
    initialState,
  );

  if (state.success && state.requestId && state.paymentMethod === "bank_transfer") {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <CheckCircle2 className="text-brand size-12" aria-hidden />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Счёт успешно сформирован</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Вы можете распечатать или сохранить PDF-счёт прямо сейчас. Он также
            всегда доступен в вашем кабинете.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            asChild
            className="bg-brand text-brand-foreground hover:bg-brand/90 h-11 flex-1 sm:flex-none sm:px-6"
          >
            <Link
              href={`/dashboard/invoices/${state.requestId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText className="mr-2 size-4" aria-hidden />
              Открыть счёт
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 flex-1 sm:flex-none sm:px-6">
            <Link href="/dashboard/invoices">Счета и акты</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (state.success && state.requestId) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <CheckCircle2 className="text-brand size-12" aria-hidden />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Заявка принята</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Заявка на оплату картой зарегистрирована. Перенаправление на
            платёжный шлюз будет добавлено позже.
          </p>
        </div>
        <Button asChild variant="outline" className="h-11">
          <Link href="/dashboard/tariffs">Вернуться к тарифам</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="tierId" value={tierId} />
      <input type="hidden" name="periodMonths" value={period} />
      <input type="hidden" name="paymentMethod" value={paymentMethod} />
      {couponId ? (
        <input type="hidden" name="couponId" value={couponId} />
      ) : null}

      <Tabs
        value={paymentMethod}
        onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 rounded-lg bg-muted p-1">
          <TabsTrigger
            value="card"
            className="flex items-center justify-center gap-2 rounded-md transition-all data-[state=active]:bg-brand data-[state=active]:text-white data-active:bg-brand data-active:text-white"
          >
            <CreditCard className="size-4 shrink-0" aria-hidden />
            По карте
          </TabsTrigger>
          <TabsTrigger
            value="bank_transfer"
            className="flex items-center justify-center gap-2 rounded-md transition-all data-[state=active]:bg-brand data-[state=active]:text-white data-active:bg-brand data-active:text-white"
          >
            <Landmark className="size-4 shrink-0" aria-hidden />
            С расчётного счёта
          </TabsTrigger>
        </TabsList>

        <TabsContent value="card" className="mt-5">
          <Alert>
            <AlertDescription>
              Вы будете перенаправлены на платёжную страницу для безопасной
              оплаты банковской картой.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="bank_transfer" className="mt-5 space-y-5">
          <FormGroup title="Организация">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <BankField
                id="unp"
                label="УНП"
                name="unp"
                placeholder="123456789"
                defaultValue={initialB2BDetails?.unp}
                disabled={!isBank}
              />
              <BankField
                id="companyName"
                label="Название компании"
                name="companyName"
                placeholder="ООО «Пример»"
                defaultValue={initialB2BDetails?.companyName}
                disabled={!isBank}
              />
              <BankField
                id="legalAddress"
                label="Юридический адрес"
                name="legalAddress"
                className="md:col-span-2"
                disabled={!isBank}
              >
                <Textarea
                  id="legalAddress"
                  name="legalAddress"
                  defaultValue={initialB2BDetails?.legalAddress}
                  placeholder="г. Минск, ул. Примерная, 1"
                  rows={2}
                  disabled={!isBank}
                  className="min-h-0 resize-none"
                />
              </BankField>
            </div>
          </FormGroup>

          <FormGroup title="Банк">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <BankField
                id="bic"
                label="Код банка (BIC)"
                name="bic"
                placeholder="AAAABY2X"
                defaultValue={initialB2BDetails?.bic}
                disabled={!isBank}
              />
              <BankField
                id="iban"
                label="Расчётный счёт (IBAN)"
                name="iban"
                placeholder="BY00AAAA00000000000000000000"
                defaultValue={initialB2BDetails?.iban}
                disabled={!isBank}
                className="col-span-1 md:col-span-2"
              />
            </div>
          </FormGroup>

          <FormGroup title="Подписант">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <BankField
                id="directorPosition"
                label="Должность"
                name="directorPosition"
                placeholder="Директор"
                defaultValue={initialB2BDetails?.directorPosition}
                disabled={!isBank}
              />
              <BankField
                id="directorName"
                label="ФИО руководителя"
                name="directorName"
                placeholder="Иванов Иван Иванович"
                defaultValue={initialB2BDetails?.directorName}
                disabled={!isBank}
              />
              <BankField
                id="basisOfAuthority"
                label="Действует на основании"
                name="basisOfAuthority"
                placeholder="Устава"
                defaultValue={initialB2BDetails?.basisOfAuthority}
                disabled={!isBank}
                className="md:col-span-2"
              />
            </div>
          </FormGroup>
        </TabsContent>
      </Tabs>

      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending || disabled}
        className={cn(
          "h-11 w-full text-base font-semibold",
          "bg-brand text-brand-foreground hover:bg-brand/90",
        )}
      >
        {pending
          ? "Обработка…"
          : isBank
            ? "Сформировать счёт"
            : "Оплатить картой"}
      </Button>
    </form>
  );
}
