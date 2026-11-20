import { FamilyRequest } from '../auth/family-scope';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
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
  findAll(@Req() request: FamilyRequest, @Query('includeInactive') includeInactive?: string) {
    return this.service.findAll(request.babyId, includeInactive === 'true');
  }

  @Post()
  create(@Req() request: FamilyRequest, @Body() dto: CreateSupplementConfigDto) {
    return this.service.create(request.babyId, dto);
  }

  @Patch(':id')
  update(@Req() request: FamilyRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSupplementConfigDto) {
    return this.service.update(request.babyId, id, dto);
  }

  @Delete(':id')
  remove(@Req() request: FamilyRequest, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(request.babyId, id);
  }
}
