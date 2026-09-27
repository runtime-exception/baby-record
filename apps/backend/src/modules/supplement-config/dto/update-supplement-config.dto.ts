import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateSupplementConfigDto } from './create-supplement-config.dto';

export class UpdateSupplementConfigDto extends PartialType(CreateSupplementConfigDto) {
  @ApiPropertyOptional({ description: '是否在新记录中可选' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
