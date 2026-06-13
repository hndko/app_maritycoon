import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomBytes } from 'node:crypto';
import { getSessionTokenSecret } from '../../infrastructure/config/env.validation';
import { PasswordService } from '../../infrastructure/security/password.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { PublicRoomsQueryDto } from './dto/public-rooms-query.dto';
import { RoomCodeService } from './room-code.service';
import {
  PublicRoomRecord,
  RoomPlayerRecord,
  RoomsRepository,
  RoomVisibility,
} from './rooms.repository';

export type CreateRoomResponse = {
  room_id: string;
  room_code: string;
  share_url: string;
  guest_id: string;
  player_id: string;
  session_token: string;
};

export type JoinRoomResponse =
  | {
      room_id: string;
      status: 'need_password' | 'full';
    }
  | {
      room_id: string;
      status: 'success';
      guest_id: string;
      player_id: string;
      session_token: string;
    };

export type RoomDetailResponse = {
  room_id: string;
  room_code: string;
  room_name: string;
  is_public: boolean;
  visibility: RoomVisibility;
  max_players: number;
  starting_money: number;
  turn_timer_seconds: number;
  status: string;
  players: RoomPlayerRecord[];
};

const defaultTurnTimerSeconds = 60;
const maxRoomCodeAttempts = 5;

@Injectable()
export class RoomsService {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly roomCodeService: RoomCodeService,
    private readonly passwordService: PasswordService,
  ) {}

  async createRoom(input: CreateRoomDto): Promise<CreateRoomResponse> {
    const visibility = this.resolveVisibility(input);
    const isPublic = visibility === 'public';
    const passwordHash = input.password
      ? await this.passwordService.hash(input.password)
      : null;
    const roomCode = await this.generateUniqueRoomCode();
    const inviteCode =
      visibility === 'invite_only' ? randomBytes(24).toString('hex') : null;

    const created = await this.roomsRepository.createRoomWithHost({
      roomCode,
      roomName: input.room_name.trim(),
      passwordHash,
      isPublic,
      visibility,
      inviteCode,
      maxPlayers: input.max_players,
      startingMoney: input.starting_money,
      turnTimerSeconds: input.turn_timer_seconds ?? defaultTurnTimerSeconds,
      hostNickname: input.host_nickname.trim(),
    });

    return {
      room_id: created.room_id,
      room_code: created.room_code,
      share_url: this.createShareUrl(created.room_code, inviteCode),
      guest_id: created.host_guest_id,
      player_id: created.host_player_id,
      session_token: this.createSessionToken(created.room_id, created.host_player_id),
    };
  }

  listPublicRooms(query: PublicRoomsQueryDto): Promise<PublicRoomRecord[]> {
    return this.roomsRepository.listPublicRooms({
      status: query.status,
      maxPlayers: query.max_players,
      full: query.full,
    });
  }

  async joinRoom(input: JoinRoomDto): Promise<JoinRoomResponse> {
    const roomCode = input.room_code.trim().toUpperCase();
    const room = await this.roomsRepository.findByCode(roomCode);

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.status === 'finished') {
      throw new ConflictException('Room is finished');
    }

    if (room.visibility === 'invite_only' && input.invite_code !== room.invite_code) {
      throw new UnauthorizedException('Invalid room invite');
    }

    if (room.password_hash && !input.password) {
      return {
        room_id: room.id,
        status: 'need_password',
      };
    }

    if (room.password_hash && input.password) {
      const isValidPassword = await this.passwordService.compare(
        input.password,
        room.password_hash,
      );

      if (!isValidPassword) {
        throw new UnauthorizedException('Invalid room password');
      }
    }

    const playerCount = await this.roomsRepository.countPlayers(room.id);

    if (playerCount >= room.max_players) {
      return {
        room_id: room.id,
        status: 'full',
      };
    }

    const player = await this.roomsRepository.addPlayer({
      roomId: room.id,
      playerName: input.player_name.trim(),
    });

    return {
      room_id: room.id,
      status: 'success',
      guest_id: player.guest_id,
      player_id: player.player_id,
      session_token: this.createSessionToken(room.id, player.player_id),
    };
  }

  async getRoom(roomId: string): Promise<RoomDetailResponse> {
    const room = await this.roomsRepository.findByReference(roomId);

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const players = await this.roomsRepository.listPlayers(roomId);

    return {
      room_id: room.id,
      room_code: room.room_code,
      room_name: room.room_name,
      is_public: room.is_public,
      visibility: room.visibility,
      max_players: room.max_players,
      starting_money: room.starting_money,
      turn_timer_seconds: room.turn_timer_seconds,
      status: room.status,
      players,
    };
  }

  listPlayers(roomId: string): Promise<RoomPlayerRecord[]> {
    return this.roomsRepository.listPlayers(roomId);
  }

  private resolveVisibility(input: CreateRoomDto): RoomVisibility {
    if (input.visibility) {
      return input.visibility;
    }

    return input.is_public ? 'public' : 'private';
  }

  private async generateUniqueRoomCode(): Promise<string> {
    for (let attempt = 0; attempt < maxRoomCodeAttempts; attempt += 1) {
      const roomCode = this.roomCodeService.generate();

      if (!(await this.roomsRepository.roomCodeExists(roomCode))) {
        return roomCode;
      }
    }

    throw new ConflictException('Unable to generate unique room code');
  }

  private createShareUrl(roomCode: string, inviteCode: string | null): string {
    const baseUrl = process.env.PUBLIC_APP_URL ?? 'http://localhost:3000';
    const url = `${baseUrl}/room/${roomCode}`;
    return inviteCode ? `${url}?invite=${inviteCode}` : url;
  }

  private createSessionToken(roomId: string, playerId: string): string {
    const payload = Buffer.from(
      JSON.stringify({
        exp: Date.now() + 24 * 60 * 60 * 1000,
        player_id: playerId,
        room_id: roomId,
      }),
    ).toString('base64url');
    const signature = this.sign(payload);

    return `${payload}.${signature}`;
  }

  private sign(payload: string): string {
    return createHmac('sha256', getSessionTokenSecret())
      .update(payload)
      .digest('base64url');
  }
}
