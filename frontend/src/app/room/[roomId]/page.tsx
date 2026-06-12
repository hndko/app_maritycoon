import { AppShell } from '@/components/layout/AppShell';
import { RoomClient } from './RoomClient';

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;

  return (
    <AppShell>
      <RoomClient roomId={roomId} />
    </AppShell>
  );
}
