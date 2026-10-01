import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateExerciseConfigDto } from './create-exercise-config.dto';

export class UpdateExerciseConfigDto extends PartialType(CreateExerciseConfigDto) {
  @ApiPropertyOptional({ description: '是否在新记录中可选' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
