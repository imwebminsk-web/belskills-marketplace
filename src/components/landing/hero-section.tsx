import Image from "next/image";
import Link from "next/link";
import { Award, GraduationCap, TrendingUp } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const VALUE_PROPS = [
  {
    icon: GraduationCap,
    title: "Обучайтесь новому",
    description: "Более 500+ актуальных курсов",
  },
  {
    icon: TrendingUp,
    title: "Развивайте бизнес",
    description: "Привлекайте студентов за 5 минут",
  },
  {
    icon: Award,
    title: "Получайте сертификат",
    description: "Подтверждайте навыки документально",
  },
] as const;

export function HeroSection() {
  return (
    <section className="relative bg-slate-50 pb-28 pt-16 sm:pb-32 sm:pt-20 lg:pb-36">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-14">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold tracking-tight text-balance text-slate-900 sm:text-4xl">
            Онлайн-образовательная платформа
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-slate-600">
            Современный агрегатор курсов и полноценная платформа для онлайн-обучения.
          </p>
          <Link
            href="/register"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-11 rounded-xl px-6 text-base bg-brand text-white hover:bg-brand/90",
            )}
          >
            Зарегистрироваться
          </Link>
        </div>

        <div className="relative aspect-square w-full max-w-lg justify-self-center overflow-hidden rounded-2xl shadow-xl lg:max-w-none lg:justify-self-end">
          <Image
            alt="BelSkills"
            className="object-cover object-center"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            src="/hero-illustration.png"
          />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 translate-y-1/2 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-2xl border bg-white p-8 shadow-xl">
          <ul className="grid gap-8 md:grid-cols-3 md:gap-6">
            {VALUE_PROPS.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex flex-col items-center text-center md:items-start md:text-left">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Icon className="size-6" aria-hidden />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
