import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
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
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.service.findAll(includeInactive === 'true');
  }

  @Post()
  create(@Body() dto: CreateExerciseConfigDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateExerciseConfigDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
