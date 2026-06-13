import { AppShell } from '@/components/layout/AppShell';
import { RoomClient } from './RoomClient';

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const { roomId } = await params;
  const { invite } = await searchParams;

  return (
    <AppShell>
      <RoomClient inviteCode={invite} roomId={roomId} />
    </AppShell>
  );
}
