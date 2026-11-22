"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MunicipalityPicker({ items }: { items: { slug: string; name: string; region: string }[] }) {
  const router = useRouter();
  const [slug, setSlug] = useState(items[0]?.slug ?? "");
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (slug) router.push(`/obshtini/${slug}`);
      }}
    >
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-[13px] text-ink-2">
        Твоята община
        <select value={slug} onChange={(e) => setSlug(e.target.value)} className="min-h-12 w-full min-w-0 rounded-full border border-rule-strong bg-surface px-4 text-[15px] text-ink">
          {items.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.name} (обл. {m.region})
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="min-h-12 rounded-full bg-card-coral px-6 text-[15px] font-semibold text-on-card">
        Покажи
      </button>
    </form>
  );
}
