import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChatMessageSocketDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(280)
  message!: string;
}
