import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class JoinRoomSocketDto {
  @IsUUID()
  room_id!: string;

  @IsUUID()
  player_id!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  user_nickname!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  session_token?: string;
}
