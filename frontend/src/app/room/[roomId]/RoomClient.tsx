'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, DoorOpen } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { ActionPanel } from '@/components/game/ActionPanel';
import { ChatBox } from '@/components/game/ChatBox';
import { GameBoard } from '@/components/game/GameBoard';
import { GameLog } from '@/components/game/GameLog';
import { PlayerList } from '@/components/game/PlayerList';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { apiClient } from '@/shared/api/client';
import {
  ChatMessage,
  GameStartedEvent,
  PropertyTile,
  RealtimeRoomState,
} from '@/shared/api/types';
import { formatCurrency, formatRoomStatus } from '@/shared/lib/format';
import { createSocket } from '@/shared/socket/socket-client';
import { getRoomSession, saveRoomSession } from '@/shared/session/session-store';
import { useRoomStore } from '@/stores/room-store';

function formatGameLogMessage(eventType: string, payload: Record<string, unknown>): string {
  const amount = typeof payload.amount === 'number' ? ` ${formatCurrency(payload.amount)}` : '';
  const propertyId = typeof payload.property_id === 'number' ? ` tile ${payload.property_id}` : '';
  const title = typeof payload.title === 'string' ? `: ${payload.title}` : '';

  switch (eventType) {
    case 'game_started':
      return 'Game dimulai';
    case 'ready_changed':
      return `Ready status berubah`;
    case 'dice_rolled':
      return `Dadu dilempar`;
    case 'property_bought':
      return `Properti dibeli${propertyId}${amount}`;
    case 'rent_paid':
      return `Rent dibayar${amount}`;
    case 'tax_paid':
      return `Pajak dibayar${amount}`;
    case 'chance_card':
    case 'community_chest_card':
      return `Kartu diambil${title}`;
    case 'jail_fine_paid':
      return `Denda penjara dibayar${amount}`;
    case 'jail_roll_failed':
      return 'Gagal keluar penjara';
    case 'jail_card_used':
      return 'Kartu bebas penjara dipakai';
    case 'building_sold':
      return `Bangunan dijual${propertyId}${amount}`;
    case 'player_bankrupt':
      return 'Pemain bangkrut';
    case 'game_finished':
    case 'game_finished_by_host':
      return 'Game selesai';
    case 'turn_changed':
    case 'turn_skipped':
      return 'Giliran berpindah';
    default:
      return eventType.replaceAll('_', ' ');
  }
}

export function RoomClient({ inviteCode, roomId }: { inviteCode?: string; roomId: string }) {
  const socketRef = useRef<Socket | null>(null);
  const [properties, setProperties] = useState<PropertyTile[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isJoining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [roomSettings, setRoomSettings] = useState({
    max_players: 4,
    room_name: '',
    starting_money: 15000000,
    turn_timer_seconds: 60,
  });
  const {
    appendChat,
    chatMessages,
    error,
    isConnected,
    room,
    session,
    setConnected,
    setError,
    setRoom,
    setSession,
    setState,
    state,
  } = useRoomStore();

  const activeRoom = state ?? room;
  const canonicalRoomId = activeRoom?.room_id ?? room?.room_id ?? roomId;
  const players = state?.players ?? room?.players ?? [];
  const currentPlayer = players.find((player) => player.id === session?.playerId) ?? null;
  const currentTurnPlayerId = state?.current_turn_player_id ?? null;
  const allPlayersReady = players
    .filter((player) => !player.is_host)
    .every((player) => player.is_ready);
  const shareUrl =
    typeof window === 'undefined' || !activeRoom
      ? ''
      : `${window.location.origin}/room/${activeRoom.room_code}${inviteCode ? `?invite=${inviteCode}` : ''}`;

  const playerSummary = useMemo(() => {
    return players.map((player) => player.player_name).join(', ');
  }, [players]);

  useEffect(() => {
    let isMounted = true;

    async function loadRoom() {
      setLoading(true);
      setError(null);

      try {
        const [roomDetail, propertyTiles] = await Promise.all([
          apiClient.getRoom(roomId),
          apiClient.getProperties(),
        ]);

        if (!isMounted) {
          return;
        }

        setRoom(roomDetail);
        setProperties(propertyTiles);
        setRoomSettings({
          max_players: roomDetail.max_players,
          room_name: roomDetail.room_name,
          starting_money: roomDetail.starting_money,
          turn_timer_seconds: roomDetail.turn_timer_seconds,
        });
        setSession(getRoomSession(roomDetail.room_id) ?? getRoomSession(roomDetail.room_code));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Gagal memuat room');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadRoom();

    return () => {
      isMounted = false;
    };
  }, [roomId, setError, setRoom, setSession]);

  useEffect(() => {
    if (!session) {
      return undefined;
    }

    const socket = createSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_room', {
        player_id: session.playerId,
        room_id: canonicalRoomId,
        session_token: session.sessionToken,
        user_nickname: session.playerName,
      });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('room_state_update', (payload: RealtimeRoomState) => {
      setState(payload);
    });
    socket.on('chat_broadcast', (payload: ChatMessage) => {
      appendChat(payload);
    });
    socket.on('game_started', (payload: GameStartedEvent) => {
      appendChat({
        message: `Game dimulai. Giliran pertama: ${payload.first_turn_player_id.slice(0, 8)}`,
        room_id: payload.room_id,
        sender_name: 'System',
        timestamp: new Date().toISOString(),
        type: 'system',
      });
    });
    socket.on('dice_rolled_result', (payload: { player_id: string; dice_1: number; dice_2: number; total: number; is_double: boolean }) => {
      appendChat({
        message: `Dadu: ${payload.dice_1} + ${payload.dice_2} = ${payload.total}${payload.is_double ? ' (double)' : ''}`,
        room_id: roomId,
        sender_name: 'System',
        timestamp: new Date().toISOString(),
        type: 'system',
      });
    });
    socket.on('rent_paid', (payload: { amount: number }) => {
      appendChat({
        message: `Rent dibayar ${payload.amount.toLocaleString('id-ID')}`,
        room_id: roomId,
        sender_name: 'System',
        timestamp: new Date().toISOString(),
        type: 'system',
      });
    });
    socket.on('player_bankrupt', (payload: { player_id: string }) => {
      appendChat({
        message: `Player ${payload.player_id.slice(0, 8)} bangkrut`,
        room_id: roomId,
        sender_name: 'System',
        timestamp: new Date().toISOString(),
        type: 'system',
      });
    });
    socket.on('game_finished', (payload: { winner_id: string }) => {
      appendChat({
        message: `Game selesai. Winner: ${payload.winner_id.slice(0, 8)}`,
        room_id: roomId,
        sender_name: 'System',
        timestamp: new Date().toISOString(),
        type: 'system',
      });
    });
    socket.on('error', (payload: { message?: string }) => {
      setError(payload.message ?? 'Socket error');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [appendChat, canonicalRoomId, roomId, session, setConnected, setError, setState]);

  async function handleJoinFromLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!room) {
      return;
    }

    setJoining(true);
    setJoinError(null);
    const form = new FormData(event.currentTarget);
    const playerName = String(form.get('player_name') ?? '').trim();
    const password = String(form.get('password') ?? '').trim();

    try {
      const joined = await apiClient.joinRoom({
        invite_code: inviteCode,
        password: password || undefined,
        player_name: playerName,
        room_code: room.room_code,
      });

      if (joined.status === 'need_password') {
        setJoinError('Room membutuhkan password');
        return;
      }

      if (joined.status === 'full') {
        setJoinError('Room penuh');
        return;
      }

      const nextSession = {
        guestId: joined.guest_id,
        isHost: false,
        playerId: joined.player_id,
        playerName,
        roomCode: room.room_code,
        roomId: joined.room_id,
        sessionToken: joined.session_token,
      };
      saveRoomSession(nextSession);
      setSession(nextSession);
    } catch (joinLinkError) {
      setJoinError(joinLinkError instanceof Error ? joinLinkError.message : 'Gagal join room');
    } finally {
      setJoining(false);
    }
  }

  function copyInvite() {
    if (shareUrl) {
      void navigator.clipboard.writeText(shareUrl);
    }
  }

  function sendChat(message: string) {
    socketRef.current?.emit('chat_message', { message });
  }

  function startGame() {
    socketRef.current?.emit('start_game', {});
  }

  function toggleReady(isReady: boolean) {
    socketRef.current?.emit('set_ready', { is_ready: isReady });
  }

  function kickPlayer(playerId: string) {
    socketRef.current?.emit('kick_player', { player_id: playerId });
  }

  function transferHost(playerId: string) {
    socketRef.current?.emit('transfer_host', { player_id: playerId });
  }

  function updateRoomSettings() {
    if (!activeRoom) {
      return;
    }

    socketRef.current?.emit('update_room_settings', {
      max_players: roomSettings.max_players,
      room_name: roomSettings.room_name,
      starting_money: roomSettings.starting_money,
      turn_timer_seconds: roomSettings.turn_timer_seconds,
    });
  }

  function endGame() {
    socketRef.current?.emit('end_game', {});
  }

  function rollDice() {
    socketRef.current?.emit('roll_dice', {});
  }

  function buyProperty(propertyId: number) {
    socketRef.current?.emit('buy_property', { property_id: propertyId });
  }

  function buildHouse(propertyId: number) {
    socketRef.current?.emit('build_house', { property_id: propertyId });
  }

  function mortgageProperty(propertyId: number) {
    socketRef.current?.emit('mortgage_property', { property_id: propertyId });
  }

  function sellBuilding(propertyId: number) {
    socketRef.current?.emit('sell_building', { property_id: propertyId });
  }

  function payJailFine() {
    socketRef.current?.emit('pay_jail_fine', {});
  }

  function useJailCard() {
    socketRef.current?.emit('use_jail_card', {});
  }

  function declareBankruptcy() {
    socketRef.current?.emit('declare_bankruptcy', {});
  }

  function endTurn() {
    socketRef.current?.emit('end_turn', {});
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!activeRoom) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <p className="rounded-md bg-red-50 p-3 text-sm text-danger">{error ?? 'Room tidak ditemukan'}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <section className="mb-5 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{activeRoom.room_name}</h1>
            <Badge tone={activeRoom.status === 'waiting' ? 'green' : 'gold'}>
              {formatRoomStatus(activeRoom.status)}
            </Badge>
            <Badge tone={isConnected ? 'green' : 'red'}>{isConnected ? 'Online' : 'Offline'}</Badge>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Kode {activeRoom.room_code} · {players.length}/{activeRoom.max_players} pemain ·{' '}
            {formatCurrency(activeRoom.starting_money)}
          </p>
          {playerSummary ? <p className="mt-1 text-sm text-slate-500">{playerSummary}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button icon={<Copy className="size-4" />} onClick={copyInvite} variant="ghost">
            Copy Link
          </Button>
        </div>
      </section>

      {!session ? (
        <Card className="mb-5 p-5">
          <h2 className="text-lg font-bold">Masuk Room</h2>
          <form className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleJoinFromLink}>
            <Input label="Nama Pemain" maxLength={50} minLength={2} name="player_name" required />
            <Input label="Password" maxLength={100} minLength={4} name="password" type="password" />
            <div className="flex items-end">
              <Button disabled={isJoining} icon={<DoorOpen className="size-4" />} type="submit">
                Join
              </Button>
            </div>
          </form>
          {joinError ? <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-danger">{joinError}</p> : null}
        </Card>
      ) : null}

      {error ? <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-danger">{error}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <GameBoard players={players} properties={properties} roomProperties={state?.properties ?? []} />
        <div className="space-y-5">
          {state?.dice ? (
            <Card className="p-4">
              <h2 className="text-lg font-bold">Dice</h2>
              <p className="mt-2 text-sm text-slate-600">
                {state.dice.dice_1} + {state.dice.dice_2} ={' '}
                <span className="font-bold text-slate-950">{state.dice.total}</span>
              </p>
              {state.dice.is_double ? <p className="text-xs font-semibold text-secondary">Double</p> : null}
            </Card>
          ) : null}
          <ActionPanel
            isConnected={isConnected}
            onBuildHouse={buildHouse}
            onBuyProperty={buyProperty}
            onDeclareBankruptcy={declareBankruptcy}
            onEndTurn={endTurn}
            onEndGame={endGame}
            onPayJailFine={payJailFine}
            onMortgageProperty={mortgageProperty}
            onRollDice={rollDice}
            onSellBuilding={sellBuilding}
            onStartGame={startGame}
            onToggleReady={toggleReady}
            onUseJailCard={useJailCard}
            allPlayersReady={allPlayersReady}
            currentPlayerIsInJail={currentPlayer?.is_in_jail ?? false}
            currentPlayerJailCards={currentPlayer?.get_out_of_jail_cards ?? 0}
            ownedBuildablePropertyId={
              state?.properties.find(
                (propertyState) =>
                  propertyState.owner_id === session?.playerId &&
                  !propertyState.is_mortgaged &&
                  properties.find((property) => property.id === propertyState.property_id)?.type === 'city',
              )?.property_id ?? null
            }
            ownedMortgageablePropertyId={
              state?.properties.find(
                (propertyState) =>
                  propertyState.owner_id === session?.playerId &&
                  !propertyState.is_mortgaged &&
                  propertyState.house_count === 0 &&
                  propertyState.hotel_count === 0,
              )?.property_id ?? null
            }
            ownedSellableBuildingPropertyId={
              state?.properties.find(
                (propertyState) =>
                  propertyState.owner_id === session?.playerId &&
                  (propertyState.house_count > 0 || propertyState.hotel_count > 0),
              )?.property_id ?? null
            }
            pendingAction={state?.pending_action ?? null}
            playerCount={players.length}
            playerIsReady={players.find((player) => player.id === session?.playerId)?.is_ready ?? false}
            roomProperties={state?.properties ?? []}
            session={session}
            status={activeRoom.status}
            turn={state?.turn}
          />
          {session?.isHost && activeRoom.status === 'waiting' ? (
            <Card className="p-4">
              <h2 className="text-lg font-bold">Host Controls</h2>
              <div className="mt-3 grid gap-3">
                <Input
                  label="Room Name"
                  maxLength={100}
                  minLength={3}
                  onChange={(event) =>
                    setRoomSettings((current) => ({
                      ...current,
                      room_name: event.target.value,
                    }))
                  }
                  value={roomSettings.room_name}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    label="Max"
                    max={8}
                    min={Math.max(2, players.length)}
                    onChange={(event) =>
                      setRoomSettings((current) => ({
                        ...current,
                        max_players: Number(event.target.value),
                      }))
                    }
                    type="number"
                    value={roomSettings.max_players}
                  />
                  <Input
                    label="Money"
                    min={1}
                    onChange={(event) =>
                      setRoomSettings((current) => ({
                        ...current,
                        starting_money: Number(event.target.value),
                      }))
                    }
                    type="number"
                    value={roomSettings.starting_money}
                  />
                  <Input
                    label="Timer"
                    max={300}
                    min={15}
                    onChange={(event) =>
                      setRoomSettings((current) => ({
                        ...current,
                        turn_timer_seconds: Number(event.target.value),
                      }))
                    }
                    type="number"
                    value={roomSettings.turn_timer_seconds}
                  />
                </div>
                <Button onClick={updateRoomSettings} variant="ghost">
                  Save Settings
                </Button>
                {players
                  .filter((player) => player.id !== session.playerId)
                  .map((player) => (
                    <div className="flex flex-wrap items-center gap-2 text-sm" key={player.id}>
                      <span className="min-w-0 flex-1">{player.player_name}</span>
                      <Button onClick={() => transferHost(player.id)} variant="ghost">
                        Transfer Host
                      </Button>
                      <Button onClick={() => kickPlayer(player.id)} variant="danger">
                        Kick
                      </Button>
                    </div>
                  ))}
              </div>
            </Card>
          ) : null}
          {activeRoom.status === 'waiting' ? (
            <Card className="p-4">
              <h2 className="text-lg font-bold">Waiting Room</h2>
              <p className="mt-2 text-sm text-slate-600">
                {allPlayersReady ? 'Semua pemain siap.' : 'Menunggu semua pemain menekan Ready.'}
              </p>
            </Card>
          ) : null}
          {state?.last_card ? (
            <Card className="p-4">
              <h2 className="text-lg font-bold">{state.last_card.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{state.last_card.description}</p>
            </Card>
          ) : null}
          <PlayerList currentTurnPlayerId={currentTurnPlayerId} players={players} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <ChatBox disabled={!session || !isConnected} messages={chatMessages} onSend={sendChat} />
        <GameLog
          messages={
            state?.game_logs.map((log) => ({
              message: formatGameLogMessage(log.event_type, log.payload),
              room_id: activeRoom.room_id,
              sender_name: 'System',
              timestamp: log.created_at,
              type: 'system',
            })) ?? chatMessages
          }
        />
      </div>
    </div>
  );
}
