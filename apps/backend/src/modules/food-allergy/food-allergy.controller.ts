import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FoodAllergyService } from './food-allergy.service';
import { CreateFoodAllergyDto } from './dto/create-food-allergy.dto';
import { UpdateFoodAllergyDto } from './dto/update-food-allergy.dto';
import { QueryFoodAllergyDto } from './dto/query-food-allergy.dto';

@ApiTags('辅食排敏')
@Controller('food-allergies')
export class FoodAllergyController {
  constructor(private readonly service: FoodAllergyService) {}

  @Post()
  @ApiOperation({ summary: '新增辅食排敏记录，系统评分由服务端计算' })
  create(@Body() dto: CreateFoodAllergyDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryFoodAllergyDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFoodAllergyDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
