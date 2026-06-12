import { frontendEnv } from '../config/env';
import {
  CreateRoomInput,
  CreateRoomResponse,
  JoinRoomInput,
  JoinRoomResponse,
  PropertyTile,
  PublicRoom,
  RoomDetail,
} from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${frontendEnv.apiUrl}/api${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message ?? 'Request failed';
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  createRoom(input: CreateRoomInput): Promise<CreateRoomResponse> {
    return request<CreateRoomResponse>('/rooms', {
      body: JSON.stringify(input),
      method: 'POST',
    });
  },

  getProperties(): Promise<PropertyTile[]> {
    return request<PropertyTile[]>('/game/properties');
  },

  getRoom(roomId: string): Promise<RoomDetail> {
    return request<RoomDetail>(`/rooms/${roomId}`);
  },

  joinRoom(input: JoinRoomInput): Promise<JoinRoomResponse> {
    return request<JoinRoomResponse>('/rooms/join', {
      body: JSON.stringify(input),
      method: 'POST',
    });
  },

  listPublicRooms(): Promise<PublicRoom[]> {
    return request<PublicRoom[]>('/rooms/public');
  },
};
