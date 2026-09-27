import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSupplementConfigDto {
  @ApiProperty({ example: '维生素D' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  name: string;

  @ApiPropertyOptional({ example: '☀️', description: '补剂图标，留空时显示默认图标' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  emoji?: string | null;

  @ApiPropertyOptional({ example: '1', description: '默认剂量' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  defaultAmount?: string | null;

  @ApiPropertyOptional({ example: '滴', description: '默认单位' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  defaultUnit?: string | null;
}
