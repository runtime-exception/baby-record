import { FamilyRequest } from '../auth/family-scope';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FoodService } from './food.service';
import { CreateFoodDto } from './dto/create-food.dto';
import { UpdateFoodDto } from './dto/update-food.dto';

@ApiTags('辅食字典')
@Controller('foods')
export class FoodController {
  constructor(private readonly foodService: FoodService) {}

  @Get()
  @ApiOperation({ summary: '查询家庭共享辅食列表' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  findAll(@Req() request: FamilyRequest, @Query('includeInactive') includeInactive?: string) {
    return this.foodService.findAll(request.babyId, includeInactive === 'true');
  }

  @Post()
  create(@Req() request: FamilyRequest, @Body() dto: CreateFoodDto) {
    return this.foodService.create(request.babyId, dto);
  }

  @Patch(':id')
  update(@Req() request: FamilyRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFoodDto) {
    return this.foodService.update(request.babyId, id, dto);
  }

  @Delete(':id')
  remove(@Req() request: FamilyRequest, @Param('id', ParseIntPipe) id: number) {
    return this.foodService.remove(request.babyId, id);
  }
}
