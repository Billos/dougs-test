import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MovementsModule } from './movements/movements.module';

@Module({
  imports: [MovementsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
