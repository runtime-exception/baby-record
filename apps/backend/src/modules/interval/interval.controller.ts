import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IntervalService } from './interval.service';
import { BabyIdPipe } from '../../common/pipes/baby-id.pipe';

@ApiTags('时间间隔分析')
@Controller('intervals')
export class IntervalController {
  constructor(private readonly intervalService: IntervalService) {}

  @Get('feeding')
  @ApiOperation({ summary: '喂养间隔（最近两次喂养时间与间隔）' })
  @ApiQuery({ name: 'babyId', required: true, type: String })
  feeding(@Query('babyId', BabyIdPipe) babyId: string) {
    return this.intervalService.feeding(babyId);
  }

  @Get('diaper')
  @ApiOperation({ summary: '纸尿裤更换间隔' })
  @ApiQuery({ name: 'babyId', required: true, type: String })
  diaper(@Query('babyId', BabyIdPipe) babyId: string) {
    return this.intervalService.diaper(babyId);
  }

  @Get('sleep')
  @ApiOperation({ summary: '睡眠间隔（按开始时间）' })
  @ApiQuery({ name: 'babyId', required: true, type: String })
  sleep(@Query('babyId', BabyIdPipe) babyId: string) {
    return this.intervalService.sleep(babyId);
  }
}
