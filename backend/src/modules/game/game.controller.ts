import { Controller, Get } from '@nestjs/common';
import { PropertyRecord } from './game.repository';
import { GameService } from './game.service';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('properties')
  listProperties(): Promise<PropertyRecord[]> {
    return this.gameService.listProperties();
  }
}
