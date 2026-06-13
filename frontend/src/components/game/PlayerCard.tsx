import { Crown, Wifi, WifiOff } from 'lucide-react';
import { RoomPlayer } from '@/shared/api/types';
import { formatCurrency } from '@/shared/lib/format';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

export function PlayerCard({
  currentTurnPlayerId,
  player,
}: {
  currentTurnPlayerId: string | null;
  player: RoomPlayer;
}) {
  const isCurrentTurn = currentTurnPlayerId === player.id;

  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-bold">{player.player_name}</span>
            {player.is_host ? <Crown className="size-4 text-secondary" /> : null}
          </div>
          <p className="mt-1 text-sm text-slate-600">{formatCurrency(player.money)}</p>
        </div>
        {player.is_connected === false ? (
          <WifiOff className="size-4 text-danger" />
        ) : (
          <Wifi className="size-4 text-success" />
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone={isCurrentTurn ? 'gold' : 'slate'}>
          {isCurrentTurn ? 'Giliran' : `Posisi ${player.position}`}
        </Badge>
        {player.is_bankrupt ? <Badge tone="red">Bankrupt</Badge> : null}
        {player.is_ready ? <Badge tone="green">Ready</Badge> : null}
        {player.is_in_jail ? <Badge tone="red">Jail {player.jail_turns ?? 0}/3</Badge> : null}
        {player.get_out_of_jail_cards ? <Badge tone="blue">Jail Card</Badge> : null}
        {player.turn_order ? <Badge tone="blue">#{player.turn_order}</Badge> : null}
      </div>
    </Card>
  );
}
