import { IsBoolean } from 'class-validator';

export class ReadyStatusSocketDto {
  @IsBoolean()
  is_ready!: boolean;
}
