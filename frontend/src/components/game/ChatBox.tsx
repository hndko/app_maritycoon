'use client';

import { FormEvent, useState } from 'react';
import { Send } from 'lucide-react';
import { ChatMessage } from '@/shared/api/types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Dropdown } from '../ui/Dropdown';

const emojis = ['😀', '😂', '🔥', '🎲', '🏠', '💰', '🙏', '🎉'];

export function ChatBox({
  disabled,
  messages,
  onSend,
}: {
  disabled: boolean;
  messages: ChatMessage[];
  onSend: (message: string) => void;
}) {
  const [message, setMessage] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextMessage = message.trim();

    if (!nextMessage) {
      return;
    }

    onSend(nextMessage);
    setMessage('');
  }

  return (
    <Card className="flex h-[360px] flex-col p-4">
      <div>
        <h2 className="text-lg font-bold">Chat</h2>
        <p className="text-sm text-slate-600">Room chat realtime</p>
      </div>
      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada pesan.</p>
        ) : (
          messages.map((chat, index) => (
            <div className="rounded-md bg-slate-50 p-2 text-sm" key={`${chat.timestamp}-${index}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{chat.sender_name}</span>
                <span className="text-xs text-slate-500">
                  {new Date(chat.timestamp).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="mt-1 text-slate-700">{chat.message}</p>
            </div>
          ))
        )}
      </div>
      <form className="mt-4 flex gap-2" onSubmit={handleSubmit}>
        <input
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-100"
          disabled={disabled}
          maxLength={280}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Tulis pesan"
          value={message}
        />
        <Dropdown label="Emoji">
          <div className="grid grid-cols-4 gap-1">
            {emojis.map((emoji) => (
              <button
                className="grid size-9 place-items-center rounded-md text-lg hover:bg-slate-100"
                disabled={disabled}
                key={emoji}
                onClick={() => setMessage((current) => `${current}${emoji}`)}
                type="button"
              >
                {emoji}
              </button>
            ))}
          </div>
        </Dropdown>
        <Button disabled={disabled} icon={<Send className="size-4" />} type="submit">
          Send
        </Button>
      </form>
    </Card>
  );
}
