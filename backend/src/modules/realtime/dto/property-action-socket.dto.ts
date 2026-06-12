import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class PropertyActionSocketDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(39)
  property_id!: number;
}
