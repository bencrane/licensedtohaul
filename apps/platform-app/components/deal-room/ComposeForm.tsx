"use client";

import { useRef, useState } from "react";

type Props = {
  carrierDot: string;
  factorSlug: string;
  senderSide: 'carrier' | 'partner';
  onSent?: () => void;
};

export default function ComposeForm({ carrierDot, factorSlug, senderSide, onSent }: Props) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSending(true);

    const fd = new FormData(e.currentTarget);
    const body = fd.get('body') as string;

    if (!body?.trim()) {
      setSending(false);
      return;
    }

    try {
      const res = await fetch('/api/deal-room/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ carrierDot, factorSlug, senderSide, body: body.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Failed to send');
      }

      formRef.current?.reset();
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-line pt-4">
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      <textarea
        name="body"
        rows={3}
        placeholder="Type a message..."
        className="w-full resize-none border border-line bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none"
        required
      />
      <div className="flex justify-end">
        <button
          type="submit"
          data-action="send-message"
          disabled={sending}
          className="inline-flex items-center gap-2 bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </form>
  );
}
