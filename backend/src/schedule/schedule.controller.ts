import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Clinic } from '../auth/decorators/clinic.decorator';

@Controller('schedule')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('today')
  getToday(@Request() req: any, @Clinic() clinicId: string) {
    return this.scheduleService.getToday(req.user.userId, clinicId);
  }

  @Get('tomorrow')
  getTomorrow(@Request() req: any, @Clinic() clinicId: string) {
    return this.scheduleService.getTomorrow(req.user.userId, clinicId);
  }

  @Get('date/:date')
  getByDate(
    @Request() req: any,
    @Clinic() clinicId: string,
    @Param('date') date: string,
  ) {
    return this.scheduleService.getSchedule(req.user.userId, clinicId, date);
  }
}
