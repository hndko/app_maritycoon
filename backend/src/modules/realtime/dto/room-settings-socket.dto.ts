import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class RoomSettingsSocketDto {
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

  @Type(() => Number)
  @IsInt()
  @Min(1)
  starting_money!: number;

  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(300)
  turn_timer_seconds!: number;
}
