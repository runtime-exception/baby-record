import { PartialType } from '@nestjs/swagger';
import { CreateFoodAllergyDto } from './create-food-allergy.dto';

export class UpdateFoodAllergyDto extends PartialType(CreateFoodAllergyDto) {}
