"use client";

import { useActionState, useEffect, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";

import {
  updateOrganizationProfile,
  type OrganizationBranchRow,
  type OrganizationProfileRow,
  type UpdateOrganizationProfileState,
} from "@/app/actions/showcase-actions";
import { BranchesSection } from "@/components/dashboard/learning-center/branches-section";
import { CoverUploader } from "@/components/dashboard/learning-center/cover-uploader";
import { GalleryUploader } from "@/components/dashboard/learning-center/gallery-uploader";
import { LogoUploader } from "@/components/dashboard/learning-center/logo-uploader";
import { SlugField } from "@/components/dashboard/learning-center/slug-field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Editor } from "@/components/ui/editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  parseProfileMessengers,
  parseProfileSocialLinks,
  SHORT_DESCRIPTION_MAX,
  SOCIAL_LINK_KEYS,
  SOCIAL_LINK_LABELS,
} from "@/lib/organization/showcase-profile";

const initialState: UpdateOrganizationProfileState = {};

function initialAdditionalPhones(phones: string[] | null | undefined): string[] {
  const list = (phones ?? [])
    .map((phone) => phone.trim())
    .filter((phone) => phone.length > 0);

  return list.length > 0 ? list : [""];
}

type ProfileFormProps = {
  profile: OrganizationProfileRow;
  branches: OrganizationBranchRow[];
  organizationId: string;
};

function ProfileSaveFeedback({
  state,
}: {
  state: UpdateOrganizationProfileState;
}) {
  return (
    <>
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-brand text-sm">Профиль сохранён.</p>
      ) : null}
    </>
  );
}

export function ProfileForm({
  profile,
  branches,
  organizationId,
}: ProfileFormProps) {
  const messengers = parseProfileMessengers(profile.messengers);
  const socialLinks = parseProfileSocialLinks(profile.social_links);
  const [shortDescription, setShortDescription] = useState(
    profile.short_description ?? "",
  );
  const [longDescriptionHtml, setLongDescriptionHtml] = useState(
    profile.long_description ?? "",
  );
  const [phones, setPhones] = useState<string[]>(() =>
    initialAdditionalPhones(profile.phones),
  );

  const [state, formAction, pending] = useActionState(
    updateOrganizationProfile,
    initialState,
  );

  useEffect(() => {
    setShortDescription(profile.short_description ?? "");
    setLongDescriptionHtml(profile.long_description ?? "");
    setPhones(initialAdditionalPhones(profile.phones));
  }, [
    profile.short_description,
    profile.long_description,
    profile.phones,
  ]);

  function addPhoneField() {
    setPhones((current) => [...current, ""]);
  }

  function updatePhoneField(index: number, value: string) {
    setPhones((current) =>
      current.map((phone, phoneIndex) =>
        phoneIndex === index ? value : phone,
      ),
    );
  }

  function removePhoneField(index: number) {
    setPhones((current) => {
      if (current.length <= 1) {
        return [""];
      }
      return current.filter((_, phoneIndex) => phoneIndex !== index);
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Публичный профиль</CardTitle>
        <CardDescription>
          Эти данные отображаются в каталоге учебных центров.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="main" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-3">
            <TabsTrigger value="main">Основное</TabsTrigger>
            <TabsTrigger value="contacts">Контакты</TabsTrigger>
            <TabsTrigger value="branches">Филиалы</TabsTrigger>
          </TabsList>

          <form action={formAction}>
            <input
              type="hidden"
              name="long_description"
              value={longDescriptionHtml}
            />
            <TabsContent value="main" className="space-y-6">
              <fieldset className="space-y-4 rounded-lg border p-4">
                <legend className="px-1 text-sm font-medium">
                  Юридическая информация
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="unp">УНП</Label>
                    <Input
                      id="unp"
                      name="unp"
                      defaultValue={profile.unp ?? ""}
                      placeholder="123456789"
                      disabled={pending}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="legal_name">Юридическое название</Label>
                    <Input
                      id="legal_name"
                      name="legal_name"
                      defaultValue={profile.legal_name ?? ""}
                      placeholder='ООО "Учебный центр"'
                      disabled={pending}
                    />
                  </div>
                </div>
              </fieldset>

              <div className="space-y-2">
                <Label htmlFor="public_name">
                  Неофициальное название (Бренд)
                </Label>
                <Input
                  id="public_name"
                  name="public_name"
                  defaultValue={profile.public_name}
                  required
                  placeholder="Например, Belskills Academy"
                />
                <p className="text-muted-foreground text-xs">
                  Отображается на витрине. Для документов используйте юр.
                  название.
                </p>
              </div>

              <LogoUploader
                organizationId={organizationId}
                initialLogoUrl={profile.logo_url}
                brandDisplayName={profile.public_name}
              />

              <SlugField initialSlug={profile.slug} />

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="short_description">Краткое описание</Label>
                  <span className="text-muted-foreground text-xs">
                    {shortDescription.length}/{SHORT_DESCRIPTION_MAX}
                  </span>
                </div>
                <Textarea
                  id="short_description"
                  name="short_description"
                  value={shortDescription}
                  onChange={(event) => setShortDescription(event.target.value)}
                  maxLength={SHORT_DESCRIPTION_MAX}
                  rows={4}
                  placeholder="До 150 символов для карточки в каталоге"
                  className="min-h-0 resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="long_description">Подробное описание</Label>
                <Editor
                  id="long_description"
                  value={longDescriptionHtml}
                  onChange={setLongDescriptionHtml}
                  disabled={pending}
                />
                <p className="text-muted-foreground text-xs">
                  Заголовки, списки и выделение сохраняются как HTML для
                  публичной страницы учебного центра.
                </p>
              </div>

              <CoverUploader
                initialCoverUrl={profile.cover_url}
                disabled={pending}
              />

              <GalleryUploader
                initialUrls={profile.gallery ?? []}
                disabled={pending}
              />

              <ProfileSaveFeedback state={state} />

              <Button type="submit" disabled={pending}>
                {pending ? "Сохранение…" : "Сохранить"}
              </Button>
            </TabsContent>

            <TabsContent
              value="contacts"
              forceMount
              className="space-y-6 data-[state=inactive]:hidden"
            >
              <fieldset className="space-y-4 rounded-lg border p-4">
                <legend className="px-1 text-sm font-medium">Контакты</legend>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="website">Сайт</Label>
                    <Input
                      id="website"
                      name="website"
                      type="text"
                      inputMode="url"
                      defaultValue={profile.website ?? ""}
                      placeholder="https://example.by"
                      disabled={pending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone_main">Основной телефон</Label>
                    <Input
                      id="phone_main"
                      name="phone_main"
                      type="tel"
                      defaultValue={profile.phone_main ?? ""}
                      placeholder="+375 29 000-00-00"
                      disabled={pending}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Дополнительные телефоны</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPhoneField}
                      disabled={pending}
                    >
                      <PlusIcon className="size-4" aria-hidden />
                      <span className="ml-1">Добавить телефон</span>
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {phones.map((phone, index) => (
                      <div key={`phone-${index}`} className="flex gap-2">
                        <Input
                          name="phones"
                          type="tel"
                          value={phone}
                          onChange={(event) =>
                            updatePhoneField(index, event.target.value)
                          }
                          placeholder="+375 29 000-00-00"
                          disabled={pending}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive shrink-0"
                          onClick={() => removePhoneField(index)}
                          disabled={pending}
                          aria-label={`Удалить телефон ${index + 1}`}
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Дополнительные номера отображаются на публичной витрине
                    школы.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Социальные сети (URL)</Label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {SOCIAL_LINK_KEYS.map((key) => (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={`social_${key}`}>
                          {SOCIAL_LINK_LABELS[key]}
                        </Label>
                        <Input
                          id={`social_${key}`}
                          name={`social_${key}`}
                          type="text"
                          inputMode="url"
                          defaultValue={socialLinks[key]}
                          placeholder="https://"
                          disabled={pending}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="text-sm font-medium">Мессенджеры</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="messenger_viber">Viber</Label>
                    <Input
                      id="messenger_viber"
                      name="messenger_viber"
                      defaultValue={messengers.viber}
                      placeholder="Ссылка или номер"
                      disabled={pending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="messenger_telegram">Telegram</Label>
                    <Input
                      id="messenger_telegram"
                      name="messenger_telegram"
                      defaultValue={messengers.telegram}
                      placeholder="@username или ссылка"
                      disabled={pending}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="messenger_whatsapp">WhatsApp</Label>
                    <Input
                      id="messenger_whatsapp"
                      name="messenger_whatsapp"
                      defaultValue={messengers.whatsapp}
                      placeholder="Ссылка или номер"
                      disabled={pending}
                    />
                  </div>
                </div>
              </fieldset>

              <ProfileSaveFeedback state={state} />

              <Button type="submit" disabled={pending}>
                {pending ? "Сохранение…" : "Сохранить"}
              </Button>
            </TabsContent>
          </form>

          <TabsContent value="branches">
            <BranchesSection branches={branches} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
