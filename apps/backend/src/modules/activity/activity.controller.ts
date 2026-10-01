import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActivityService, ActivityVo } from './activity.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { QueryActivityDto } from './dto/query-activity.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@ApiTags('成长事件')
@Controller('activities')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post()
  @ApiOperation({ summary: '新增成长事件（运动/洗澡/其他）' })
  create(@Body() dto: CreateActivityDto): Promise<ActivityVo> {
    return this.activityService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '成长事件列表' })
  findAll(@Query() query: QueryActivityDto): Promise<PaginatedResult<ActivityVo>> {
    return this.activityService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '成长事件详情' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ActivityVo> {
    return this.activityService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '修改成长事件' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateActivityDto): Promise<ActivityVo> {
    return this.activityService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除成长事件' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.activityService.remove(id);
  }
}
