import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TemperatureService, TemperatureVo } from './temperature.service';
import { CreateTemperatureDto } from './dto/create-temperature.dto';
import { UpdateTemperatureDto } from './dto/update-temperature.dto';
import { QueryTemperatureDto } from './dto/query-temperature.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { BabyIdPipe } from '../../common/pipes/baby-id.pipe';

@ApiTags('体温记录')
@Controller('temperatures')
export class TemperatureController {
  constructor(private readonly temperatureService: TemperatureService) {}

  @Post()
  @ApiOperation({ summary: '新增体温记录' })
  create(@Body() dto: CreateTemperatureDto): Promise<TemperatureVo> {
    return this.temperatureService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '体温记录列表' })
  findAll(@Query() query: QueryTemperatureDto): Promise<PaginatedResult<TemperatureVo>> {
    return this.temperatureService.findAll(query);
  }

  @Get('latest')
  @ApiOperation({ summary: '最新一次体温' })
  findLatest(@Query('babyId', BabyIdPipe) babyId: string): Promise<TemperatureVo | null> {
    return this.temperatureService.findLatest(babyId);
  }

  @Get(':id')
  @ApiOperation({ summary: '体温记录详情' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<TemperatureVo> {
    return this.temperatureService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '修改体温记录' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTemperatureDto): Promise<TemperatureVo> {
    return this.temperatureService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除体温记录' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.temperatureService.remove(id);
  }
}
