import { ChatMessage } from '@/shared/api/types';
import { Card } from '../ui/Card';

export function GameLog({ messages }: { messages: ChatMessage[] }) {
  return (
    <Card className="p-4">
      <h2 className="text-lg font-bold">Game Log</h2>
      <div className="mt-3 max-h-44 space-y-2 overflow-y-auto text-sm text-slate-600">
        {messages.length === 0 ? (
          <p>Belum ada event.</p>
        ) : (
          messages.slice(-8).map((message, index) => (
            <p key={`${message.timestamp}-log-${index}`}>
              {message.sender_name}: {message.message}
            </p>
          ))
        )}
      </div>
    </Card>
  );
}
