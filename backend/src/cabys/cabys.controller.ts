import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CabysService } from './cabys.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('cabys')
@UseGuards(JwtAuthGuard)
export class CabysController {
  constructor(private readonly cabysService: CabysService) {}

  @Get('search')
  search(
    @Query('q') query: string,
    @Query('top') top?: string,
  ) {
    const topNum = top ? parseInt(top, 10) : 10;
    return this.cabysService.search(query || '', topNum);
  }

  @Get(':code')
  findByCode(@Param('code') code: string) {
    return this.cabysService.findByCode(code);
  }
}
