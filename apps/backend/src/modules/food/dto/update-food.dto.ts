import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateFoodDto } from './create-food.dto';

export class UpdateFoodDto extends PartialType(CreateFoodDto) {
  @ApiPropertyOptional({ description: '是否在新记录中可选' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
