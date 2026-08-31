import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateGrowthDto {
  @ApiProperty({ description: '宝宝ID' })
  @Type(() => Number)
  @IsInt()
  babyId: number;

  @ApiPropertyOptional({ example: 65.2, description: '身高(cm)，范围 20-160；与 weight 至少填一项' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(20)
  @Max(160)
  height?: number;

  @ApiPropertyOptional({ example: 7.4, description: '体重(kg)，范围 0.5-60；与 height 至少填一项' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(60)
  weight?: number;

  @ApiPropertyOptional({ example: 36.5, description: '头围(cm)，预留' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(20)
  @Max(80)
  headCircumference?: number;

  @ApiProperty({ example: '2026-08-04T10:30:00.000Z', description: '测量时间' })
  @IsDateString()
  measureTime: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ description: '记录人ID' })
  @Type(() => Number)
  @IsInt()
  creatorId: number;
}