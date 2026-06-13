'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DoorOpen, Plus, RefreshCw } from 'lucide-react';
import { RoomList } from '@/components/rooms/RoomList';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Select } from '@/components/ui/Select';
import { apiClient } from '@/shared/api/client';
import { PublicRoom, PublicRoomFilter } from '@/shared/api/types';

export function HomeClient() {
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [filter, setFilter] = useState<PublicRoomFilter>({});
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRooms() {
    setError(null);
    setLoading(true);

    try {
      setRooms(await apiClient.listPublicRooms(filter));
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
        <div className="mb-4 grid gap-3 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-4">
          <Select
            label="Status"
            onChange={(event) =>
              setFilter((current) => ({
                ...current,
                status: event.target.value ? (event.target.value as PublicRoomFilter['status']) : undefined,
              }))
            }
            value={filter.status ?? ''}
          >
            <option value="">Semua</option>
            <option value="waiting">Menunggu</option>
            <option value="playing">Berlangsung</option>
            <option value="finished">Selesai</option>
          </Select>
          <Select
            label="Max Players"
            onChange={(event) =>
              setFilter((current) => ({
                ...current,
                max_players: event.target.value ? Number(event.target.value) : undefined,
              }))
            }
            value={filter.max_players ?? ''}
          >
            <option value="">Semua</option>
            {[2, 3, 4, 5, 6, 7, 8].map((count) => (
              <option key={count} value={count}>{count}</option>
            ))}
          </Select>
          <Select
            label="Kapasitas"
            onChange={(event) =>
              setFilter((current) => ({
                ...current,
                full: event.target.value === '' ? undefined : event.target.value === 'true',
              }))
            }
            value={filter.full === undefined ? '' : String(filter.full)}
          >
            <option value="">Semua</option>
            <option value="false">Belum penuh</option>
            <option value="true">Full room</option>
          </Select>
          <div className="flex items-end">
            <Button className="w-full" icon={<RefreshCw className="size-4" />} onClick={loadRooms} variant="ghost">
              Apply
            </Button>
          </div>
        </div>
        {error ? <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-danger">{error}</p> : null}
        <RoomList rooms={rooms} />
      </section>
    </div>
  );
}
