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

export function RoomClient({ roomId }: { roomId: string }) {
  const socketRef = useRef<Socket | null>(null);
  const [properties, setProperties] = useState<PropertyTile[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isJoining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
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
  const players = state?.players ?? room?.players ?? [];
  const currentTurnPlayerId = state?.current_turn_player_id ?? null;
  const shareUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/room/${roomId}`;

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
        setSession(getRoomSession(roomId));
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
        room_id: roomId,
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
    socket.on('error', (payload: { message?: string }) => {
      setError(payload.message ?? 'Socket error');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [appendChat, roomId, session, setConnected, setError, setState]);

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
        <GameBoard players={players} properties={properties} />
        <div className="space-y-5">
          <ActionPanel
            isConnected={isConnected}
            onStartGame={startGame}
            playerCount={players.length}
            session={session}
            status={activeRoom.status}
          />
          <PlayerList currentTurnPlayerId={currentTurnPlayerId} players={players} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <ChatBox disabled={!session || !isConnected} messages={chatMessages} onSend={sendChat} />
        <GameLog messages={chatMessages} />
      </div>
    </div>
  );
}
