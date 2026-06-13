'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DoorOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/shared/api/client';
import { saveRoomSession } from '@/shared/session/session-store';

export function JoinRoomClient() {
  const router = useRouter();
  const [needsPassword, setNeedsPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const playerName = String(form.get('player_name') ?? '').trim();
    const roomCode = String(form.get('room_code') ?? '').trim().toUpperCase();
    const password = String(form.get('password') ?? '').trim();
    const inviteCode = String(form.get('invite_code') ?? '').trim();

    try {
      const joined = await apiClient.joinRoom({
        invite_code: inviteCode || undefined,
        password: password || undefined,
        player_name: playerName,
        room_code: roomCode,
      });

      if (joined.status === 'need_password') {
        setNeedsPassword(true);
        return;
      }

      if (joined.status === 'full') {
        setError('Room penuh');
        return;
      }

      saveRoomSession({
        guestId: joined.guest_id,
        isHost: false,
        playerId: joined.player_id,
        playerName,
        roomCode,
        roomId: joined.room_id,
        sessionToken: joined.session_token,
      });
      router.push(`/room/${joined.room_id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Gagal join room');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-primary">Join Room</p>
        <h1 className="mt-2 text-3xl font-bold">Masuk Dengan Kode</h1>
      </div>
      <Card className="p-5">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Input label="Nama Pemain" maxLength={50} minLength={2} name="player_name" required />
          <Input label="Room Code" maxLength={10} minLength={4} name="room_code" required />
          <Input label="Invite Code" maxLength={64} name="invite_code" />
          {needsPassword ? (
            <Input label="Password Room" maxLength={100} minLength={4} name="password" type="password" />
          ) : null}
          {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-danger">{error}</p> : null}
          <Button disabled={isSubmitting} icon={<DoorOpen className="size-4" />} type="submit">
            {isSubmitting ? 'Masuk...' : 'Join Room'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
