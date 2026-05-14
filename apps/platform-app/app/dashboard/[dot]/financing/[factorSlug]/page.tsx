import { notFound } from "next/navigation";
import { Pool } from "pg";
import DealRoomCarrierView from "@/components/dashboard/DealRoomCarrierView";
import { getSubmission } from "@/lib/quote-submissions/queries";
import { getActiveFactorOfRecord } from "@/lib/factor-of-record/queries";
import { getDealRoomMessages } from "@/lib/deal-room/actions";
import { getFactorDisplayName } from "@/lib/factor-of-record/types";
import type { NoaEnvelopeRow } from "@/lib/factor-of-record/types";
import type { DisbursementRow } from "@/lib/disbursements/types";
import { getDocumentsForCarrier } from "@/lib/factor-documents/queries";

function getPool(): Pool {
  const connString = process.env.LTH_DB_POOLED_URL;
  if (!connString) throw new Error("LTH_DB_POOLED_URL not set");
  return new Pool({ connectionString: connString, max: 2 });
}

let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) _pool = getPool();
  return _pool;
}

type Props = {
  params: Promise<{ dot: string; factorSlug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { dot, factorSlug } = await params;
  const factorName = getFactorDisplayName(factorSlug);
  return { title: `Deal Room · ${factorName} · DOT ${dot} — Licensed to Haul` };
}

export default async function CarrierDealRoomPage({ params }: Props) {
  const { dot, factorSlug } = await params;
  const cleanDot = dot.replace(/\D/g, "");
  if (!cleanDot || !factorSlug) notFound();

  const factorName = getFactorDisplayName(factorSlug);

  // C5: Accessible if EITHER quote_submissions row OR active factor_of_record exists
  const [submission, activeFoR] = await Promise.all([
    getSubmission(cleanDot, factorSlug).catch(() => null),
    getActiveFactorOfRecord(cleanDot).catch(() => null),
  ]);

  // If no submission and no active FoR for this factor → 404
  const hasActiveFoRForThisFactor =
    activeFoR?.factor_slug === factorSlug;

  if (!submission && !hasActiveFoRForThisFactor) {
    notFound();
  }

  // Build a synthetic submission from the active FoR if no real submission row exists
  const effectiveSubmission = submission ?? {
    id: activeFoR!.id,
    carrierDot: cleanDot,
    factorSlug,
    quoteId: activeFoR!.noa_envelope_id ?? factorSlug,
    stage: "active" as const,
    rate: "—",
    recourseLabel: "—",
    fundingSpeed: "—",
    monthlyMinimum: null,
    notes: null,
    fieldsShared: [],
    noaEnvelopeId: activeFoR!.noa_envelope_id ?? null,
    factorOfRecordId: activeFoR!.id,
    submittedAt: activeFoR!.assigned_at,
    updatedAt: activeFoR!.assigned_at,
  };

  // Load NOA envelope if we have one
  let noaEnvelope: NoaEnvelopeRow | null = null;
  const envelopeId = effectiveSubmission.noaEnvelopeId;
  if (envelopeId) {
    const { rows } = await pool().query<NoaEnvelopeRow>(
      `SELECT id, external_id, carrier_dot, factor_slug, load_id, provider,
              provider_envelope_id, state, signed_at, signer_ip, created_at, updated_at
       FROM noa_envelopes
       WHERE id = $1
       LIMIT 1`,
      [envelopeId],
    ).catch(() => ({ rows: [] as NoaEnvelopeRow[] }));
    noaEnvelope = rows[0] ?? null;
  }

  // Load disbursements for active/disbursing stages
  let disbursements: DisbursementRow[] = [];
  if (
    effectiveSubmission.stage === "active" ||
    effectiveSubmission.stage === "disbursing" ||
    hasActiveFoRForThisFactor
  ) {
    const { rows } = await pool().query<DisbursementRow>(
      `SELECT id, factor_slug, carrier_dot, amount_cents, disbursed_at::text AS disbursed_at,
              reference_id, source, status, observed_at
       FROM disbursements
       WHERE factor_slug = $1 AND carrier_dot = $2
       ORDER BY disbursed_at DESC, observed_at DESC`,
      [factorSlug, cleanDot],
    ).catch(() => ({ rows: [] as DisbursementRow[] }));
    disbursements = rows;
  }

  // Load messages
  const messages = await getDealRoomMessages(
    { carrierDot: cleanDot, factorSlug },
  ).catch(() => []);

  // Load factor documents for this carrier/factor pair
  const documents = await getDocumentsForCarrier(cleanDot, factorSlug).catch(() => []);

  return (
    <section className="flex-1 bg-background">
      <div className="border-b border-line bg-white px-6 py-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl text-stone-900">{factorName}</h1>
            <p className="mt-1 text-sm text-stone-500">Deal room · USDOT {cleanDot}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[900px] px-6 py-8">
        <DealRoomCarrierView
          submission={effectiveSubmission}
          factorName={factorName}
          documents={documents}
          disbursements={disbursements}
          messages={messages}
        />
      </div>
    </section>
  );
}
