import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateGuestDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  nickname!: string;
}
