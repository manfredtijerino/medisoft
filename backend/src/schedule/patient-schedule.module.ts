import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { Patient, PatientSchema } from '../patients/schemas/patient.schema';
import { Invoice, InvoiceSchema } from '../invoices/schemas/invoice.schema';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Patient.name, schema: PatientSchema },
      { name: Invoice.name, schema: InvoiceSchema },
    ]),
    GoogleCalendarModule,
  ],
  controllers: [ScheduleController],
  providers: [ScheduleService],
})
export class PatientScheduleModule {}
