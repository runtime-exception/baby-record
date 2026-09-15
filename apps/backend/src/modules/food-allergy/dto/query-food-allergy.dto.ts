import { ApiPropertyOptional } from '@nestjs/swagger';
import { AllergyConclusion } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { RecordQueryDto } from '../../../common/dto/record-query.dto';

export class QueryFoodAllergyDto extends RecordQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  foodId?: number;

  @ApiPropertyOptional({ enum: AllergyConclusion })
  @IsOptional()
  @IsEnum(AllergyConclusion)
  conclusion?: AllergyConclusion;
}
