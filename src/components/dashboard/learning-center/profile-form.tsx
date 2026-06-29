"use client";

import { useActionState, useEffect, useState } from "react";

import {
  updateOrganizationProfile,
  type OrganizationBranchRow,
  type OrganizationProfileRow,
  type UpdateOrganizationProfileState,
} from "@/app/actions/showcase-actions";
import { BranchesSection } from "@/components/dashboard/learning-center/branches-section";
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
  SHORT_DESCRIPTION_MAX,
} from "@/lib/organization/showcase-profile";

const initialState: UpdateOrganizationProfileState = {};

type ProfileFormProps = {
  profile: OrganizationProfileRow;
  branches: OrganizationBranchRow[];
  organizationId: string;
  organizationName: string;
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
  organizationName,
}: ProfileFormProps) {
  const messengers = parseProfileMessengers(profile.messengers);
  const [shortDescription, setShortDescription] = useState(
    profile.short_description ?? "",
  );
  const [longDescriptionHtml, setLongDescriptionHtml] = useState(
    profile.long_description ?? "",
  );

  const [state, formAction, pending] = useActionState(
    updateOrganizationProfile,
    initialState,
  );

  useEffect(() => {
    setShortDescription(profile.short_description ?? "");
    setLongDescriptionHtml(profile.long_description ?? "");
  }, [profile.short_description, profile.long_description]);

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
              <LogoUploader
                organizationId={organizationId}
                initialLogoUrl={profile.logo_url}
                organizationName={organizationName}
              />

              <SlugField initialSlug={profile.slug} />

              <div className="space-y-2">
                <Label htmlFor="public_name">Публичное название</Label>
                <Input
                  id="public_name"
                  name="public_name"
                  defaultValue={profile.public_name}
                  required
                  placeholder="Название для каталога"
                />
              </div>

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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_main">Телефон</Label>
                  <Input
                    id="phone_main"
                    name="phone_main"
                    type="tel"
                    defaultValue={profile.phone_main ?? ""}
                    placeholder="+375 29 000-00-00"
                  />
                </div>
              </div>

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
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="messenger_telegram">Telegram</Label>
                    <Input
                      id="messenger_telegram"
                      name="messenger_telegram"
                      defaultValue={messengers.telegram}
                      placeholder="@username или ссылка"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="messenger_whatsapp">WhatsApp</Label>
                    <Input
                      id="messenger_whatsapp"
                      name="messenger_whatsapp"
                      defaultValue={messengers.whatsapp}
                      placeholder="Ссылка или номер"
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
