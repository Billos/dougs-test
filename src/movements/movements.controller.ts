import { Body, Controller, HttpCode, HttpException, Post, UsePipes, ValidationPipe } from '@nestjs/common';

import { ValidationRequest } from './movement.model';
import { MovementsService } from './movements.service';

@Controller('/movements')
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}
  @Post('/validation')
  @UsePipes(new ValidationPipe({ transform: true }))
  // Return 200 OK if the validation is successful
  @HttpCode(200)
  validation(@Body() { movements, balances }: ValidationRequest): boolean {
    const cause = this.movementsService.validation(movements, balances);

    // Return 200 OK if the validation is successful
    if (cause.length === 0) {
      return true;
    }
    // Return 400 Bad Request if the validation fails
    throw new HttpException('Validation failed', 400, { cause });
  }
}
