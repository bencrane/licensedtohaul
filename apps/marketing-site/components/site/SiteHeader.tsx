import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Wordmark from "./Wordmark";

const navItems = [
  { href: "/opportunities", label: "Opportunities" },
  { href: "/resources", label: "Resources" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Wordmark />

        <nav className="hidden items-center gap-8 text-[15px] text-stone-700 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-orange-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/claim"
          className="group inline-flex items-center gap-1.5 bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
        >
          Claim Your Authority
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </header>
  );
}
