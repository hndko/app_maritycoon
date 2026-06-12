import { Injectable } from '@nestjs/common';
import { GuestsRepository } from './guests.repository';

export type GuestResponse = {
  guest_id: string;
  nickname: string;
};

@Injectable()
export class GuestsService {
  constructor(private readonly guestsRepository: GuestsRepository) {}

  async createGuest(nickname: string): Promise<GuestResponse> {
    const guest = await this.guestsRepository.create(nickname.trim());

    return {
      guest_id: guest.id,
      nickname: guest.nickname,
    };
  }
}
