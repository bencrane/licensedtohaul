import Link from "next/link";

type Props = {
  className?: string;
  href?: string;
};

export default function Wordmark({ className = "", href = "/" }: Props) {
  return (
    <Link href={href} className={`group inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden
        className="relative inline-flex h-7 w-7 items-center justify-center"
      >
        <svg
          viewBox="0 0 28 28"
          className="h-7 w-7 text-orange-600 transition-colors group-hover:text-orange-700"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2 L25 7 V15 C25 21 20 25.5 14 26 C8 25.5 3 21 3 15 V7 Z" />
          <path d="M9 14 L13 18 L20 11" />
        </svg>
      </span>
      <span className="font-display text-[1.05rem] tracking-tight leading-none text-stone-900">
        Licensed<span className="text-orange-600"> to </span>Haul
      </span>
    </Link>
  );
}
