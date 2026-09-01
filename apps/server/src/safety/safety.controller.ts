import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { User } from '../auth/user.decorator';
import { CreateBlockDto, CreateReportDto } from './dto/safety.dto';
import { SafetyService } from './safety.service';

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly safety: SafetyService) {}

  @Post()
  create(@User('id') userId: string, @Body() dto: CreateReportDto) {
    return this.safety.report(userId, dto);
  }

  @Get()
  list(@User('id') userId: string) {
    return this.safety.listReports(userId);
  }
}

@Controller('blocks')
@UseGuards(AuthGuard)
export class BlocksController {
  constructor(private readonly safety: SafetyService) {}

  @Post()
  create(@User('id') userId: string, @Body() dto: CreateBlockDto) {
    return this.safety.block(userId, dto.targetProfileId);
  }

  @Get()
  list(@User('id') userId: string) {
    return this.safety.listBlocks(userId);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@User('id') userId: string, @Param('id') id: string) {
    await this.safety.unblock(userId, id);
  }
}
