"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Archive,
  Star,
  StarOff,
  Trash2,
  ArrowRight,
  ClipboardCheck,
  Truck,
  Shield,
  Wallet,
  Cog,
  Activity,
  BadgeCheck,
  Settings as SettingsIcon,
} from "lucide-react";
import type { InboxCategory, InboxMessage } from "@/lib/mock-dashboard";
import { subscribeToInbox, getInboxSnapshot } from "@/lib/inbox-store";

const CATEGORY_STYLES: Record<
  InboxCategory,
  { icon: React.ReactNode; label: string; chip: string }
> = {
  compliance: {
    icon: <ClipboardCheck className="h-3.5 w-3.5" />,
    label: "Compliance",
    chip: "border-orange-200 bg-orange-50 text-orange-800",
  },
  freight: {
    icon: <Truck className="h-3.5 w-3.5" />,
    label: "Freight",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  insurance: {
    icon: <Shield className="h-3.5 w-3.5" />,
    label: "Insurance",
    chip: "border-sky-200 bg-sky-50 text-sky-800",
  },
  financing: {
    icon: <Wallet className="h-3.5 w-3.5" />,
    label: "Financing",
    chip: "border-violet-200 bg-violet-50 text-violet-800",
  },
  equipment: {
    icon: <Cog className="h-3.5 w-3.5" />,
    label: "Equipment",
    chip: "border-stone-300 bg-stone-100 text-stone-700",
  },
  safety: {
    icon: <Activity className="h-3.5 w-3.5" />,
    label: "Safety",
    chip: "border-stone-300 bg-stone-100 text-stone-700",
  },
  authority: {
    icon: <BadgeCheck className="h-3.5 w-3.5" />,
    label: "Authority",
    chip: "border-stone-300 bg-stone-100 text-stone-700",
  },
  system: {
    icon: <SettingsIcon className="h-3.5 w-3.5" />,
    label: "System",
    chip: "border-stone-300 bg-stone-100 text-stone-700",
  },
};

type Filter = "all" | "unread" | "important" | InboxCategory;

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "important", label: "Important" },
  { value: "compliance", label: "Compliance" },
  { value: "financing", label: "Financing" },
  { value: "safety", label: "Safety" },
];

export default function InboxView({ messages }: { messages: InboxMessage[] }) {
  // Merge in-memory submissions (client-side store) with server-seeded messages
  const storeMessages = useSyncExternalStore(subscribeToInbox, getInboxSnapshot);
  const allMessages = useMemo(() => [...storeMessages, ...messages], [storeMessages, messages]);

  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string>(allMessages[0]?.id ?? "");

  const filtered = useMemo(() => {
    return allMessages.filter((m) => {
      if (filter === "all") return true;
      if (filter === "unread") return !m.read;
      if (filter === "important") return m.important;
      return m.category === filter;
    });
  }, [allMessages, filter]);

  const selected = useMemo(
    () => filtered.find((m) => m.id === selectedId) ?? filtered[0],
    [filtered, selectedId],
  );

  return (
    <div className="grid gap-px overflow-hidden border border-line bg-line lg:grid-cols-12">
      {/* List */}
      <div className="flex flex-col bg-surface lg:col-span-5 xl:col-span-4">
        <div className="flex items-center gap-1 overflow-x-auto border-b border-line bg-stone-50/40 px-4 py-2 text-[10px] font-mono uppercase tracking-[0.14em] text-stone-500">
          {FILTER_OPTIONS.map((opt) => {
            const active = filter === opt.value;
            const count = allMessages.filter((m) => {
              if (opt.value === "all") return true;
              if (opt.value === "unread") return !m.read;
              if (opt.value === "important") return m.important;
              return m.category === opt.value;
            }).length;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter(opt.value)}
                className={`whitespace-nowrap px-2.5 py-1 transition-colors ${
                  active
                    ? "border border-line-strong bg-white text-stone-800"
                    : "hover:text-stone-700"
                }`}
              >
                {opt.label}
                <span className="ml-1 text-stone-400">({count})</span>
              </button>
            );
          })}
        </div>

        <ul className="max-h-[720px] overflow-y-auto">
          {filtered.length === 0 && (
            <li className="p-8 text-center text-sm text-stone-500">
              Nothing here under this filter.
            </li>
          )}
          {filtered.map((m) => {
            const style = CATEGORY_STYLES[m.category];
            const isSelected = m.id === selected?.id;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  className={`flex w-full flex-col gap-1.5 border-b border-line px-5 py-4 text-left transition-colors ${
                    isSelected ? "bg-orange-50/60" : "hover:bg-stone-50/60"
                  } ${!m.read ? "border-l-2 border-l-orange-500 pl-[18px]" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${style.chip}`}
                    >
                      {style.icon}
                      {style.label}
                    </span>
                    <div className="flex items-center gap-2">
                      {m.important && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-stone-500">
                        {m.relativeTime}
                      </span>
                    </div>
                  </div>
                  <p
                    className={`text-sm leading-snug ${
                      m.read ? "text-stone-700" : "font-semibold text-stone-900"
                    }`}
                  >
                    {m.subject}
                  </p>
                  <p className="line-clamp-2 text-xs text-stone-500">{m.preview}</p>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Detail */}
      <div className="bg-surface lg:col-span-7 xl:col-span-8">
        {selected ? (
          <article className="flex h-full flex-col">
            <header className="border-b border-line px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${CATEGORY_STYLES[selected.category].chip}`}
                    >
                      {CATEGORY_STYLES[selected.category].icon}
                      {CATEGORY_STYLES[selected.category].label}
                    </span>
                    {selected.important && (
                      <span className="inline-flex items-center gap-1 border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-800">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        Important
                      </span>
                    )}
                  </div>
                  <h2 className="font-display mt-3 text-2xl text-stone-900">
                    {selected.subject}
                  </h2>
                  <p className="mt-2 text-xs text-stone-500">
                    From{" "}
                    <span className="font-mono text-stone-700">
                      {selected.fromName} &lt;{selected.fromEmail}&gt;
                    </span>{" "}
                    · {selected.relativeTime}
                  </p>
                </div>
                <div className="flex gap-1">
                  <IconButton title={selected.important ? "Unstar" : "Mark important"}>
                    {selected.important ? (
                      <StarOff className="h-4 w-4" />
                    ) : (
                      <Star className="h-4 w-4" />
                    )}
                  </IconButton>
                  <IconButton title="Archive">
                    <Archive className="h-4 w-4" />
                  </IconButton>
                  <IconButton title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
            </header>

            <div className="flex-1 px-6 py-6">
              <div className="prose prose-stone max-w-2xl text-[15px] leading-relaxed text-stone-800">
                {selected.body.split("\n\n").map((paragraph, i) => (
                  <p key={i} className="whitespace-pre-wrap">
                    {paragraph}
                  </p>
                ))}
              </div>

              {selected.primaryAction && (
                <div className="mt-8 border-t border-line pt-6">
                  <Link
                    href={selected.primaryAction.href}
                    className="inline-flex items-center gap-2 bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                  >
                    {selected.primaryAction.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </article>
        ) : (
          <div className="flex h-full items-center justify-center p-12 text-center text-sm text-stone-500">
            Select a message.
          </div>
        )}
      </div>
    </div>
  );
}

function IconButton({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      className="inline-flex h-8 w-8 items-center justify-center border border-line bg-white text-stone-500 transition-colors hover:border-orange-300 hover:text-orange-700"
    >
      {children}
    </button>
  );
}
