import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { FormTemplatesController } from './form-templates.controller';
import { FormTemplatesService } from './form-templates.service';
import { Patient, PatientSchema } from './schemas/patient.schema';
import {
  PatientFormTemplate,
  PatientFormTemplateSchema,
} from './schemas/patient-form-template.schema';
import { Invoice, InvoiceSchema } from '../invoices/schemas/invoice.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Patient.name, schema: PatientSchema },
      { name: PatientFormTemplate.name, schema: PatientFormTemplateSchema },
      { name: Invoice.name, schema: InvoiceSchema },
    ]),
  ],
  controllers: [PatientsController, FormTemplatesController],
  providers: [PatientsService, FormTemplatesService],
  exports: [PatientsService],
})
export class PatientsModule {}
