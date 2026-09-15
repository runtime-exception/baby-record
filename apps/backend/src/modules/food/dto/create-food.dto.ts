import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateFoodDto {
  @ApiProperty({ example: '南瓜' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  name: string;
}
