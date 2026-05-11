import Link from "next/link";
import { ArrowRight, FileText, Calendar, AlertCircle } from "lucide-react";

export const metadata = {
  title: "Resources — Licensed to Haul",
  description:
    "FMCSA updates, compliance deadlines, and audit notes for active motor carriers.",
};

type Resource = {
  category: "Regulatory" | "Compliance" | "Safety";
  date: string;
  title: string;
  blurb: string;
};

const resources: Resource[] = [
  {
    category: "Regulatory",
    date: "Apr 22, 2026",
    title: "FMCSA proposed rule shortens MCS-150 biennial update cycle",
    blurb:
      "The proposed rule shortens the biennial update window. What it means for your filing cadence and how to stay ahead of the change.",
  },
  {
    category: "Compliance",
    date: "Apr 9, 2026",
    title: "Drug & Alcohol Clearinghouse Phase II — what changed",
    blurb:
      "Phase II queries are mandatory for current employees. What you need to run, when, and what triggers a violation status.",
  },
  {
    category: "Safety",
    date: "Mar 28, 2026",
    title: "CSA score interpretation: the BASICs that predict audits",
    blurb:
      "Which BASIC scores correlate with audit selection and which ones can shift without consequences.",
  },
  {
    category: "Regulatory",
    date: "Mar 14, 2026",
    title: "Hazmat endorsement renewal: TSA fingerprint update cadence",
    blurb:
      "The threat-assessment renewal window changed. How to time your endorsement renewal so authority to haul placarded loads stays intact.",
  },
  {
    category: "Compliance",
    date: "Feb 28, 2026",
    title: "IFTA Q1 filing checklist for small fleets",
    blurb:
      "What you need before April 30. Common errors that trigger audit notices. How to handle mid-quarter equipment swaps.",
  },
];

const categoryStyles: Record<Resource["category"], string> = {
  Regulatory: "bg-orange-50 text-orange-800 border-orange-200",
  Compliance: "bg-stone-100 text-stone-700 border-line-strong",
  Safety: "bg-orange-50 text-orange-800 border-orange-200",
};

const categoryIcons: Record<Resource["category"], React.ReactNode> = {
  Regulatory: <FileText className="h-3.5 w-3.5" />,
  Compliance: <Calendar className="h-3.5 w-3.5" />,
  Safety: <AlertCircle className="h-3.5 w-3.5" />,
};

export default function ResourcesPage() {
  return (
    <>
      <section className="warm-wash border-b border-line">
        <div className="mx-auto max-w-7xl px-6 pt-16 pb-12 md:pt-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
            Resources
          </p>
          <h1 className="font-display mt-4 text-5xl leading-[1.05] text-stone-900 text-balance md:text-6xl">
            Regulatory + compliance,<br />
            <span className="text-orange-600">in plain English.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-700">
            FMCSA proposed rules, compliance deadline reminders, and
            audit notes for active motor carriers.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <ul className="divide-y divide-line border-y border-line">
            {resources.map((r) => (
              <li key={r.title} className="py-8">
                <div className="grid gap-6 md:grid-cols-12">
                  <div className="md:col-span-3">
                    <span
                      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${categoryStyles[r.category]}`}
                    >
                      {categoryIcons[r.category]}
                      {r.category}
                    </span>
                    <p className="mt-3 text-xs text-stone-500">{r.date}</p>
                  </div>
                  <div className="md:col-span-9">
                    <h2 className="font-display text-2xl leading-tight text-stone-900">
                      {r.title}
                    </h2>
                    <p className="mt-3 text-[15px] leading-relaxed text-stone-700">
                      {r.blurb}
                    </p>
                    <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-orange-700">
                      Full write-up coming soon
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-line bg-stone-100">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="border border-orange-200 bg-white p-8 md:p-10">
            <div className="grid gap-8 md:grid-cols-12 md:items-center">
              <div className="md:col-span-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
                  Compliance reminders
                </p>
                <h2 className="font-display mt-3 text-2xl text-stone-900 md:text-3xl text-balance">
                  Filing deadlines pegged to your authority.
                </h2>
                <p className="mt-3 text-stone-700">
                  MCS-150 refresh, IFTA quarterly, IRP renewal,
                  biennial filings — reminders set to your specific
                  filing cadence.
                </p>
              </div>
              <div className="md:col-span-4 md:text-right">
                <Link
                  href="/claim"
                  className="inline-flex items-center justify-center gap-2 bg-orange-600 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
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
