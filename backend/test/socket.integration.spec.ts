import { io, Socket } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';

const backendUrl = process.env.SOCKET_TEST_URL;
const describeIf = backendUrl ? describe : describe.skip;

describeIf('Socket.IO integration', () => {
  let socket: Socket | null = null;

  afterEach(() => {
    socket?.disconnect();
    socket = null;
  });

  it('connects to a running backend socket server', async () => {
    socket = io(backendUrl, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 3000,
    });

    await new Promise<void>((resolve, reject) => {
      socket?.once('connect', resolve);
      socket?.once('connect_error', reject);
    });

    expect(socket.connected).toBe(true);
  });
});
