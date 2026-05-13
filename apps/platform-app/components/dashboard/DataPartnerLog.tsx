"use client";

// Data partner access log — shows which factors the carrier has shared data with.
// Sources from lth.transfers via a server component parent
// (future: pass transfers as props when this page is DB-backed).
export default function DataPartnerLog() {
  return (
    <div className="border border-line bg-surface px-5 py-8 text-center">
      <p className="text-sm text-stone-500">
        No data partners yet. When you submit a financing quote, the partner
        and fields shared will appear here.
      </p>
    </div>
  );
}
