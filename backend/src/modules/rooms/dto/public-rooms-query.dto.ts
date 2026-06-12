import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class PublicRoomsQueryDto {
  @IsOptional()
  @IsIn(['waiting', 'playing', 'finished'])
  status?: 'waiting' | 'playing' | 'finished';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(8)
  max_players?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') {
      return true;
    }

    if (value === false || value === 'false') {
      return false;
    }

    return value;
  })
  @IsBoolean()
  full?: boolean;
}
