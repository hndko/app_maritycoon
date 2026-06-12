import { PropertyTile, RoomPlayer } from '@/shared/api/types';
import { formatCurrency } from '@/shared/lib/format';

const colorClasses: Record<string, string> = {
  Brown: 'bg-amber-900',
  'Dark Blue': 'bg-blue-900',
  Green: 'bg-green-600',
  'Light Blue': 'bg-sky-300',
  Orange: 'bg-orange-400',
  Pink: 'bg-pink-400',
  Red: 'bg-red-500',
  Yellow: 'bg-yellow-300',
};

export function BoardTile({
  players,
  tile,
}: {
  players: RoomPlayer[];
  tile: PropertyTile;
}) {
  return (
    <div className="relative flex min-h-16 flex-col overflow-hidden rounded-md border border-slate-300 bg-white text-[10px] shadow-sm">
      <div className={`h-2 ${tile.color_group ? colorClasses[tile.color_group] ?? 'bg-slate-300' : 'bg-slate-200'}`} />
      <div className="flex flex-1 flex-col justify-between gap-1 p-1.5">
        <span className="line-clamp-2 font-bold leading-tight text-slate-800">{tile.name}</span>
        <span className="text-slate-500">
          {tile.price ? formatCurrency(tile.price) : tile.type.replace('_', ' ')}
        </span>
      </div>
      {players.length > 0 ? (
        <div className="absolute bottom-1 right-1 flex -space-x-1">
          {players.slice(0, 4).map((player, index) => (
            <span
              className="grid size-5 place-items-center rounded-full border border-white bg-primary text-[9px] font-bold text-white"
              key={player.id}
              title={player.player_name}
            >
              {player.player_name.charAt(0).toUpperCase() || index + 1}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
