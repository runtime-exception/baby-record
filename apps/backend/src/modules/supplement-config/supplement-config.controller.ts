import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SupplementConfigService } from './supplement-config.service';
import { CreateSupplementConfigDto } from './dto/create-supplement-config.dto';
import { UpdateSupplementConfigDto } from './dto/update-supplement-config.dto';

@ApiTags('补剂配置')
@Controller('supplement-configs')
export class SupplementConfigController {
  constructor(private readonly service: SupplementConfigService) {}

  @Get()
  @ApiOperation({ summary: '查询家庭共享补剂配置' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.service.findAll(includeInactive === 'true');
  }

  @Post()
  create(@Body() dto: CreateSupplementConfigDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSupplementConfigDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
