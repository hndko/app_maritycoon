import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service';

export type PropertyRecord = {
  id: number;
  name: string;
  type: string;
  color_group: string | null;
  price: number | null;
  base_rent: number | null;
  rent_1_house: number | null;
  rent_2_house: number | null;
  rent_3_house: number | null;
  rent_4_house: number | null;
  rent_hotel: number | null;
  house_price: number | null;
  mortgage_value: number | null;
};

@Injectable()
export class GameRepository {
  constructor(private readonly database: DatabaseService) {}

  async listProperties(): Promise<PropertyRecord[]> {
    const result = await this.database.query<PropertyRecord>(
      `
        SELECT
          id,
          name,
          type,
          color_group,
          price,
          base_rent,
          rent_1_house,
          rent_2_house,
          rent_3_house,
          rent_4_house,
          rent_hotel,
          house_price,
          mortgage_value
        FROM properties
        ORDER BY id ASC
      `,
    );

    return result.rows;
  }
}
