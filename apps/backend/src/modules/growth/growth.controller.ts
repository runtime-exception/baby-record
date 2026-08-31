import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GrowthService, GrowthVo } from './growth.service';
import { CreateGrowthDto } from './dto/create-growth.dto';
import { UpdateGrowthDto } from './dto/update-growth.dto';
import { QueryGrowthDto, GrowthTrendQueryDto } from './dto/query-growth.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@ApiTags('身高体重记录')
@Controller('growths')
export class GrowthController {
  constructor(private readonly growthService: GrowthService) {}

  @Post()
  @ApiOperation({ summary: '新增身高/体重记录（至少填写一项）' })
  create(@Body() dto: CreateGrowthDto): Promise<GrowthVo> {
    return this.growthService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '身高体重记录列表（支持宝宝/时间范围/分页）' })
  findAll(@Query() query: QueryGrowthDto): Promise<PaginatedResult<GrowthVo>> {
    return this.growthService.findAll(query);
  }

  @Get('latest')
  @ApiOperation({ summary: '最新一次身高体重记录' })
  findLatest(@Query('babyId', ParseIntPipe) babyId: number): Promise<GrowthVo | null> {
    return this.growthService.findLatest(babyId);
  }

  @Get('trend')
  @ApiOperation({ summary: '身高/体重趋势：实测 + 同龄参考高位P97 + 参考低位P3 + 区间百分比' })
  trend(@Query() query: GrowthTrendQueryDto) {
    return this.growthService.trend(query.babyId, query.metric);
  }

  @Get(':id')
  @ApiOperation({ summary: '身高体重记录详情' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<GrowthVo> {
    return this.growthService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '修改身高体重记录' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGrowthDto): Promise<GrowthVo> {
    return this.growthService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除身高体重记录' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.growthService.remove(id);
  }
}