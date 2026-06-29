import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { InvoicePrintButton } from "@/components/dashboard/invoices/invoice-print-button";
import { loadGateProfile, isGlobalAdmin } from "@/lib/auth/access";
import {
  getPrimaryActiveStaffTenant,
  getUserTenantsSafe,
} from "@/lib/auth/tenant";
import { formatInvoiceNumber } from "@/lib/utils/invoice-format";
import {
  formatAmountInWordsRubles,
  kopecksToAmountRubles,
} from "@/lib/utils/number-to-words";
import { createClient } from "@/lib/supabase/server";

const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;

const PRINT_STYLES = `
  @media print {
    @page { margin: 0; }
    .no-print { display: none !important; }
    aside, nav { display: none !important; }
    body > div header,
    [data-slot="sidebar"],
    [data-slot="header"] {
      display: none !important;
    }
    .invoice-document,
    .invoice-document * {
      font-family: "Times New Roman", Times, serif !important;
    }
    .invoice-body {
      max-width: none !important;
      padding: 1.5cm 2cm !important;
    }
    .invoice-logo {
      display: block !important;
      height: 150px !important;
      width: auto !important;
      margin-left: auto !important;
      margin-right: auto !important;
      margin-bottom: 1rem !important;
    }
    .invoice-header {
      display: block !important;
      width: 100% !important;
      text-align: center !important;
      margin-bottom: 1.5rem !important;
    }
    .invoice-title {
      font-size: 14pt !important;
      font-weight: bold !important;
      text-transform: uppercase !important;
      line-height: 1.25 !important;
    }
    .invoice-date {
      font-size: 12pt !important;
      line-height: 1.25 !important;
    }
    .invoice-signature {
      display: block !important;
      width: 600px !important;
      max-width: 100% !important;
      height: auto !important;
      margin-top: 0.5rem !important;
    }
  }
`;

function formatActHeaderDate(iso: string): string {
  const date = new Date(iso);
  const day = date.getDate();
  const month = MONTHS_GENITIVE[date.getMonth()] ?? "";
  const year = date.getFullYear();

  return `«${day}» ${month} ${year} года`;
}

function formatAmountDisplay(kopecks: number): string {
  return kopecksToAmountRubles(kopecks).toFixed(2);
}

function resolveSignatureSrc(base64: string | null): string | null {
  if (!base64?.trim()) {
    return null;
  }
  const trimmed = base64.trim();
  if (trimmed.startsWith("data:")) {
    return trimmed;
  }
  return `data:image/png;base64,${trimmed}`;
}

type ActPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ActPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("billing_requests")
    .select("invoice_number")
    .eq("id", id)
    .maybeSingle();

  const label = data?.invoice_number
    ? formatInvoiceNumber(data.invoice_number)
    : "…";

  return {
    title: `Акт приемки № ${label}`,
  };
}

export default async function ActDetailPage({ params }: ActPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const tenants = await getUserTenantsSafe(user.id);
  const primaryTenant = getPrimaryActiveStaffTenant(tenants);
  const profile = await loadGateProfile(user.id);
  const admin = isGlobalAdmin(profile);

  if (!primaryTenant && !admin) {
    redirect("/dashboard/settings");
  }

  const { data: request, error: requestError } = await supabase
    .from("billing_requests")
    .select(
      `
        id,
        invoice_number,
        created_at,
        organization_id,
        status,
        tier_id,
        period_months,
        amount_kopecks,
        company_name,
        description,
        subscription_tiers (
          name
        )
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (requestError) {
    console.error("[ActDetailPage]", requestError.message);
    throw new Error("Не удалось загрузить акт");
  }

  if (
    !request ||
    (!admin &&
      primaryTenant &&
      request.organization_id !== primaryTenant.organizationId)
  ) {
    notFound();
  }

  if (request.status !== "paid") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight">Акт недоступен</h2>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          Акт выполненных работ формируется только после подтверждения оплаты
          счета.
        </p>
        <Link
          href={admin ? "/dashboard/admin/invoices" : "/dashboard/invoices"}
          className="text-brand mt-6 text-sm font-medium underline-offset-4 hover:underline"
        >
          ← Вернуться к счетам и актам
        </Link>
      </div>
    );
  }

  const { data: platform, error: platformError } = await supabase
    .from("platform_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (platformError) {
    console.error("[ActDetailPage] platform_settings", platformError.message);
    throw new Error("Не удалось загрузить реквизиты платформы");
  }

  if (!platform) {
    throw new Error("Реквизиты платформы не настроены");
  }

  const tier = request.subscription_tiers as { name: string } | null;
  const tierName = tier?.name?.trim() || request.tier_id;
  const serviceName =
    request.description?.trim() ||
    `Доступ к платформе BelSkills по тарифу ${tierName} (${request.period_months} мес.)`;
  const amountRubles = kopecksToAmountRubles(request.amount_kopecks);
  const amountDisplay = formatAmountDisplay(request.amount_kopecks);
  const amountInWords = formatAmountInWordsRubles(amountRubles);
  const signatureSrc = resolveSignatureSrc(platform.signature_image_base64);
  const platformLegalName = platform.company_name ?? "—";
  const buyerName = request.company_name ?? "—";

  return (
    <>
      <style>{PRINT_STYLES}</style>

      <div className="no-print mb-4 px-4 pt-4">
        <Link
          href={admin ? "/dashboard/admin/invoices" : "/dashboard/invoices"}
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          ← Назад к списку счетов и актов
        </Link>
      </div>

      <div
        className="invoice-document bg-white text-black"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        <div className="invoice-body mx-auto max-w-4xl p-8 text-[12pt] leading-normal">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="BelSkills"
            className="invoice-logo mx-auto mb-4 h-[150px] w-auto object-contain"
          />

          <div className="invoice-header mb-6 text-center">
            <p className="invoice-title text-[14pt] font-bold uppercase">АКТ</p>
            <p className="invoice-title text-[14pt] font-bold uppercase">
              приемки выполненных работ/услуг №{" "}
              {formatInvoiceNumber(request.invoice_number)}
            </p>
          </div>

          <div className="mb-5 text-[12pt] leading-snug">
            <p>{formatActHeaderDate(request.created_at)}</p>
          </div>

          <div className="mb-5 space-y-3 text-justify text-[12pt] leading-snug">
            <p>
              Мы, нижеподписавшиеся, от лица исполнителя —{" "}
              <strong>{platformLegalName}</strong>, и от лица Заказчика —{" "}
              <strong>{buyerName}</strong>, составили настоящий акт в
              соответствии с{" "}
              <strong>
                ПУБЛИЧНЫМ ДОГОВОРОМ-ОФЕРТОЙ BelSkills.by на оказание услуг по
                размещению и продвижению образовательного контента на
                маркетплейсе
              </strong>{" "}
              о том, что нижеперечисленные работы/услуги выполнены в полном
              объеме.
            </p>
            <p>Качество работ/услуг соответствует условиям договора.</p>
          </div>

          <table className="mb-5 w-full border-collapse border border-black text-left text-[11pt] leading-tight">
            <thead>
              <tr>
                <th className="border border-black px-2 py-1 font-bold">
                  Наименование
                </th>
                <th className="border border-black px-2 py-1 text-center font-bold">
                  Сумма (руб.)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black px-2 py-1">{serviceName}</td>
                <td className="border border-black px-2 py-1 text-center">
                  {amountDisplay}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mb-8 space-y-3 text-justify text-[12pt] leading-snug">
            <p>
              Итого: {amountDisplay} р. ({amountInWords}) без НДС согласно п.
              3.12 ст. 286 Налогового кодекса Республики Беларусь (освобождение
              от НДС при оказании образовательных услуг).
            </p>
            <p>
              Сторонами достигнуто соглашение о величине договорной цены на
              оказание услуги, оговоренные настоящим договором.
            </p>
          </div>

          <div className="mt-12 space-y-10 leading-snug">
            <div>
              <p className="font-bold">Исполнитель</p>
              {signatureSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signatureSrc}
                  alt="Подпись и печать"
                  className="invoice-signature h-auto w-[600px] max-w-full mix-blend-multiply"
                />
              ) : (
                <div
                  className="mt-16 max-w-md border-b border-black"
                  aria-hidden="true"
                />
              )}
            </div>

            <div>
              <p className="font-bold">Заказчик</p>
              <div
                className="mt-16 max-w-md border-b border-black"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>

      <InvoicePrintButton label="Скачать акт" />
    </>
  );
}
