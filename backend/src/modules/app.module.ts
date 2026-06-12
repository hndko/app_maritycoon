import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from '../infrastructure/database/database.module';
import { RateLimitGuard } from '../infrastructure/security/rate-limit.guard';
import { GameModule } from './game/game.module';
import { GuestsModule } from './guests/guests.module';
import { HealthController } from './health/health.controller';
import { RoomsModule } from './rooms/rooms.module';

@Module({
  imports: [DatabaseModule, GuestsModule, RoomsModule, GameModule],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
