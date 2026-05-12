'use client';

import { useState, useTransition } from 'react';
import { Truck, MapPin } from 'lucide-react';
import { updateTransferDisposition } from '@/lib/transfers/actions';
import type { TransferDisposition, TransferRow } from '@/lib/transfers/types';

type Props = {
  slug: string;
  initialTransfers: TransferRow[];
};

const COLUMNS: {
  key: TransferDisposition;
  label: string;
  accent: string;
}[] = [
  { key: 'new', label: 'New', accent: 'border-t-orange-500' },
  { key: 'contacted', label: 'Contacted', accent: 'border-t-stone-400' },
  { key: 'quoted', label: 'Quoted', accent: 'border-t-sky-500' },
  { key: 'won', label: 'Won', accent: 'border-t-emerald-500' },
  { key: 'lost', label: 'Lost', accent: 'border-t-stone-300' },
];

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (days >= 1) return `${days}d ago`;
  if (hours >= 1) return `${hours}h ago`;
  return 'just now';
}

export default function PipelineBoard({ slug, initialTransfers }: Props) {
  const [transfers, setTransfers] = useState<TransferRow[]>(initialTransfers);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TransferDisposition | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragEnd = () => {
    setDraggingId(null);
    setDragOverColumn(null);
  };

  const onDragOver = (e: React.DragEvent, col: TransferDisposition) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== col) setDragOverColumn(col);
  };

  const onDragLeave = (col: TransferDisposition) => {
    if (dragOverColumn === col) setDragOverColumn(null);
  };

  const onDrop = (e: React.DragEvent, newDisposition: TransferDisposition) => {
    e.preventDefault();
    setDragOverColumn(null);
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    const transfer = transfers.find((t) => t.id === id);
    if (!transfer || transfer.disposition === newDisposition) return;

    const previous = transfer.disposition;
    // Optimistic
    setTransfers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, disposition: newDisposition } : t)),
    );
    setError(null);

    startTransition(async () => {
      const result = await updateTransferDisposition(slug, id, newDisposition);
      if (!result.ok) {
        // Revert
        setTransfers((prev) =>
          prev.map((t) => (t.id === id ? { ...t, disposition: previous } : t)),
        );
        setError(result.error ?? 'Failed to update disposition.');
      }
    });
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      <div className="grid gap-4 overflow-x-auto md:grid-cols-5">
        {COLUMNS.map((col) => {
          const cards = transfers.filter((t) => t.disposition === col.key);
          const isDropTarget = dragOverColumn === col.key;
          return (
            <div
              key={col.key}
              onDragOver={(e) => onDragOver(e, col.key)}
              onDragLeave={() => onDragLeave(col.key)}
              onDrop={(e) => onDrop(e, col.key)}
              className={`flex flex-col border border-t-4 border-line ${col.accent} bg-stone-50/60 transition-colors ${
                isDropTarget ? 'bg-orange-50/60' : ''
              }`}
            >
              <header className="border-b border-line bg-white px-3 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-600">
                    {col.label}
                  </p>
                  <span className="font-mono text-xs text-stone-700">
                    {cards.length}
                  </span>
                </div>
              </header>
              <ul className="flex min-h-[120px] flex-col gap-2 p-2">
                {cards.length === 0 && (
                  <li className="border border-dashed border-line bg-stone-50/40 px-3 py-4 text-center text-[11px] text-stone-400">
                    Drop a card here
                  </li>
                )}
                {cards.map((c) => (
                  <li
                    key={c.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, c.id)}
                    onDragEnd={onDragEnd}
                    className={`cursor-grab border border-line bg-white p-3 text-left text-xs shadow-[0_1px_0_rgba(26,20,16,0.04)] transition-colors hover:border-orange-300 active:cursor-grabbing ${
                      draggingId === c.id ? 'opacity-40' : ''
                    }`}
                  >
                    <p className="font-display text-[15px] leading-snug text-stone-900">
                      {c.contact_snapshot.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-stone-500">
                      USDOT {c.contact_snapshot.usdot}
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1 text-stone-600">
                      <Truck className="h-3 w-3 text-stone-400" />
                      {c.contact_snapshot.equipment_class} ·{' '}
                      {c.contact_snapshot.power_units} PU
                      {c.contact_snapshot.drivers != null &&
                        ` · ${c.contact_snapshot.drivers} drv`}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-stone-500">
                      <MapPin className="h-3 w-3 text-stone-400" />
                      {c.contact_snapshot.domicile}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-stone-400">
                      <span className="font-mono uppercase tracking-[0.12em]">
                        {relativeTime(c.created_at)}
                      </span>
                      {c.contact_snapshot.hazmat && (
                        <span className="inline-flex items-center border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-orange-800">
                          Hazmat
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="text-center text-[11px] text-stone-500">
        Drag cards across columns to update status. Changes save automatically.
      </p>
    </div>
  );
}
