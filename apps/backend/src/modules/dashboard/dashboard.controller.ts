import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { BabyIdPipe } from '../../common/pipes/baby-id.pipe';

@ApiTags('首页仪表盘')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: '首页状态卡片：距离上次喂养/换纸尿裤/睡眠' })
  @ApiQuery({ name: 'babyId', required: true, type: String })
  overview(@Query('babyId', BabyIdPipe) babyId: string) {
    return this.dashboardService.overview(babyId);
  }
}
