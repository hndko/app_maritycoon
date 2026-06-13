import { IsUUID } from 'class-validator';

export class PlayerActionSocketDto {
  @IsUUID()
  player_id!: string;
}
