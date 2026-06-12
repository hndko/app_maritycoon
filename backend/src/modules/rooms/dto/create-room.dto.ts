import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  host_nickname!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  room_name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(8)
  max_players!: number;

  @IsBoolean()
  is_public!: boolean;

  @IsOptional()
  @IsIn(['public', 'private', 'invite_only'])
  visibility?: 'public' | 'private' | 'invite_only';

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(100)
  password?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  starting_money!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(300)
  turn_timer_seconds?: number;
}
