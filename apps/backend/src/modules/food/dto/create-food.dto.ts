import { ApiProperty } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFoodDto {
  @ApiProperty({ example: '南瓜' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  name: string;

  @ApiPropertyOptional({ example: '🎃', description: '辅食图标，留空时按名称自动推断' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  emoji?: string | null;
}
