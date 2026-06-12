import { Dice5, Home, Play, ShoppingCart, Square } from 'lucide-react';
import { RoomStatus } from '@/shared/api/types';
import { RoomSession } from '@/shared/session/session-store';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export function ActionPanel({
  isConnected,
  onStartGame,
  playerCount,
  session,
  status,
}: {
  isConnected: boolean;
  onStartGame: () => void;
  playerCount: number;
  session: RoomSession | null;
  status: RoomStatus;
}) {
  const canStart = status === 'waiting' && session?.isHost && playerCount >= 2 && isConnected;

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold">Actions</h2>
        <p className="text-sm text-slate-600">Status room: {status}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <Button disabled={!canStart} icon={<Play className="size-4" />} onClick={onStartGame} variant="success">
          Start Game
        </Button>
        <Button disabled icon={<Dice5 className="size-4" />} variant="secondary">
          Roll Dice
        </Button>
        <Button disabled icon={<ShoppingCart className="size-4" />} variant="primary">
          Buy Property
        </Button>
        <Button disabled icon={<Square className="size-4" />} variant="ghost">
          End Turn
        </Button>
        <Button disabled icon={<Home className="size-4" />} variant="ghost">
          Build
        </Button>
      </div>
    </Card>
  );
}
