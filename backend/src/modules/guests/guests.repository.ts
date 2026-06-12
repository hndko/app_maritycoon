import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service';

export type GuestRecord = {
  id: string;
  nickname: string;
  created_at: Date;
};

@Injectable()
export class GuestsRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(nickname: string): Promise<GuestRecord> {
    const result = await this.database.query<GuestRecord>(
      `
        INSERT INTO users_guest (nickname)
        VALUES ($1)
        RETURNING id, nickname, created_at
      `,
      [nickname],
    );

    return result.rows[0];
  }
}
