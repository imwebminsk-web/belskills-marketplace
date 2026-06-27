import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Счёт сформирован",
  description: "Счёт на оплату подписки готов",
};

type SuccessPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];
  return typeof value === "string" ? value : value?.[0];
}

export default async function CheckoutSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const params = await searchParams;
  const method = readParam(params, "method");
  const tier = readParam(params, "tier");
  const requestId = readParam(params, "requestId");

  const isBank = method === "bank_transfer";
  const invoiceReady = isBank && Boolean(requestId);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center py-8">
      <Card className="w-full text-center">
        <CardHeader className="items-center gap-3">
          <CheckCircle2
            className="text-brand size-12"
            aria-hidden
          />
          <CardTitle className="text-2xl">
            {invoiceReady ? "Счёт успешно сформирован" : "Заявка принята"}
          </CardTitle>
          <CardDescription className="text-base">
            {invoiceReady
              ? "Вы можете распечатать или сохранить PDF-счёт прямо сейчас. Он также всегда доступен в вашем кабинете."
              : isBank
                ? "Счёт сформирован. Откройте раздел «Счета и акты» в кабинете."
                : "Заявка на оплату картой зарегистрирована. Перенаправление на платёжный шлюз будет добавлено позже."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {tier ? (
            <p className="text-muted-foreground text-sm">
              Тариф: <span className="text-foreground font-medium">{tier}</span>
            </p>
          ) : null}
          {invoiceReady ? (
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                asChild
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                <Link
                  href={`/dashboard/invoices/${requestId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText className="mr-2 size-4" aria-hidden />
                  Открыть счёт
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/invoices">Счета и акты</Link>
              </Button>
            </div>
          ) : (
            <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Link href="/dashboard/tariffs">Вернуться к тарифам</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
