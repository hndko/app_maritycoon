import { Trophy } from 'lucide-react';
import { RealtimeRoomState, RoomPlayer } from '@/shared/api/types';
import { Button } from '../ui/Button';

export function WinnerDialog({
  currentPlayer,
  onPlayAgain,
  state,
}: {
  currentPlayer: RoomPlayer | null;
  onPlayAgain: () => void;
  state: RealtimeRoomState | null;
}) {
  if (!state?.winner_id) {
    return null;
  }

  const winner = state.players.find((player) => player.id === state.winner_id);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4">
      <section className="w-full max-w-lg rounded-md bg-white p-6 text-center shadow-xl">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-amber-100 text-secondary">
          <Trophy className="size-7" />
        </div>
        <p className="mt-4 text-sm font-semibold uppercase text-primary">Game Finished</p>
        <h2 className="mt-1 text-2xl font-bold">{winner?.player_name ?? 'Winner'} menang</h2>
        <div className="mt-5 rounded-md bg-slate-50 p-3 text-left text-sm">
          {state.players
            .slice()
            .sort((left, right) => right.money - left.money)
            .map((player, index) => (
              <div className="flex justify-between gap-4 py-1" key={player.id}>
                <span>{index + 1}. {player.player_name}</span>
                <span>{player.is_bankrupt ? 'Bankrupt' : 'Active'}</span>
              </div>
            ))}
        </div>
        {currentPlayer?.is_host ? (
          <Button className="mt-5 w-full" onClick={onPlayAgain}>
            Play Again
          </Button>
        ) : (
          <p className="mt-5 text-sm text-slate-600">Menunggu host memulai ulang room.</p>
        )}
      </section>
    </div>
  );
}
