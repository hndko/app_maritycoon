import { X } from 'lucide-react';
import { PropertyTile, RealtimeRoomProperty, RoomPlayer } from '@/shared/api/types';
import { formatCurrency } from '@/shared/lib/format';
import { Button } from '../ui/Button';

export function PropertyModal({
  onClose,
  players,
  property,
  roomProperty,
}: {
  onClose: () => void;
  players: RoomPlayer[];
  property: PropertyTile | null;
  roomProperty?: RealtimeRoomProperty;
}) {
  if (!property) {
    return null;
  }

  const owner = players.find((player) => player.id === roomProperty?.owner_id);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/40 p-4">
      <section className="w-full max-w-md rounded-md bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">{property.type.replace('_', ' ')}</p>
            <h2 className="text-xl font-bold">{property.name}</h2>
          </div>
          <Button aria-label="Tutup detail properti" className="size-9 px-0" icon={<X className="size-4" />} onClick={onClose} variant="ghost">
            <span className="sr-only">Close</span>
          </Button>
        </div>
        <dl className="mt-4 grid gap-2 text-sm text-slate-600">
          <Row label="Harga" value={property.price ? formatCurrency(property.price) : '-'} />
          <Row label="Sewa dasar" value={property.base_rent ? formatCurrency(property.base_rent) : '-'} />
          <Row label="Rumah" value={property.house_price ? formatCurrency(property.house_price) : '-'} />
          <Row label="Hotel" value={property.rent_hotel ? formatCurrency(property.rent_hotel) : '-'} />
          <Row label="Mortgage" value={property.mortgage_value ? formatCurrency(property.mortgage_value) : '-'} />
          <Row label="Owner" value={owner?.player_name ?? 'Bank'} />
          <Row label="Status" value={roomProperty?.is_mortgaged ? 'Mortgaged' : 'Active'} />
          <Row label="Bangunan" value={`${roomProperty?.house_count ?? 0} rumah, ${roomProperty?.hotel_count ?? 0} hotel`} />
        </dl>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded bg-slate-50 px-3 py-2">
      <dt>{label}</dt>
      <dd className="font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
