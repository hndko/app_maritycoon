import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class JoinRoomDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(10)
  room_code!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  player_name!: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(100)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  invite_code?: string;
}
