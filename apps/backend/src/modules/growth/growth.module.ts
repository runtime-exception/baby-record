import { Module } from '@nestjs/common';
import { GrowthController } from './growth.controller';
import { GrowthService } from './growth.service';
import { GrowthStandardsService } from './growth-standards.service';

@Module({
  controllers: [GrowthController],
  providers: [GrowthService, GrowthStandardsService],
  exports: [GrowthService],
})
export class GrowthModule {}