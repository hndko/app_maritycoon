import { Module } from '@nestjs/common';
import { GuestsController } from './guests.controller';
import { GuestsRepository } from './guests.repository';
import { GuestsService } from './guests.service';

@Module({
  controllers: [GuestsController],
  providers: [GuestsRepository, GuestsService],
  exports: [GuestsRepository, GuestsService],
})
export class GuestsModule {}
