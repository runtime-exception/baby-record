import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateBabyDto } from './create-baby.dto';

export class UpdateBabyDto extends PartialType(OmitType(CreateBabyDto, ['avatar'] as const)) {}
