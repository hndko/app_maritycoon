import Link from 'next/link';
import { LogIn, Users } from 'lucide-react';
import { PublicRoom } from '@/shared/api/types';
import { formatRoomStatus } from '@/shared/lib/format';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

export function RoomCard({ room }: { room: PublicRoom }) {
  const isFull = room.current_players >= room.max_players;

  return (
    <Card className="flex min-h-40 flex-col justify-between gap-4 p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-text">{room.room_name}</h3>
            <p className="mt-1 text-xs font-semibold uppercase text-slate-500">
              {room.room_code}
            </p>
          </div>
          <Badge tone={room.status === 'waiting' ? 'green' : 'gold'}>
            {formatRoomStatus(room.status)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Users className="size-4" />
          <span>
            {room.current_players}/{room.max_players} pemain
          </span>
        </div>
        <p className="text-sm text-slate-600">Host: {room.host_name}</p>
      </div>
      {isFull ? (
        <span className="inline-flex h-11 w-full items-center justify-center rounded-md bg-slate-200 px-4 text-sm font-semibold text-slate-500">
          Room Penuh
        </span>
      ) : (
        <Link
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          href={`/room/${room.room_id}`}
        >
          <LogIn className="size-4" />
          <span>Masuk</span>
        </Link>
      )}
    </Card>
  );
}
