import { RoomPlayer } from '@/shared/api/types';
import { PlayerCard } from './PlayerCard';

export function PlayerList({
  currentTurnPlayerId,
  players,
}: {
  currentTurnPlayerId: string | null;
  players: RoomPlayer[];
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-bold">Players</h2>
        <p className="text-sm text-slate-600">{players.length} pemain di room</p>
      </div>
      <div className="space-y-3">
        {players.map((player) => (
          <PlayerCard currentTurnPlayerId={currentTurnPlayerId} key={player.id} player={player} />
        ))}
      </div>
    </section>
  );
}
