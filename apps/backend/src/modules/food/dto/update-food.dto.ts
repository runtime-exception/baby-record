import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateFoodDto } from './create-food.dto';

export class UpdateFoodDto extends PartialType(CreateFoodDto) {
  @ApiPropertyOptional({ description: '是否在新记录中可选' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '🎃', description: '辅食图标，传 null 表示恢复自动推断' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  emoji?: string | null;
}
