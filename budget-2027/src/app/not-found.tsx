import Link from "next/link";
import { Icon } from "@/components/site/Icon";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto flex max-w-2xl flex-col items-start gap-5 px-4 py-24 sm:px-6">
        <p className="num rounded-full bg-surface-2 px-3 py-1 text-[13px] font-medium text-accent">404</p>
        <h1 className="text-4xl font-semibold tracking-tight">Тази страница не съществува</h1>
        <p className="text-[17px] text-ink-2">Може адресът да е сгрешен или страницата да е преместена. Ето откъде да продължиш:</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-[15px] font-semibold text-bg">
            Към началото
          </Link>
          <Link href="/kalkulator" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-rule-strong px-5 text-[15px] font-medium">
            <Icon name="calculator" className="h-4 w-4" /> Калкулатор
          </Link>
          <Link href="/dokumenti" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-rule-strong px-5 text-[15px] font-medium">
            <Icon name="search" className="h-4 w-4" /> Търсене в документите
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
