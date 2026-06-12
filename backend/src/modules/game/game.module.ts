import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameRepository } from './game.repository';
import { GameService } from './game.service';

@Module({
  controllers: [GameController],
  providers: [GameRepository, GameService],
})
export class GameModule {}
