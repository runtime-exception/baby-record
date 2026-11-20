import { FamilyRequest } from '../auth/family-scope';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ExerciseConfigService } from './exercise-config.service';
import { CreateExerciseConfigDto } from './dto/create-exercise-config.dto';
import { UpdateExerciseConfigDto } from './dto/update-exercise-config.dto';

@ApiTags('运动配置')
@Controller('exercise-configs')
export class ExerciseConfigController {
  constructor(private readonly service: ExerciseConfigService) {}

  @Get()
  @ApiOperation({ summary: '查询家庭共享运动配置' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  findAll(@Req() request: FamilyRequest, @Query('includeInactive') includeInactive?: string) {
    return this.service.findAll(request.babyId, includeInactive === 'true');
  }

  @Post()
  create(@Req() request: FamilyRequest, @Body() dto: CreateExerciseConfigDto) {
    return this.service.create(request.babyId, dto);
  }

  @Patch(':id')
  update(@Req() request: FamilyRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateExerciseConfigDto) {
    return this.service.update(request.babyId, id, dto);
  }

  @Delete(':id')
  remove(@Req() request: FamilyRequest, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(request.babyId, id);
  }
}
