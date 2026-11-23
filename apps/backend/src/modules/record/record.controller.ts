import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RecordService } from './record.service';
import { BabyIdPipe } from '../../common/pipes/baby-id.pipe';

@ApiTags('聚合查询')
@Controller('records')
export class RecordController {
  constructor(private readonly recordService: RecordService) {}

  @Get('daily')
  @ApiOperation({ summary: '查询某天全部记录（喂养/纸尿裤/睡眠/补剂/成长事件）' })
  @ApiQuery({ name: 'babyId', required: true, type: String })
  @ApiQuery({ name: 'date', required: true, example: '2026-08-03' })
  findDaily(@Query('babyId', BabyIdPipe) babyId: string, @Query('date') date: string) {
    return this.recordService.findDaily(babyId, date);
  }

  @Get('range')
  @ApiOperation({ summary: '查询指定时间范围内全部记录' })
  @ApiQuery({ name: 'babyId', required: true, type: String })
  @ApiQuery({ name: 'startDate', required: true, example: '2026-08-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2026-08-03' })
  findRange(
    @Query('babyId', BabyIdPipe) babyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.recordService.findRange(babyId, startDate, endDate);
  }
}
