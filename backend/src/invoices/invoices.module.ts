import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoiceEmailService } from './invoice-email.service';
import { InvoiceWhatsappService } from './invoice-whatsapp.service';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { PatientsModule } from '../patients/patients.module';
import { ProductsModule } from '../products/products.module';
import { HaciendaModule } from '../hacienda/hacienda.module';
import { ClinicSettingsModule } from '../clinic-settings/clinic-settings.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
    ]),
    ScheduleModule.forRoot(),
    PatientsModule,
    ProductsModule,
    HaciendaModule,
    ClinicSettingsModule,
  ],
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    InvoicePdfService,
    InvoiceEmailService,
    InvoiceWhatsappService,
  ],
  exports: [InvoicesService],
})
export class InvoicesModule {}
