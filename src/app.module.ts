import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MovementsController } from './movements/movements.controller';

@Module({
  imports: [],
  controllers: [AppController, MovementsController],
  providers: [AppService],
})
export class AppModule {}
