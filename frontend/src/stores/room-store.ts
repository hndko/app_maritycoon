'use client';

import { create } from 'zustand';
import { ChatMessage, RealtimeRoomState, RoomDetail } from '@/shared/api/types';
import { RoomSession } from '@/shared/session/session-store';

type RoomStore = {
  chatMessages: ChatMessage[];
  error: string | null;
  isConnected: boolean;
  room: RoomDetail | null;
  session: RoomSession | null;
  state: RealtimeRoomState | null;
  appendChat: (message: ChatMessage) => void;
  setConnected: (isConnected: boolean) => void;
  setError: (error: string | null) => void;
  setRoom: (room: RoomDetail | null) => void;
  setSession: (session: RoomSession | null) => void;
  setState: (state: RealtimeRoomState) => void;
};

export const useRoomStore = create<RoomStore>((set) => ({
  chatMessages: [],
  error: null,
  isConnected: false,
  room: null,
  session: null,
  state: null,
  appendChat: (message) =>
    set((current) => ({
      chatMessages: [...current.chatMessages.slice(-49), message],
    })),
  setConnected: (isConnected) => set({ isConnected }),
  setError: (error) => set({ error }),
  setRoom: (room) => set({ room }),
  setSession: (session) => set({ session }),
  setState: (state) =>
    set((current) => ({
      room: current.room
        ? {
            ...current.room,
            players: state.players,
            status: state.status,
          }
        : current.room,
      state,
    })),
}));
