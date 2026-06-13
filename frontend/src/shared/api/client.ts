import { frontendEnv } from '../config/env';
import {
  CreateRoomInput,
  CreateRoomResponse,
  JoinRoomInput,
  JoinRoomResponse,
  PropertyTile,
  PublicRoomFilter,
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

  listPublicRooms(filter: PublicRoomFilter = {}): Promise<PublicRoom[]> {
    const params = new URLSearchParams();

    if (filter.status) params.set('status', filter.status);
    if (filter.max_players) params.set('max_players', String(filter.max_players));
    if (filter.full !== undefined) params.set('full', String(filter.full));

    const query = params.toString();
    return request<PublicRoom[]>(`/rooms/public${query ? `?${query}` : ''}`);
  },
};
