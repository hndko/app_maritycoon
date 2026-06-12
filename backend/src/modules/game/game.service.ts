import { Injectable } from '@nestjs/common';
import { GameRepository, PropertyRecord } from './game.repository';

@Injectable()
export class GameService {
  constructor(private readonly gameRepository: GameRepository) {}

  listProperties(): Promise<PropertyRecord[]> {
    return this.gameRepository.listProperties();
  }
}
