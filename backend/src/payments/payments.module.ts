import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Invoice, InvoiceSchema } from '../invoices/schemas/invoice.schema';
import {
  ClinicSettings,
  ClinicSettingsSchema,
} from '../clinic-settings/schemas/clinic-settings.schema';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: ClinicSettings.name, schema: ClinicSettingsSchema },
    ]),
    AlertsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
