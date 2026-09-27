import { Module } from '@nestjs/common';
import { SupplementConfigController } from './supplement-config.controller';
import { SupplementConfigService } from './supplement-config.service';

@Module({
  controllers: [SupplementConfigController],
  providers: [SupplementConfigService],
  exports: [SupplementConfigService],
})
export class SupplementConfigModule {}
