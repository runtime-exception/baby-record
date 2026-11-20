import { Module } from '@nestjs/common';
import { BabyController } from './baby.controller';
import { BabyService } from './baby.service';

@Module({
  controllers: [BabyController],
  providers: [BabyService],
  exports: [BabyService],
})
export class BabyModule {}
