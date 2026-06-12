import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { PublicRoomsQueryDto } from './dto/public-rooms-query.dto';
import {
  CreateRoomResponse,
  JoinRoomResponse,
  RoomDetailResponse,
  RoomsService,
} from './rooms.service';
import { PublicRoomRecord, RoomPlayerRecord } from './rooms.repository';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  createRoom(@Body() body: CreateRoomDto): Promise<CreateRoomResponse> {
    return this.roomsService.createRoom(body);
  }

  @Get('public')
  listPublicRooms(
    @Query() query: PublicRoomsQueryDto,
  ): Promise<PublicRoomRecord[]> {
    return this.roomsService.listPublicRooms(query);
  }

  @Post('join')
  joinRoom(@Body() body: JoinRoomDto): Promise<JoinRoomResponse> {
    return this.roomsService.joinRoom(body);
  }

  @Get(':roomId')
  getRoom(@Param('roomId') roomId: string): Promise<RoomDetailResponse> {
    return this.roomsService.getRoom(roomId);
  }

  @Get(':roomId/players')
  listPlayers(@Param('roomId') roomId: string): Promise<RoomPlayerRecord[]> {
    return this.roomsService.listPlayers(roomId);
  }
}
