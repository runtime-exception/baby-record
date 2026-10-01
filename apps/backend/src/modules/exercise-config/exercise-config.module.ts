import { Module } from '@nestjs/common';
import { ExerciseConfigController } from './exercise-config.controller';
import { ExerciseConfigService } from './exercise-config.service';

@Module({
  controllers: [ExerciseConfigController],
  providers: [ExerciseConfigService],
  exports: [ExerciseConfigService],
})
export class ExerciseConfigModule {}
