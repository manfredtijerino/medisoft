import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MedicalRecordsController } from './medical-records.controller';
import { MedicalRecordsService } from './medical-records.service';
import { ConsultationsController } from './consultations.controller';
import { ConsultationsService } from './consultations.service';
import {
  MedicalRecord,
  MedicalRecordSchema,
} from './schemas/medical-record.schema';
import {
  Consultation,
  ConsultationSchema,
} from './schemas/consultation.schema';
import { Patient, PatientSchema } from '../patients/schemas/patient.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MedicalRecord.name, schema: MedicalRecordSchema },
      { name: Consultation.name, schema: ConsultationSchema },
      { name: Patient.name, schema: PatientSchema },
    ]),
  ],
  controllers: [MedicalRecordsController, ConsultationsController],
  providers: [MedicalRecordsService, ConsultationsService],
  exports: [MedicalRecordsService, ConsultationsService],
})
export class MedicalRecordsModule {}
