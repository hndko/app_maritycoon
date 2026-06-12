import { io, Socket } from 'socket.io-client';
import { frontendEnv } from '../config/env';

export function createSocket(): Socket {
  return io(frontendEnv.socketUrl, {
    reconnectionAttempts: 5,
    transports: ['websocket'],
  });
}
