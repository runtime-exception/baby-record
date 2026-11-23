import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AllergyConclusion } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';
import { BABY_ID_PATTERN } from '../../../common/utils/baby-id.util';
import { ObservationState } from '../allergy-score';

export class FoodAllergyObservationsDto {
  @IsIn(['YES', 'NO', 'UNOBSERVED']) hives: ObservationState;
  @IsIn(['YES', 'NO', 'UNOBSERVED']) facialSwelling: ObservationState;
  @IsIn(['YES', 'NO', 'UNOBSERVED']) immediateVomiting: ObservationState;
  @IsIn(['YES', 'NO', 'UNOBSERVED']) persistentCough: ObservationState;
  @IsIn(['YES', 'NO', 'UNOBSERVED']) breathingAbnormal: ObservationState;
  @IsIn(['YES', 'NO', 'UNOBSERVED']) repetitiveVomiting: ObservationState;
  @IsIn(['YES', 'NO', 'UNOBSERVED']) pallor: ObservationState;
  @IsIn(['YES', 'NO', 'UNOBSERVED']) lethargy: ObservationState;
  @IsIn(['YES', 'NO', 'UNOBSERVED']) eczemaWorsened: ObservationState;
  @IsIn(['YES', 'NO', 'UNOBSERVED']) delayedVomiting: ObservationState;
  @IsIn(['YES', 'NO', 'UNOBSERVED']) diarrhea: ObservationState;
}

export class CreateFoodAllergyDto {
  @ApiProperty()
  @IsString()
  @Matches(BABY_ID_PATTERN, { message: '宝宝 ID 必须是 16 位十六进制字符' })
  babyId: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  foodId: number;

  @ApiProperty()
  @IsDateString()
  exposureTime: string;

  @ApiProperty({ type: FoodAllergyObservationsDto })
  @ValidateNested()
  @Type(() => FoodAllergyObservationsDto)
  observations: FoodAllergyObservationsDto;

  @ApiProperty({ enum: AllergyConclusion })
  @IsEnum(AllergyConclusion)
  finalConclusion: AllergyConclusion;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  creatorId: number;
}
