import { Body, Controller, Post } from '@nestjs/common';
import { CreateGuestDto } from './dto/create-guest.dto';
import { GuestResponse, GuestsService } from './guests.service';

@Controller('guests')
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Post()
  createGuest(@Body() body: CreateGuestDto): Promise<GuestResponse> {
    return this.guestsService.createGuest(body.nickname);
  }
}
