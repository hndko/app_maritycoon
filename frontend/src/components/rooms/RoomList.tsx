import { PublicRoom } from '@/shared/api/types';
import { RoomCard } from './RoomCard';

export function RoomList({ rooms }: { rooms: PublicRoom[] }) {
  if (rooms.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
        Belum ada public room aktif.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rooms.map((room) => (
        <RoomCard key={room.room_id} room={room} />
      ))}
    </div>
  );
}
