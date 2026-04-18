import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Clinic } from '../auth/decorators/clinic.decorator';
import { MongoIdValidationPipe } from '../common/pipes/mongo-id-validation.pipe';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  findAll(@Clinic() clinicId: string) {
    return this.alertsService.findAll(clinicId);
  }

  @Get('count')
  getUnreadCount(@Clinic() clinicId: string) {
    return this.alertsService.getUnreadCount(clinicId);
  }

  @Patch(':id/read')
  markAsRead(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
  ) {
    return this.alertsService.markAsRead(clinicId, id);
  }

  @Patch(':id/dismiss')
  dismiss(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
  ) {
    return this.alertsService.dismiss(clinicId, id);
  }

  @Delete(':id')
  remove(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
  ) {
    return this.alertsService.remove(clinicId, id);
  }
}
