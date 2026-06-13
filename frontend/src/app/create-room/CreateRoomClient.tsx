'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { apiClient } from '@/shared/api/client';
import { RoomVisibility } from '@/shared/api/types';
import { saveRoomSession } from '@/shared/session/session-store';

export function CreateRoomClient() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [visibility, setVisibility] = useState<RoomVisibility>('public');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const hostName = String(form.get('host_nickname') ?? '').trim();
    const roomName = String(form.get('room_name') ?? '').trim();
    const password = String(form.get('password') ?? '').trim();

    try {
      const created = await apiClient.createRoom({
        host_nickname: hostName,
        is_public: visibility === 'public',
        max_players: Number(form.get('max_players')),
        password: password || undefined,
        room_name: roomName,
        starting_money: Number(form.get('starting_money')),
        turn_timer_seconds: Number(form.get('turn_timer_seconds')),
        visibility,
      });

      saveRoomSession({
        guestId: created.guest_id,
        isHost: true,
        playerId: created.player_id,
        playerName: hostName,
        roomCode: created.room_code,
        roomId: created.room_id,
        sessionToken: created.session_token,
      });
      const nextUrl = new URL(created.share_url);
      router.push(`${nextUrl.pathname}${nextUrl.search}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Gagal membuat room');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-primary">Create Room</p>
        <h1 className="mt-2 text-3xl font-bold">Buat Server Baru</h1>
      </div>
      <Card className="p-5">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Input label="Nama Host" maxLength={50} minLength={2} name="host_nickname" required />
          <Input label="Nama Room" maxLength={100} minLength={3} name="room_name" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Max Players" name="max_players" required>
              {[2, 3, 4, 5, 6, 7, 8].map((value) => (
                <option key={value} value={value}>
                  {value} pemain
                </option>
              ))}
            </Select>
            <Select
              label="Visibility"
              name="visibility"
              onChange={(event) => setVisibility(event.target.value as RoomVisibility)}
              value={visibility}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="invite_only">Invite Only</option>
            </Select>
          </div>
          {visibility !== 'public' ? (
            <Input label="Password" maxLength={100} minLength={4} name="password" type="password" />
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              defaultValue={15000000}
              label="Starting Money"
              min={1}
              name="starting_money"
              required
              type="number"
            />
            <Input
              defaultValue={60}
              label="Turn Timer"
              max={300}
              min={15}
              name="turn_timer_seconds"
              required
              type="number"
            />
          </div>
          {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-danger">{error}</p> : null}
          <Button disabled={isSubmitting} icon={<Plus className="size-4" />} type="submit">
            {isSubmitting ? 'Membuat...' : 'Create Room'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
