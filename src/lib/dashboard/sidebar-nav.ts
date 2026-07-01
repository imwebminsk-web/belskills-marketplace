import type { LucideIcon } from "lucide-react";
import {
  BookOpenIcon,
  Building2Icon,
  CheckSquare,
  CreditCardIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  LibraryIcon,
  LifeBuoyIcon,
  ReceiptTextIcon,
  SettingsIcon,
  StoreIcon,
  TicketIcon,
  Users,
  UsersIcon,
  Wallet,
} from "lucide-react";

import type { Database } from "@/types/database.types";

export type ProfileRole = Database["public"]["Enums"]["profile_role"];

export type SidebarNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

export type SidebarNavGroup = {
  /** Заголовок секции (например «Администрирование»). Только для global admin. */
  title?: string;
  items: SidebarNavItem[];
};

const adminPlatformItems: SidebarNavItem[] = [
  { title: "Главная", url: "/dashboard", icon: LayoutDashboardIcon },
  {
    title: "Категории и теги",
    url: "/dashboard/admin/taxonomies",
    icon: LibraryIcon,
  },
  {
    title: "Тарифы",
    url: "/dashboard/admin/tariffs",
    icon: CreditCardIcon,
  },
  {
    title: "Настройки биллинга",
    url: "/dashboard/admin/settings/billing",
    icon: SettingsIcon,
  },
  {
    title: "Счета клиентов",
    url: "/dashboard/admin/invoices",
    icon: Wallet,
  },
  {
    title: "Промокоды",
    url: "/dashboard/admin/coupons",
    icon: TicketIcon,
  },
];

const adminModerationItems: SidebarNavItem[] = [
  {
    title: "Учебные центры",
    url: "/dashboard/admin/organizations",
    icon: Building2Icon,
  },
  {
    title: "Курсы",
    url: "/dashboard/admin/courses",
    icon: BookOpenIcon,
  },
];

export function getSidebarNavGroupsForRole(role: ProfileRole): SidebarNavGroup[] {
  if (role === "admin") {
    return [
      { items: adminPlatformItems },
      {
        title: "Администрирование",
        items: adminModerationItems,
      },
      {
        items: [
          { title: "Поддержка", url: "/dashboard/support", icon: LifeBuoyIcon },
        ],
      },
    ];
  }

  if (role === "teacher") {
    return [
      {
        items: [
          { title: "Мои курсы", url: "/dashboard/courses", icon: BookOpenIcon },
          { title: "Группы", url: "/dashboard/cohorts", icon: UsersIcon },
          { title: "Ученики", url: "/dashboard/students", icon: Users },
          { title: "Тесты", url: "/dashboard/tests", icon: CheckSquare },
          {
            title: "Учебный центр",
            url: "/dashboard/learning-center",
            icon: StoreIcon,
          },
          {
            title: "Тарифы",
            url: "/dashboard/tariffs",
            icon: CreditCardIcon,
          },
          {
            title: "Счета и акты",
            url: "/dashboard/invoices",
            icon: ReceiptTextIcon,
          },
          {
            title: "Поддержка",
            url: "/dashboard/support",
            icon: LifeBuoyIcon,
          },
        ],
      },
    ];
  }

  return [
    {
      items: [
        {
          title: "Моё обучение",
          url: "/dashboard",
          icon: GraduationCapIcon,
        },
        { title: "Каталог", url: "/", icon: BookOpenIcon },
        { title: "Поддержка", url: "/dashboard/support", icon: LifeBuoyIcon },
      ],
    },
  ];
}

/** Плоский список пунктов (legacy / AppSidebar). */
export function getSidebarNavForRole(role: ProfileRole): SidebarNavItem[] {
  return getSidebarNavGroupsForRole(role).flatMap((group) => group.items);
}
