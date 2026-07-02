"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, Trash2Icon } from "lucide-react";

import {
  softDeleteOrganizationProfile,
  updateContactsProfile,
  updateMainProfile,
  type OrganizationBranchRow,
  type OrganizationProfileRow,
  type UpdateOrganizationProfileState,
} from "@/app/actions/showcase-actions";
import { BranchesSection } from "@/components/dashboard/learning-center/branches-section";
import { CoverUploader } from "@/components/dashboard/learning-center/cover-uploader";
import { GalleryUploader } from "@/components/dashboard/learning-center/gallery-uploader";
import { LogoUploader } from "@/components/dashboard/learning-center/logo-uploader";
import { ProfileStatusBanner } from "@/components/dashboard/learning-center/profile-status-banner";
import { SlugField } from "@/components/dashboard/learning-center/slug-field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { parseShowcaseStatus } from "@/lib/organization/profile-status";
import {
  parseProfileMessengers,
  parseProfileSocialLinks,
  SHORT_DESCRIPTION_MAX,
  SOCIAL_LINK_KEYS,
  SOCIAL_LINK_LABELS,
} from "@/lib/organization/showcase-profile";
import { cn } from "@/lib/utils";
import type { OrganizationTypeValue } from "@/lib/validations/organization-schema";

const initialState: UpdateOrganizationProfileState = {};

/**
 * Активная вкладка как в nav-main.tsx (`bg-brand/10 text-brand`).
 * Базовый TabsTrigger задаёт active через
 * `group-data-[variant=default]/tabs-list:data-active:bg-background` —
 * с более высокой специфичностью, чем простой `data-[state=active]:…`.
 * Поэтому переопределяем те же group-селекторы с `!`.
 */
const profileTabTriggerClass = cn(
  "h-9 min-h-9 flex-1 rounded-md px-3 py-2 text-sm font-normal",
  "bg-transparent text-muted-foreground",
  "hover:text-foreground",
  "focus-visible:ring-0 focus-visible:outline-none",
  "group-data-[variant=default]/tabs-list:data-active:!bg-brand/10",
  "group-data-[variant=default]/tabs-list:data-active:!text-brand",
  "group-data-[variant=default]/tabs-list:data-active:!shadow-none",
  "group-data-[variant=default]/tabs-list:data-active:font-medium",
  "group-data-[variant=default]/tabs-list:dark:data-active:!bg-brand/10",
  "group-data-[variant=default]/tabs-list:dark:data-active:!text-brand",
  "group-data-[variant=default]/tabs-list:dark:data-active:!border-transparent",
);

function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden>
      {" "}
      *
    </span>
  );
}

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
  organizationType?: OrganizationTypeValue;
  /** When true, hides owner moderation controls and dangerous delete actions. */
  adminMode?: boolean;
};

type PendingFormTarget = "main" | "contacts";

function ProfileSaveFeedback({
  state,
  successMessage = "Профиль сохранён.",
}: {
  state: UpdateOrganizationProfileState;
  successMessage?: string;
}) {
  return (
    <>
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-brand text-sm">{successMessage}</p>
      ) : null}
    </>
  );
}

export function ProfileForm({
  profile,
  branches,
  organizationId,
  organizationType = "school",
  adminMode = false,
}: ProfileFormProps) {
  const router = useRouter();
  const messengers = parseProfileMessengers(profile.messengers);
  const socialLinks = parseProfileSocialLinks(profile.social_links);
  const status = parseShowcaseStatus(profile.status);
  const isBlocked = status === "blocked";

  const [shortDescription, setShortDescription] = useState(
    profile.short_description ?? "",
  );
  const [longDescriptionHtml, setLongDescriptionHtml] = useState(
    profile.long_description ?? "",
  );
  const [phones, setPhones] = useState<string[]>(() =>
    initialAdditionalPhones(profile.phones),
  );
  const [resubmitToModeration, setResubmitToModeration] = useState(false);
  const [editGuardOpen, setEditGuardOpen] = useState(false);
  const [editGuardTarget, setEditGuardTarget] =
    useState<PendingFormTarget | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const brandLabel =
    organizationType === "corporate"
      ? "Название организации"
      : "Неофициальное название (Бренд)";
  const brandPlaceholder =
    organizationType === "corporate"
      ? "Например: ООО 'Рога и Копыта'"
      : "Например, Belskills Academy";

  const mainFormRef = useRef<HTMLFormElement>(null);
  const contactsFormRef = useRef<HTMLFormElement>(null);
  const resubmitPendingRef = useRef<PendingFormTarget | null>(null);
  const allowPublishedSubmitRef = useRef(false);

  const [mainState, mainAction, mainPending] = useActionState(
    updateMainProfile,
    initialState,
  );
  const [contactsState, contactsAction, contactsPending] = useActionState(
    updateContactsProfile,
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

  useEffect(() => {
    if (mainState.success || contactsState.success) {
      setResubmitToModeration(false);
      router.refresh();
    }
  }, [mainState.success, contactsState.success, router]);

  useEffect(() => {
    const target = resubmitPendingRef.current;
    if (!target || !resubmitToModeration) {
      return;
    }

    allowPublishedSubmitRef.current = true;

    if (target === "main") {
      mainFormRef.current?.requestSubmit();
    } else {
      contactsFormRef.current?.requestSubmit();
    }

    allowPublishedSubmitRef.current = false;
    resubmitPendingRef.current = null;
    setResubmitToModeration(false);
  }, [resubmitToModeration]);

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

  function handleFormSubmit(
    event: React.FormEvent<HTMLFormElement>,
    target: PendingFormTarget,
  ) {
    if (adminMode) {
      return;
    }

    if (
      status === "published" &&
      !allowPublishedSubmitRef.current &&
      !resubmitToModeration
    ) {
      event.preventDefault();
      setEditGuardTarget(target);
      setEditGuardOpen(true);
    }
  }

  function confirmEditGuard() {
    setEditGuardOpen(false);
    setResubmitToModeration(true);
    resubmitPendingRef.current = editGuardTarget;
    setEditGuardTarget(null);
  }

  function handleDeleteProfile() {
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await softDeleteOrganizationProfile(
        deleteConfirmName,
        organizationId,
      );
      if (result.error) {
        setDeleteError(result.error);
        return;
      }

      setDeleteDialogOpen(false);
      setDeleteConfirmName("");
      router.refresh();
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
        {!adminMode ? (
          <div className="mb-6">
            <ProfileStatusBanner
              profile={profile}
              organizationId={organizationId}
            />
          </div>
        ) : null}

        <Tabs defaultValue="main" className="w-full">
          <TabsList className="mb-6 grid h-auto w-full grid-cols-3 gap-1 rounded-lg bg-transparent p-1">
            <TabsTrigger value="main" className={profileTabTriggerClass}>
              Основное
            </TabsTrigger>
            <TabsTrigger value="contacts" className={profileTabTriggerClass}>
              Контакты
            </TabsTrigger>
            <TabsTrigger value="branches" className={profileTabTriggerClass}>
              Филиалы
            </TabsTrigger>
          </TabsList>

          <TabsContent value="main" className="space-y-6">
            <form
              ref={mainFormRef}
              action={mainAction}
              className="space-y-6"
              onSubmit={(event) => handleFormSubmit(event, "main")}
            >
              <input type="hidden" name="organization_id" value={organizationId} />
              <input
                type="hidden"
                name="resubmit_to_moderation"
                value={resubmitToModeration ? "1" : "0"}
              />
              <input
                type="hidden"
                name="long_description"
                value={longDescriptionHtml}
              />

              <fieldset
                className="space-y-4 rounded-lg border p-4"
                disabled={isBlocked}
              >
                <legend className="px-1 text-sm font-medium">
                  Юридическая информация
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="unp">
                      УНП
                      <RequiredMark />
                    </Label>
                    <Input
                      id="unp"
                      name="unp"
                      defaultValue={profile.unp ?? ""}
                      placeholder="123456789"
                      required
                      disabled={mainPending || isBlocked}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="legal_name">
                      Юридическое название
                      <RequiredMark />
                    </Label>
                    <Input
                      id="legal_name"
                      name="legal_name"
                      defaultValue={profile.legal_name ?? ""}
                      placeholder='ООО "Учебный центр"'
                      required
                      disabled={mainPending || isBlocked}
                    />
                  </div>
                </div>
              </fieldset>

              <div className="space-y-2">
                <Label htmlFor="public_name">
                  {brandLabel}
                </Label>
                <Input
                  id="public_name"
                  name="public_name"
                  defaultValue={profile.public_name}
                  placeholder={brandPlaceholder}
                  disabled={mainPending || isBlocked}
                />
                <p className="text-muted-foreground text-xs">
                  Отображается на витрине. Если оставить пустым, будет
                  использовано юридическое или системное название организации.
                </p>
              </div>

              <LogoUploader
                organizationId={organizationId}
                initialLogoUrl={profile.logo_url}
                brandDisplayName={profile.public_name}
              />

              <SlugField
                initialSlug={profile.slug}
                organizationId={organizationId}
              />

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
                  disabled={mainPending || isBlocked}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="long_description">Подробное описание</Label>
                <Editor
                  id="long_description"
                  value={longDescriptionHtml}
                  onChange={setLongDescriptionHtml}
                  disabled={mainPending || isBlocked}
                />
                <p className="text-muted-foreground text-xs">
                  Заголовки, списки и выделение сохраняются как HTML для
                  публичной страницы учебного центра.
                </p>
              </div>

              <CoverUploader
                initialCoverUrl={profile.cover_url}
                disabled={mainPending || isBlocked}
              />

              <GalleryUploader
                initialUrls={profile.gallery ?? []}
                disabled={mainPending || isBlocked}
              />

              <ProfileSaveFeedback
                state={mainState}
                successMessage="Основные данные сохранены."
              />

              <Button type="submit" disabled={mainPending || isBlocked}>
                {mainPending ? "Сохранение…" : "Сохранить основное"}
              </Button>

              {!adminMode ? (
                <div className="space-y-4 rounded-lg border border-destructive/50 p-4">
                  <div>
                    <h3 className="text-destructive text-sm font-semibold">
                      Опасная зона
                    </h3>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Удаление скрывает профиль из каталога и панели управления.
                      Данные сохраняются в системе.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteConfirmName("");
                      setDeleteDialogOpen(true);
                    }}
                    disabled={isBlocked}
                  >
                    Удалить профиль
                  </Button>
                </div>
              ) : null}
            </form>
          </TabsContent>

          <TabsContent value="contacts" className="space-y-6">
            <form
              ref={contactsFormRef}
              action={contactsAction}
              className="space-y-6"
              onSubmit={(event) => handleFormSubmit(event, "contacts")}
            >
              <input type="hidden" name="organization_id" value={organizationId} />
              <input
                type="hidden"
                name="resubmit_to_moderation"
                value={resubmitToModeration ? "1" : "0"}
              />

              <fieldset
                className="space-y-4 rounded-lg border p-4"
                disabled={isBlocked}
              >
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
                      disabled={contactsPending || isBlocked}
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
                      disabled={contactsPending || isBlocked}
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
                      disabled={contactsPending || isBlocked}
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
                          disabled={contactsPending || isBlocked}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive shrink-0"
                          onClick={() => removePhoneField(index)}
                          disabled={contactsPending || isBlocked}
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
                          type="url"
                          inputMode="url"
                          defaultValue={socialLinks[key]}
                          placeholder="https://"
                          disabled={contactsPending || isBlocked}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </fieldset>

              <fieldset
                className="space-y-4 rounded-lg border p-4"
                disabled={isBlocked}
              >
                <legend className="px-1 text-sm font-medium">Мессенджеры</legend>
                <p className="text-muted-foreground text-xs">
                  Только прямые ссылки — без номеров телефона.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="messenger_telegram">Ссылка на Telegram</Label>
                    <Input
                      id="messenger_telegram"
                      name="messenger_telegram"
                      type="url"
                      inputMode="url"
                      defaultValue={messengers.telegram}
                      placeholder="https://t.me/username"
                      disabled={contactsPending || isBlocked}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="messenger_viber">Ссылка на Viber</Label>
                    <Input
                      id="messenger_viber"
                      name="messenger_viber"
                      type="url"
                      inputMode="url"
                      defaultValue={messengers.viber}
                      placeholder="https://viber.click/..."
                      disabled={contactsPending || isBlocked}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="messenger_whatsapp">Ссылка на WhatsApp</Label>
                    <Input
                      id="messenger_whatsapp"
                      name="messenger_whatsapp"
                      type="url"
                      inputMode="url"
                      defaultValue={messengers.whatsapp}
                      placeholder="https://wa.me/375290000000"
                      disabled={contactsPending || isBlocked}
                    />
                  </div>
                </div>
              </fieldset>

              <ProfileSaveFeedback
                state={contactsState}
                successMessage="Контакты сохранены."
              />

              <Button type="submit" disabled={contactsPending || isBlocked}>
                {contactsPending ? "Сохранение…" : "Сохранить контакты"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="branches">
            <BranchesSection
              branches={branches}
              organizationId={organizationId}
            />
          </TabsContent>
        </Tabs>

        <AlertDialog open={editGuardOpen} onOpenChange={setEditGuardOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Изменение опубликованного профиля</AlertDialogTitle>
              <AlertDialogDescription>
                Внимание! Любое изменение профиля требует повторной проверки.
                Ваша страница будет временно скрыта из каталога до одобрения
                модератором.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={confirmEditGuard}>
                Понятно, отправить на проверку
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить профиль?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие скроет витрину школы. Для подтверждения введите
                юридическое название:{" "}
                <span className="text-foreground font-medium">
                  {profile.legal_name?.trim() || 'указанное в профиле'}
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Label htmlFor="delete-legal-name" className="sr-only">
                Юридическое название для подтверждения
              </Label>
              <Input
                id="delete-legal-name"
                value={deleteConfirmName}
                onChange={(event) => setDeleteConfirmName(event.target.value)}
                placeholder="Введите юридическое название"
                autoComplete="off"
              />
              {deleteError ? (
                <p className="text-destructive mt-2 text-sm" role="alert">
                  {deleteError}
                </p>
              ) : null}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                disabled={
                  isDeleting ||
                  deleteConfirmName.trim() !== (profile.legal_name?.trim() ?? "")
                }
                onClick={(event) => {
                  event.preventDefault();
                  handleDeleteProfile();
                }}
              >
                {isDeleting ? "Удаление…" : "Удалить профиль"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
