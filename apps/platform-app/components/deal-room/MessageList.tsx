import type { DealRoomMessage } from '@/lib/deal-room/types';

type Props = {
  messages: DealRoomMessage[];
  viewerSide: 'carrier' | 'partner';
};

export default function MessageList({ messages, viewerSide }: Props) {
  if (messages.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-stone-500">
        No messages yet. Send the first message below.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => {
        const isMine = msg.sender_side === viewerSide;
        return (
          <div
            key={msg.id}
            className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-sm px-4 py-2.5 text-sm leading-relaxed ${
                isMine
                  ? 'bg-orange-600 text-white'
                  : 'border border-line bg-surface text-stone-800'
              }`}
            >
              <p>{msg.body}</p>
              <p className={`mt-1 text-[10px] ${isMine ? 'text-orange-200' : 'text-stone-400'}`}>
                {msg.sender_side === 'partner' ? 'Factor' : 'Carrier'} ·{' '}
                {new Date(msg.created_at).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
