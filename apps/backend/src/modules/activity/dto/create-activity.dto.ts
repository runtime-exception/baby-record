import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, IsArray, ArrayMaxSize, ArrayUnique, MaxLength, IsIn } from 'class-validator';

export class CreateActivityDto {
  @ApiProperty({ description: '宝宝ID' })
  @Type(() => Number)
  @IsInt()
  babyId: number;

  @ApiPropertyOptional({ description: '运动名称快照，按选择顺序排列', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  exerciseTypes?: string[];

  @ApiPropertyOptional({ description: '运动数量' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  amount?: string | null;

  @ApiPropertyOptional({ enum: ['分钟', '秒', '次'] })
  @IsOptional()
  @IsIn(['分钟', '秒', '次'])
  unit?: string | null;

  @ApiProperty({ example: '抬头', description: '事件类型（运动/洗澡/其他）' })
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @ApiProperty({ example: '2026-08-03T15:00:00.000Z', description: '事件时间' })
  @IsDateString()
  eventTime: string;

  @ApiPropertyOptional({ example: '今天能抬头坚持10秒', description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ description: '记录人ID' })
  @Type(() => Number)
  @IsInt()
  creatorId: number;
}
