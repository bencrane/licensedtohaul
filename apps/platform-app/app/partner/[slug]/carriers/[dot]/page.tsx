import { notFound } from "next/navigation";
import { Pool } from "pg";
import MessageList from "@/components/deal-room/MessageList";
import ComposeForm from "@/components/deal-room/ComposeForm";
import { getDealRoomMessages } from "@/lib/deal-room/actions";

function getPool(): Pool {
  const connString = process.env.HQX_DB_URL_POOLED;
  if (!connString) throw new Error("HQX_DB_URL_POOLED not set");
  return new Pool({ connectionString: connString, max: 2 });
}

let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) _pool = getPool();
  return _pool;
}

type Props = {
  params: Promise<{ slug: string; dot: string }>;
};

// Minimal carrier name registry (same convention as factor display names)
const CARRIER_NAMES: Record<string, string> = {
  "1234567": "Ridgeline Freight LLC",
};

function getCarrierName(dot: string): string {
  return CARRIER_NAMES[dot] ?? `Carrier DOT ${dot}`;
}

export async function generateMetadata({ params }: Props) {
  const { slug, dot } = await params;
  return { title: `Deal Room · DOT ${dot} · ${slug} — Licensed to Haul` };
}

export default async function PartnerDealRoomPage({ params }: Props) {
  const { slug, dot } = await params;
  if (!slug || !dot) notFound();

  const SCHEMA = process.env.LTH_SCHEMA ?? "lth";

  // Load FoR + NOA envelope state
  const { rows: forRows } = await pool().query<{
    id: string;
    status: string;
    assigned_at: Date;
    noa_state: string | null;
  }>(
    `SELECT f.id, f.status, f.assigned_at, e.state AS noa_state
     FROM "${SCHEMA}".factor_of_record f
     LEFT JOIN "${SCHEMA}".noa_envelopes e ON e.id = f.noa_envelope_id
     WHERE f.factor_slug = $1 AND f.carrier_dot = $2
     ORDER BY f.assigned_at DESC
     LIMIT 1`,
    [slug, dot],
  ).catch(() => ({ rows: [] as { id: string; status: string; assigned_at: Date; noa_state: string | null }[] }));

  const forRow = forRows[0];
  const noaStatus = forRow?.noa_state ?? null;

  // Load messages
  const messages = await getDealRoomMessages(
    { carrierDot: dot, factorSlug: slug },
  ).catch(() => []);

  const carrierName = getCarrierName(dot);

  return (
    <div className="flex-1 bg-background">
      <div className="border-b border-line bg-white px-6 py-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl text-stone-900">{carrierName}</h1>
            <p className="mt-1 text-sm text-stone-500">DOT {dot} · Deal room</p>
          </div>
          {noaStatus && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500">NOA Status:</span>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                noaStatus === "completed"
                  ? "bg-green-100 text-green-700"
                  : noaStatus === "sent"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-amber-100 text-amber-700"
              }`}>
                {noaStatus.charAt(0).toUpperCase() + noaStatus.slice(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[900px] space-y-6 px-6 py-8">
        {/* Status cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-line bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">NOA Status</p>
            <p className="mt-1 text-sm font-medium text-stone-900">
              {noaStatus
                ? noaStatus.charAt(0).toUpperCase() + noaStatus.slice(1)
                : "No NOA on file"}
            </p>
          </div>
          <div className="border border-line bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Factor of Record</p>
            <p className="mt-1 text-sm font-medium text-stone-900">
              {forRow?.status === "active" ? "Active" : forRow?.status ?? "None"}
            </p>
          </div>
        </div>

        {/* Message thread */}
        <div className="border border-line bg-white p-6">
          <h2 className="mb-4 font-display text-lg text-stone-900">
            Messages ({messages.length})
          </h2>
          <MessageList messages={messages} viewerSide="partner" />
          <div className="mt-4">
            <ComposeForm carrierDot={dot} factorSlug={slug} senderSide="partner" />
          </div>
        </div>
      </div>
    </div>
  );
}
