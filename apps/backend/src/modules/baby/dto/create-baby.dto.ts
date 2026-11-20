import { FamilyIdentityDto } from '../../family/identity.dto';
import { ApiPropertyOptional, ApiProperty, IntersectionType, OmitType } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateBabyDto {
  @ApiProperty({ example: '小宝', description: '宝宝姓名' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '豆豆', description: '昵称' })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiProperty({ enum: Gender, example: Gender.MALE, description: '性别' })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ example: '2026-04-01', description: '生日 YYYY-MM-DD' })
  @IsDateString()
  birthday: string;

  @ApiPropertyOptional({ example: 3.5, description: '出生体重(kg)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  birthWeight?: number;

  @ApiPropertyOptional({ example: 50.0, description: '出生身高(cm)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(200)
  birthHeight?: number;

  @ApiPropertyOptional({ example: 34.0, description: '头围(cm)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  headCircumference?: number;

  @ApiPropertyOptional({ example: '市妇幼保健院', description: '出生医院' })
  @IsOptional()
  @IsString()
  birthHospital?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiPropertyOptional({ description: '头像 URL（一般通过上传接口设置）' })
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class CreateFamilyBabyDto extends IntersectionType(OmitType(CreateBabyDto, ['avatar'] as const), FamilyIdentityDto) {}
