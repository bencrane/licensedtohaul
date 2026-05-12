import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-32 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
        404 / Not found
      </p>
      <h1 className="font-display mt-4 text-5xl text-stone-900 md:text-6xl text-balance">
        That page isn't on the road.
      </h1>
      <p className="mt-6 text-stone-700">
        The page you're looking for isn't here. Back to the front, or
        claim your authority.
      </p>
      <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 bg-orange-600 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
        >
          Home
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/claim"
          className="inline-flex items-center justify-center gap-2 border border-line-strong px-6 py-3.5 text-sm font-semibold text-stone-800 transition-colors hover:border-orange-500 hover:text-orange-700"
        >
          Claim Your Authority
        </Link>
      </div>
    </section>
  );
}
