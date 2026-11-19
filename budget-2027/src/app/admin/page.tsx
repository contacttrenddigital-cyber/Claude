import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { db } from "@/lib/db";
import { hasRole, type Role } from "@/lib/auth/core";
import { adminEnabled, currentUser } from "@/lib/auth/session";
import { dateBg } from "@/lib/format";
import { logout, publishSnapshot } from "./actions";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Администрация", robots: { index: false, follow: false } };

const fmtTime = (d: Date | null) => (d ? `${dateBg(d.toISOString())} ${d.toISOString().slice(11, 16)} UTC` : "—");

export default async function Admin() {
  const enabled = adminEnabled();
  const user = enabled ? await currentUser() : null;
  return (
    <>
      <SiteHeader status="администрация" />
      <main id="main" className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pt-10 pb-20 sm:px-6">
        <h1 className="text-4xl font-semibold tracking-tight">Администрация</h1>
        {!enabled && (
          <p className="max-w-2xl text-ink-2">
            Админ панелът е изключен: задайте променливата на средата <code className="font-mono">SESSION_SECRET</code> (поне 32 знака) и
            създайте потребител със <code className="font-mono">scripts/create-user.ts</code>.
          </p>
        )}
        {enabled && !user && <LoginForm />}
        {enabled && user && <Dashboard user={{ id: user.id, email: user.email, role: user.role as Role }} />}
      </main>
    </>
  );
}

async function Dashboard({ user }: { user: { id: string; email: string; role: Role } }) {
  const [snapshots, jobs, audit] = await Promise.all([
    db.dataSnapshot.findMany({ orderBy: { createdAt: "desc" }, include: { checks: { select: { status: true } } }, take: 20 }),
    db.importJob.findMany({ orderBy: { startedAt: "desc" }, take: 15 }),
    db.auditLog.findMany({ orderBy: { at: "desc" }, take: 40, include: { user: { select: { email: true } } } }),
  ]);
  const canPublish = hasRole(user.role, "publisher");
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span>
          {user.email} · роля <strong>{user.role}</strong>
        </span>
        <form action={logout}>
          <button className="min-h-11 rounded-sm border border-rule-strong px-3">Изход</button>
        </form>
      </div>

      <section aria-labelledby="snaps" className="flex flex-col gap-3">
        <h2 id="snaps" className="text-xl font-semibold">
          Снимки на данните
        </h2>
        <div className="overflow-x-auto">
          <table className="num w-full text-sm">
            <thead>
              <tr className="border-b border-rule-strong text-xs text-muted">
                <th scope="col" className="py-2 pr-3 text-left font-normal">Снимка</th>
                <th scope="col" className="py-2 pr-3 text-left font-normal">Създадена</th>
                <th scope="col" className="py-2 pr-3 text-left font-normal">Статус</th>
                <th scope="col" className="py-2 pr-3 text-right font-normal">Проверки ✓ / ! / ✗</th>
                <th scope="col" className="py-2 text-right font-normal">Действие</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => {
                const c = (st: string) => s.checks.filter((x) => x.status === st).length;
                const current = s.publishedAt && !s.supersededAt;
                return (
                  <tr key={s.id} className="border-b border-rule">
                    <th scope="row" className="py-2 pr-3 text-left font-mono text-xs font-normal">{s.id}</th>
                    <td className="py-2 pr-3">{fmtTime(s.createdAt)}</td>
                    <td className="py-2 pr-3">
                      {current ? `публикувана (${s.publishedBy})` : s.supersededAt ? "заменена" : "непубликувана"}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {c("pass")} / {c("warn")} / {c("fail")}
                    </td>
                    <td className="py-2 text-right">
                      {canPublish && !current && c("fail") === 0 ? (
                        <form action={publishSnapshot}>
                          <input type="hidden" name="snapshotId" value={s.id} />
                          <button className="min-h-11 rounded-sm border border-rule-strong px-3 text-xs">Публикувай</button>
                        </form>
                      ) : (
                        <span className="text-xs text-muted">{current ? "текуща" : canPublish ? "—" : "само за публикатор"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="jobs" className="flex flex-col gap-3">
        <h2 id="jobs" className="text-xl font-semibold">
          Импорти
        </h2>
        <ul className="flex flex-col text-sm">
          {jobs.map((j) => (
            <li key={j.id} className="border-b border-rule py-1.5">
              {fmtTime(j.startedAt)} · {j.kind} · <strong>{j.status}</strong> {j.snapshotId && <span className="font-mono text-xs">{j.snapshotId}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="audit" className="flex flex-col gap-3">
        <h2 id="audit" className="text-xl font-semibold">
          Одит лог
        </h2>
        <ul className="flex flex-col text-sm">
          {audit.map((a) => (
            <li key={a.id} className="border-b border-rule py-1.5">
              {fmtTime(a.at)} · {a.user?.email ?? "скрипт"} · <strong>{a.action}</strong> · <span className="font-mono text-xs">{a.target}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
