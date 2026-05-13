'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { sendCarrierMessage } from '@/lib/messages/actions';
import type { Message, SendMessageState } from '@/lib/messages/types';

const initial: SendMessageState = { error: null };

type Props = {
  dot: string;
  transferId: string;
  partnerName: string;
  messages: Message[];
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function CarrierMessageThread({
  dot,
  transferId,
  partnerName,
  messages,
}: Props) {
  const action = sendCarrierMessage.bind(null, dot, transferId);
  const [state, formAction, pending] = useActionState<SendMessageState, FormData>(
    action,
    initial,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pending && !state.error) {
      formRef.current?.reset();
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [pending, state.error, messages.length]);

  return (
    <div className="flex flex-col border border-line bg-surface">
      <header className="border-b border-line px-5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
          Conversation
        </p>
        <p className="mt-0.5 text-sm text-stone-700">
          You &nbsp;·&nbsp; {partnerName}
        </p>
      </header>

      <ul className="flex max-h-[480px] min-h-[280px] flex-col gap-3 overflow-y-auto px-5 py-5">
        {messages.length === 0 && (
          <li className="m-auto text-center text-sm text-stone-500">
            No messages yet. The factor will reach out once they review your profile.
          </li>
        )}
        {messages.map((m) => {
          const isCarrier = m.sender_side === 'carrier';
          const isSystem = m.sender_side === 'system';
          return (
            <li
              key={m.id}
              className={`flex ${isCarrier ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[78%] px-3 py-2 text-[14px] leading-relaxed ${
                  isSystem
                    ? 'border border-line bg-stone-50 text-stone-600 italic'
                    : isCarrier
                      ? 'bg-orange-600 text-white'
                      : 'border border-line bg-stone-50 text-stone-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p
                  className={`mt-1 text-[10px] font-mono uppercase tracking-[0.12em] ${
                    isCarrier ? 'text-orange-100' : 'text-stone-400'
                  }`}
                >
                  {isSystem ? 'system' : isCarrier ? 'you' : partnerName} ·{' '}
                  {formatTime(m.created_at)}
                </p>
              </div>
            </li>
          );
        })}
        <div ref={bottomRef} />
      </ul>

      <form
        ref={formRef}
        action={formAction}
        className="flex flex-col gap-2 border-t border-line bg-stone-50/40 px-5 py-4"
      >
        <textarea
          name="body"
          required
          rows={3}
          placeholder={`Write to ${partnerName}…`}
          className="border border-line bg-surface px-3 py-2 text-[14px] text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:outline-none"
        />
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-stone-500">
            Your message will go to {partnerName} directly.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Sending…' : 'Send'}
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        {state.error && (
          <p className="text-sm text-red-700" role="alert">
            {state.error}
          </p>
        )}
      </form>
    </div>
  );
}
