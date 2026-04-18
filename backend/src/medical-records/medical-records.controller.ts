import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Clinic } from '../auth/decorators/clinic.decorator';
import { MongoIdValidationPipe } from '../common/pipes/mongo-id-validation.pipe';

@Controller('patients/:patientId/medical-record')
@UseGuards(JwtAuthGuard)
export class MedicalRecordsController {
  constructor(
    private readonly medicalRecordsService: MedicalRecordsService,
  ) {}

  @Post()
  create(
    @Clinic() clinicId: string,
    @Param('patientId', MongoIdValidationPipe) patientId: string,
    @Body() dto: CreateMedicalRecordDto,
  ) {
    return this.medicalRecordsService.create(clinicId, patientId, dto);
  }

  @Get()
  findByPatient(
    @Clinic() clinicId: string,
    @Param('patientId', MongoIdValidationPipe) patientId: string,
  ) {
    return this.medicalRecordsService.findByPatient(clinicId, patientId);
  }

  @Patch()
  update(
    @Clinic() clinicId: string,
    @Param('patientId', MongoIdValidationPipe) patientId: string,
    @Body() dto: UpdateMedicalRecordDto,
  ) {
    return this.medicalRecordsService.update(clinicId, patientId, dto);
  }

  @Delete()
  remove(
    @Clinic() clinicId: string,
    @Param('patientId', MongoIdValidationPipe) patientId: string,
  ) {
    return this.medicalRecordsService.remove(clinicId, patientId);
  }
}
