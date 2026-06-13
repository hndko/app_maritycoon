import { AlertTriangle, Dice5, Home, Landmark, Play, ShoppingCart, Square } from 'lucide-react';
import { PendingAction, RealtimeRoomProperty, RoomStatus } from '@/shared/api/types';
import { formatCurrency } from '@/shared/lib/format';
import { RoomSession } from '@/shared/session/session-store';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export function ActionPanel({
  isConnected,
  onBuildHouse,
  onBuyProperty,
  onDeclareBankruptcy,
  onEndTurn,
  onMortgageProperty,
  onRollDice,
  onStartGame,
  ownedBuildablePropertyId,
  ownedMortgageablePropertyId,
  pendingAction,
  playerCount,
  roomProperties,
  session,
  status,
  turn,
}: {
  isConnected: boolean;
  onBuildHouse: (propertyId: number) => void;
  onBuyProperty: (propertyId: number) => void;
  onDeclareBankruptcy: () => void;
  onEndTurn: () => void;
  onMortgageProperty: (propertyId: number) => void;
  onRollDice: () => void;
  onStartGame: () => void;
  ownedBuildablePropertyId: number | null;
  ownedMortgageablePropertyId: number | null;
  pendingAction: PendingAction;
  playerCount: number;
  roomProperties: RealtimeRoomProperty[];
  session: RoomSession | null;
  status: RoomStatus;
  turn?: {
    current_player_id: string | null;
    phase: string;
    double_count: number;
    deadline_at?: string | null;
  };
}) {
  const canStart = status === 'waiting' && session?.isHost && playerCount >= 2 && isConnected;
  const isCurrentPlayer = Boolean(session?.playerId && turn?.current_player_id === session.playerId);
  const canRoll = status === 'playing' && isConnected && isCurrentPlayer && turn?.phase === 'await_roll';
  const canEndTurn = status === 'playing' && isConnected && isCurrentPlayer && turn?.phase === 'free_action';
  const canDeclareBankruptcy =
    status === 'playing' &&
    isConnected &&
    pendingAction?.type === 'bankruptcy_resolution' &&
    pendingAction.player_id === session?.playerId;
  const canBuy =
    status === 'playing' &&
    isConnected &&
    pendingAction?.type === 'buy_property' &&
    pendingAction.player_id === session?.playerId;
  const ownedPropertyCount = roomProperties.filter(
    (property) => property.owner_id === session?.playerId,
  ).length;

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold">Actions</h2>
        <p className="text-sm text-slate-600">
          Status room: {status}
          {turn ? ` · ${turn.phase}` : ''}
        </p>
        {pendingAction?.type === 'buy_property' ? (
          <p className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-700">
            Properti tersedia: {formatCurrency(pendingAction.price)}
          </p>
        ) : null}
        {pendingAction?.type === 'bankruptcy_resolution' ? (
          <p className="mt-2 rounded-md bg-red-50 p-2 text-xs text-danger">
            Hutang {formatCurrency(pendingAction.amount)} perlu diselesaikan.
          </p>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <Button disabled={!canStart} icon={<Play className="size-4" />} onClick={onStartGame} variant="success">
          Start Game
        </Button>
        <Button disabled={!canRoll} icon={<Dice5 className="size-4" />} onClick={onRollDice} variant="secondary">
          Roll Dice
        </Button>
        <Button
          disabled={!canBuy}
          icon={<ShoppingCart className="size-4" />}
          onClick={() => {
            if (pendingAction?.type === 'buy_property') {
              onBuyProperty(pendingAction.property_id);
            }
          }}
          variant="primary"
        >
          Buy Property
        </Button>
        <Button disabled={!canEndTurn} icon={<Square className="size-4" />} onClick={onEndTurn} variant="ghost">
          End Turn
        </Button>
        <Button
          disabled={!canEndTurn || ownedBuildablePropertyId === null}
          icon={<Home className="size-4" />}
          onClick={() => {
            if (ownedBuildablePropertyId !== null) {
              onBuildHouse(ownedBuildablePropertyId);
            }
          }}
          variant="ghost"
        >
          Build
        </Button>
        <Button
          disabled={!isCurrentPlayer || ownedMortgageablePropertyId === null}
          icon={<Landmark className="size-4" />}
          onClick={() => {
            if (ownedMortgageablePropertyId !== null) {
              onMortgageProperty(ownedMortgageablePropertyId);
            }
          }}
          variant="ghost"
        >
          Mortgage
        </Button>
        <Button
          disabled={!canDeclareBankruptcy}
          icon={<AlertTriangle className="size-4" />}
          onClick={onDeclareBankruptcy}
          variant="danger"
        >
          Bankruptcy
        </Button>
      </div>
      {ownedPropertyCount > 0 ? (
        <p className="mt-3 text-xs text-slate-500">{ownedPropertyCount} properti dimiliki.</p>
      ) : null}
    </Card>
  );
}
