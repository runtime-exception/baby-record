import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { FamilyRequest } from '../auth/family-scope';
import { FamilyService } from './family.service';
import { ApplyDto, ClaimDto } from './identity.dto';

class DecisionDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';
}

@Controller('family')
export class FamilyController {
  constructor(private readonly family: FamilyService) {}

  @Post('applications')
  apply(@Req() request: FamilyRequest, @Body() dto: ApplyDto) {
    return this.family.apply(request.accountId, dto);
  }

  @Get('applications')
  applications(@Req() request: FamilyRequest) {
    return this.family.listApplications(request.accountId);
  }

  @Post('claim')
  claim(@Req() request: FamilyRequest, @Body() dto: ClaimDto) {
    return this.family.claim(request.accountId, dto);
  }

  @Get(':babyId/members')
  members(@Req() request: FamilyRequest, @Param('babyId', ParseIntPipe) babyId: number) {
    return this.family.listMembers(request.accountId, babyId);
  }

  @Patch(':babyId/members/:accountId')
  decide(
    @Req() request: FamilyRequest,
    @Param('babyId', ParseIntPipe) babyId: number,
    @Param('accountId', ParseIntPipe) accountId: number,
    @Body() dto: DecisionDto,
  ) {
    return this.family.changeStatus(request.accountId, babyId, accountId, dto.status);
  }

  @Delete(':babyId/members/:accountId')
  remove(
    @Req() request: FamilyRequest,
    @Param('babyId', ParseIntPipe) babyId: number,
    @Param('accountId', ParseIntPipe) accountId: number,
  ) {
    return this.family.changeStatus(request.accountId, babyId, accountId, 'REMOVED');
  }
}
