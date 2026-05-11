import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { CATEGORIES, categoryBySlug } from "@/lib/opportunities";

type Props = {
  params: Promise<{ category: string }>;
};

export async function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  const c = categoryBySlug(category);
  if (!c) return { title: "Not found" };
  return {
    title: `${c.title} — Licensed to Haul`,
    description: c.blurb,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const c = categoryBySlug(category);
  if (!c) notFound();

  return (
    <>
      <section className="warm-wash border-b border-line">
        <div className="mx-auto max-w-7xl px-6 pt-12 pb-16">
          <Link
            href="/opportunities"
            className="group inline-flex items-center gap-1.5 text-sm text-stone-600 transition-colors hover:text-orange-700"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            All Opportunities
          </Link>

          <div className="mt-8 grid gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
                {c.shortName}
              </p>
              <h1 className="font-display mt-4 text-5xl leading-[1.05] text-stone-900 text-balance md:text-6xl">
                {c.headline}
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-relaxed text-stone-700">
                {c.blurb}
              </p>
            </div>

            <div className="md:col-span-5">
              <div className="border border-line-strong bg-white p-7 shadow-[0_24px_60px_-30px_rgba(26,20,16,0.18)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
                  Get this in your dashboard
                </p>
                <h2 className="font-display mt-3 text-2xl text-stone-900">
                  Claim your authority.
                </h2>
                <p className="mt-3 text-sm text-stone-700">
                  USDOT and email. Dashboard link by email within a few minutes.
                </p>
                <Link
                  href={`/claim?next=${c.slug}`}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                >
                  Claim Your Authority
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="grid gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-4">
              <h2 className="font-display text-3xl leading-tight text-stone-900 md:text-4xl text-balance">
                What you get.
              </h2>
            </div>
            <ul className="md:col-span-8 space-y-5">
              {c.whatYouGet.map((item) => (
                <li key={item} className="flex gap-4 border-b border-line pb-5 last:border-b-0">
                  <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center bg-orange-600 text-white">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <p className="text-[17px] leading-relaxed text-stone-800">
                    {item}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-stone-100">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="grid gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-4">
              <h2 className="font-display text-3xl leading-tight text-stone-900 md:text-4xl text-balance">
                Worth claiming if…
              </h2>
            </div>
            <ul className="md:col-span-8 space-y-4 text-[17px] leading-relaxed text-stone-800">
              {c.goodIf.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 inline-flex h-1.5 w-1.5 flex-none rounded-full bg-orange-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-24">
          <div className="border border-orange-200 bg-gradient-to-br from-orange-50 via-stone-50 to-stone-50 p-10 md:p-14">
            <div className="grid gap-10 md:grid-cols-12 md:items-center">
              <div className="md:col-span-8">
                <h2 className="font-display text-3xl leading-tight text-stone-900 md:text-4xl text-balance">
                  See this in your dashboard.
                </h2>
                <p className="mt-3 max-w-xl text-stone-700">
                  USDOT and email. Dashboard link in your inbox.
                </p>
              </div>
              <div className="md:col-span-4 md:text-right">
                <Link
                  href={`/claim?next=${c.slug}`}
                  className="inline-flex items-center justify-center gap-2 bg-orange-600 px-7 py-4 text-[15px] font-semibold text-white transition-colors hover:bg-orange-700"
                >
                  Claim Your Authority
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
