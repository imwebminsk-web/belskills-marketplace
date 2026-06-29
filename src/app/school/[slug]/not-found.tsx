import Link from "next/link";

import { WithSiteHeader } from "@/components/site/with-site-header";
import { Button } from "@/components/ui/button";

export default function SchoolNotFound() {
  return (
    <WithSiteHeader>
      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Школа не найдена
        </h1>
        <p className="text-muted-foreground text-sm">
          Возможно, ссылка устарела, адрес школы изменился или учебный центр ещё
          не опубликовал витрину.
        </p>
        <div className="flex justify-center">
          <Button asChild variant="default">
            <Link href="/">Вернуться в каталог курсов</Link>
          </Button>
        </div>
      </main>
    </WithSiteHeader>
  );
}
