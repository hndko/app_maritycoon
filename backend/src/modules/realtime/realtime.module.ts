import { Module } from '@nestjs/common';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { GameModule } from '../game/game.module';
import { RoomsModule } from '../rooms/rooms.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { RealtimeStateStore } from './realtime-state.store';

@Module({
  imports: [RedisModule, RoomsModule, GameModule],
  providers: [RealtimeGateway, RealtimeService, RealtimeStateStore],
})
export class RealtimeModule {}
