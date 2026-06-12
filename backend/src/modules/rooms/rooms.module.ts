import { Module } from '@nestjs/common';
import { PasswordService } from '../../infrastructure/security/password.service';
import { RoomCodeService } from './room-code.service';
import { RoomsController } from './rooms.controller';
import { RoomsRepository } from './rooms.repository';
import { RoomsService } from './rooms.service';

@Module({
  controllers: [RoomsController],
  providers: [PasswordService, RoomCodeService, RoomsRepository, RoomsService],
  exports: [RoomsRepository, RoomsService],
})
export class RoomsModule {}
