import { notFound } from "next/navigation";
import { Pool } from "pg";
import MessageList from "@/components/deal-room/MessageList";
import ComposeForm from "@/components/deal-room/ComposeForm";
import { getDealRoomMessages } from "@/lib/deal-room/actions";
import { getFactorDisplayName } from "@/lib/factor-of-record/types";

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

  const SCHEMA = process.env.LTH_SCHEMA ?? "lth";
  const factorName = getFactorDisplayName(factorSlug);

  // Load NOA state
  const { rows: envRows } = await pool().query<{
    state: string;
    provider: string;
  }>(
    `SELECT e.state, e.provider
     FROM "${SCHEMA}".noa_envelopes e
     JOIN "${SCHEMA}".factor_of_record f ON f.noa_envelope_id = e.id
     WHERE f.carrier_dot = $1 AND f.factor_slug = $2 AND f.status = 'active'
     LIMIT 1`,
    [cleanDot, factorSlug],
  ).catch(() => ({ rows: [] as { state: string; provider: string }[] }));

  const noaState = envRows[0]?.state ?? null;

  // Load messages
  const messages = await getDealRoomMessages(
    { carrierDot: cleanDot, factorSlug },
  ).catch(() => []);

  return (
    <section className="flex-1 bg-background">
      <div className="border-b border-line bg-white px-6 py-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl text-stone-900">{factorName}</h1>
            <p className="mt-1 text-sm text-stone-500">Deal room · USDOT {cleanDot}</p>
          </div>
          {noaState && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500">NOA Status:</span>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                noaState === "completed"
                  ? "bg-green-100 text-green-700"
                  : noaState === "sent"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-amber-100 text-amber-700"
              }`}>
                {noaState.charAt(0).toUpperCase() + noaState.slice(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[900px] space-y-6 px-6 py-8">
        {/* Status cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-line bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Factor</p>
            <p className="mt-1 text-sm font-medium text-stone-900">{factorName}</p>
          </div>
          <div className="border border-line bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">NOA Status</p>
            <p className="mt-1 text-sm font-medium text-stone-900">
              {noaState
                ? noaState.charAt(0).toUpperCase() + noaState.slice(1)
                : "No NOA on file"}
            </p>
          </div>
        </div>

        {/* Message thread */}
        <div className="border border-line bg-white p-6">
          <h2 className="mb-4 font-display text-lg text-stone-900">
            Messages ({messages.length})
          </h2>
          <MessageList messages={messages} viewerSide="carrier" />
          <div className="mt-4">
            <ComposeForm carrierDot={cleanDot} factorSlug={factorSlug} senderSide="carrier" />
          </div>
        </div>
      </div>
    </section>
  );
}
