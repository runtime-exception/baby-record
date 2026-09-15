import { Module } from '@nestjs/common';
import { FoodAllergyController } from './food-allergy.controller';
import { FoodAllergyService } from './food-allergy.service';

@Module({ controllers: [FoodAllergyController], providers: [FoodAllergyService] })
export class FoodAllergyModule {}
