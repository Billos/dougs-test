import { Body, Controller, HttpCode, HttpException, Post } from '@nestjs/common';

import { Balance, Movement } from './movement.model';
import { MovementsService } from './movements.service';

@Controller('/movements')
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Post('/validation')
  // Return 200 OK if the validation is successful
  @HttpCode(200)
  validation(@Body('movements') movements: Movement[], @Body('balances') balances: Balance[]): boolean {
    const cause = this.movementsService.validation(movements, balances);

    // Return 200 OK if the validation is successful
    if (cause.length === 0) {
      return true;
    }
    // Return 400 Bad Request if the validation fails
    throw new HttpException('Validation failed', 400, { cause });
  }
}
