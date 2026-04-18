import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Clinic } from '../auth/decorators/clinic.decorator';
import { MongoIdValidationPipe } from '../common/pipes/mongo-id-validation.pipe';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SendReminderDto } from './dto/send-reminder.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('pending')
  getPendingPayments(
    @Clinic() clinicId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.paymentsService.getPendingPayments(clinicId, paginationDto);
  }

  @Post(':invoiceId/remind-email')
  sendEmailReminder(
    @Clinic() clinicId: string,
    @Param('invoiceId', MongoIdValidationPipe) invoiceId: string,
    @Body() dto: SendReminderDto,
  ) {
    return this.paymentsService.sendEmailReminder(
      clinicId,
      invoiceId,
      dto.message,
    );
  }

  @Post(':invoiceId/remind-whatsapp')
  sendWhatsappReminder(
    @Clinic() clinicId: string,
    @Param('invoiceId', MongoIdValidationPipe) invoiceId: string,
  ) {
    return this.paymentsService.sendWhatsappReminder(clinicId, invoiceId);
  }

  @Patch(':invoiceId/mark-paid')
  markAsPaid(
    @Clinic() clinicId: string,
    @Param('invoiceId', MongoIdValidationPipe) invoiceId: string,
  ) {
    return this.paymentsService.markAsPaid(clinicId, invoiceId);
  }
}
