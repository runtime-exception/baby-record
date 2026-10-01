import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, IsIn } from 'class-validator';

export class CreateExerciseConfigDto {
  @ApiProperty({ example: '抬头' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  name: string;

  @ApiPropertyOptional({ example: '☀️', description: '运动图标，留空时显示默认图标' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  emoji?: string | null;

  @ApiPropertyOptional({ example: '1', description: '默认数量' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  defaultAmount?: string;

  @ApiPropertyOptional({ example: '分钟', description: '默认单位' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @IsIn(['分钟', '秒', '次'])
  defaultUnit?: string;
}
