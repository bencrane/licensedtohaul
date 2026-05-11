import { Construction, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  backHref: string;
  backLabel?: string;
};

export default function SectionPlaceholder({
  eyebrow,
  title,
  description,
  backHref,
  backLabel = "Back to Overview",
}: Props) {
  return (
    <section className="flex-1">
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <span className="inline-flex h-10 w-10 items-center justify-center border border-orange-200 bg-orange-50 text-orange-700">
          <Construction className="h-5 w-5" />
        </span>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
          {eyebrow}
        </p>
        <h1 className="font-display mt-3 text-4xl text-stone-900">{title}</h1>
        <p className="mt-4 text-stone-600">{description}</p>
        <Link
          href={backHref}
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-orange-700 transition-colors hover:text-orange-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
      </div>
    </section>
  );
}
