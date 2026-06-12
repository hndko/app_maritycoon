'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DoorOpen, Plus, RefreshCw } from 'lucide-react';
import { RoomList } from '@/components/rooms/RoomList';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { apiClient } from '@/shared/api/client';
import { PublicRoom } from '@/shared/api/types';

export function HomeClient() {
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRooms() {
    setError(null);
    setLoading(true);

    try {
      setRooms(await apiClient.listPublicRooms());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat room');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRooms();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">MariTycoon</p>
            <h1 className="mt-2 max-w-3xl text-4xl font-bold tracking-normal sm:text-5xl">
              Monopoli Indonesia Online
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-600">
              Buat room, bagikan kode, dan main bareng dari browser desktop atau mobile.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              href="/create-room"
            >
              <Plus className="size-4" />
              <span>Create Room</span>
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-secondary px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
              href="/join"
            >
              <DoorOpen className="size-4" />
              <span>Join Room</span>
            </Link>
            <Button icon={<RefreshCw className="size-4" />} onClick={loadRooms} variant="ghost">
              Refresh
            </Button>
          </div>
        </div>
        <Card className="p-5">
          <h2 className="text-lg font-bold">How To Play</h2>
          <ol className="mt-4 space-y-3 text-sm text-slate-600">
            <li>1. Host membuat room public atau private.</li>
            <li>2. Pemain masuk dengan link atau room code.</li>
            <li>3. Host memulai game saat pemain siap.</li>
            <li>4. Semua aksi game mengikuti state server.</li>
          </ol>
        </Card>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Public Rooms</h2>
            <p className="text-sm text-slate-600">Room publik yang tersedia.</p>
          </div>
          {isLoading ? <LoadingSpinner /> : null}
        </div>
        {error ? <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-danger">{error}</p> : null}
        <RoomList rooms={rooms} />
      </section>
    </div>
  );
}
