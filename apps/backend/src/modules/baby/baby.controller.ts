import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { resolve } from 'node:path';
import { BabyService } from './baby.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { FamilyRequest } from '../auth/family-scope';
import { CreateFamilyBabyDto } from './dto/create-baby.dto';
import { UpdateBabyDto } from './dto/update-baby.dto';

@ApiTags('宝宝基础信息')
@Controller('babies')
export class BabyController {
  constructor(private readonly babyService: BabyService) {}

  @Post()
  create(@Req() request: FamilyRequest, @Body() dto: CreateFamilyBabyDto) {
    return this.babyService.create(request.accountId, dto);
  }

  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024, files: 1 } }))
  uploadAvatar(@Param('id', ParseIntPipe) id: number, @UploadedFile() file?: Express.Multer.File) {
    if (!file?.buffer) throw new BusinessException(ErrorCode.PARAM_MISSING, '请上传头像文件');
    const bytes = file.buffer;
    const prefix = bytes.subarray(0, 12).toString('hex');
    let type: string;
    if (prefix.startsWith('ffd8ff')) type = 'jpeg';
    else if (prefix.startsWith('89504e470d0a1a0a')) type = 'png';
    else if (prefix.startsWith('474946383761') || prefix.startsWith('474946383961')) type = 'gif';
    else if (prefix.startsWith('52494646') && prefix.endsWith('57454250')) type = 'webp';
    else throw new BusinessException(ErrorCode.PARAM_INVALID, '请选择 JPEG、PNG、GIF 或 WebP 图片');
    return this.babyService.uploadAvatar(id, 'data:image/' + type + ';base64,' + bytes.toString('base64'));
  }

  @Get(':id/avatar')
  async avatar(@Param('id', ParseIntPipe) id: number, @Res() response: Response) {
    const avatar = await this.babyService.avatarContent(id);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (avatar.body) {
      response.type(avatar.type).send(avatar.body);
      return;
    }
    response.sendFile(avatar.filename, { root: resolve('uploads'), cacheControl: false }, (error) => {
      if (error && !response.headersSent) response.status(404).end();
    });
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBabyDto) {
    return this.babyService.update(id, dto);
  }

  @Get()
  findAll(@Req() request: FamilyRequest) {
    return this.babyService.findAll(request.accountId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.babyService.findOne(id);
  }
}
