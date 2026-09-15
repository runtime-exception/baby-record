import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedingType } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateFeedingDto {
  @ApiProperty({ description: '宝宝ID' })
  @Type(() => Number)
  @IsInt()
  babyId: number;

  @ApiProperty({ enum: FeedingType, example: FeedingType.FORMULA, description: '喂养类型' })
  @IsEnum(FeedingType)
  feedingType: FeedingType;

  @ApiProperty({ example: '2026-08-03T10:30:00.000Z', description: '喂养时间' })
  @IsDateString()
  feedingTime: string;

  @ApiPropertyOptional({ example: 120, description: '奶量(ml)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amountMl?: number;

  @ApiPropertyOptional({ example: 15, description: '持续时长(分钟)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationMinutes?: number;

  @ApiPropertyOptional({ type: [Number], description: '辅食ID列表；辅食类型必填，混合类型选填' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  foodIds?: number[];

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ description: '记录人ID' })
  @Type(() => Number)
  @IsInt()
  creatorId: number;
}
