"use client";

import { useActionState, useState, type ChangeEvent, type ReactNode } from "react";

import {
  updatePlatformSettings,
  type PlatformSettingsRow,
} from "@/app/actions/admin-settings-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type BillingSettingsClientProps = {
  settings: PlatformSettingsRow;
};

type FormState = {
  error?: string;
  success?: boolean;
};

const initialState: FormState = {};

function SettingsField({
  id,
  label,
  name,
  defaultValue,
  placeholder,
  className,
  children,
}: {
  id: string;
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children ?? (
        <Input
          id={id}
          name={name}
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

export function BillingSettingsClient({ settings }: BillingSettingsClientProps) {
  const [signaturePreview, setSignaturePreview] = useState<string | null>(
    settings.signature_image_base64,
  );
  const [signatureBase64, setSignatureBase64] = useState<string>(
    settings.signature_image_base64 ?? "",
  );

  const [state, formAction, pending] = useActionState(
    async (_prev: FormState, formData: FormData) => {
      const result = await updatePlatformSettings(formData);
      if (!result.success) {
        return { error: result.error };
      }
      return { success: true };
    },
    initialState,
  );

  function handleSignatureChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setSignatureBase64(result);
      setSignaturePreview(result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <input
        type="hidden"
        name="signatureImageBase64"
        value={signatureBase64}
      />

      <section className="space-y-4">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Организация
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SettingsField
            id="unp"
            label="УНП"
            name="unp"
            defaultValue={settings.unp}
            placeholder="123456789"
          />
          <SettingsField
            id="companyName"
            label="Название компании"
            name="companyName"
            defaultValue={settings.company_name}
            placeholder="ООО «BelSkills»"
          />
          <SettingsField
            id="legalAddress"
            label="Юридический адрес"
            name="legalAddress"
            className="md:col-span-2"
          >
            <Textarea
              id="legalAddress"
              name="legalAddress"
              defaultValue={settings.legal_address ?? ""}
              placeholder="г. Минск, ул. Примерная, 1"
              rows={2}
              className="min-h-0 resize-none"
            />
          </SettingsField>
          <SettingsField
            id="mailingAddress"
            label="Почтовый адрес"
            name="mailingAddress"
            className="md:col-span-2"
          >
            <Textarea
              id="mailingAddress"
              name="mailingAddress"
              defaultValue={settings.mailing_address ?? ""}
              placeholder="г. Минск, а/я 123 (если отличается от юридического)"
              rows={2}
              className="min-h-0 resize-none"
            />
          </SettingsField>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Банк
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SettingsField
            id="bic"
            label="Код банка (BIC)"
            name="bic"
            defaultValue={settings.bic}
            placeholder="AAAABY2X"
          />
          <SettingsField
            id="iban"
            label="Расчётный счёт (IBAN)"
            name="iban"
            defaultValue={settings.iban}
            placeholder="BY00AAAA00000000000000000000"
            className="col-span-1 md:col-span-2"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Подписант
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SettingsField
            id="directorPosition"
            label="Должность"
            name="directorPosition"
            defaultValue={settings.director_position}
            placeholder="Директор"
          />
          <SettingsField
            id="directorName"
            label="ФИО руководителя"
            name="directorName"
            defaultValue={settings.director_name}
            placeholder="Иванов Иван Иванович"
          />
          <SettingsField
            id="basisOfAuthority"
            label="Действует на основании"
            name="basisOfAuthority"
            defaultValue={settings.basis_of_authority}
            placeholder="Устава"
            className="md:col-span-2"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Подпись и печать
        </h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="signatureImage">Изображение подписи / печати</Label>
            <Input
              id="signatureImage"
              type="file"
              accept="image/png, image/jpeg"
              onChange={handleSignatureChange}
              className="cursor-pointer"
            />
            <p className="text-muted-foreground text-xs">
              PNG или JPEG с прозрачным фоном. Файл сохраняется в base64 без
              Storage Bucket.
            </p>
          </div>
          {signaturePreview ? (
            <div className="rounded-md border bg-white p-4">
              <p className="text-muted-foreground mb-2 text-xs">Предпросмотр:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signaturePreview}
                alt="Подпись и печать"
                className="h-auto max-h-32 w-40 mix-blend-multiply"
              />
            </div>
          ) : null}
        </div>
      </section>

      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="text-brand text-sm font-medium" role="status">
          Настройки сохранены.
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full max-w-xs bg-brand text-brand-foreground hover:bg-brand/90 md:w-auto md:px-8"
      >
        {pending ? "Сохранение…" : "Сохранить"}
      </Button>
    </form>
  );
}
