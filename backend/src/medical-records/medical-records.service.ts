import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MedicalRecord } from './schemas/medical-record.schema';
import { Patient } from '../patients/schemas/patient.schema';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';

@Injectable()
export class MedicalRecordsService {
  constructor(
    @InjectModel(MedicalRecord.name)
    private medicalRecordModel: Model<MedicalRecord>,
    @InjectModel(Patient.name)
    private patientModel: Model<Patient>,
  ) {}

  async create(
    clinicId: string,
    patientId: string,
    dto: CreateMedicalRecordDto,
  ): Promise<MedicalRecord> {
    const patient = await this.patientModel.findOne({
      _id: patientId,
      clinicId,
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const existing = await this.medicalRecordModel.findOne({
      clinicId,
      patientId,
    });
    if (existing) {
      throw new ConflictException(
        'Medical record already exists for this patient',
      );
    }

    const record = new this.medicalRecordModel({
      clinicId,
      patientId,
      ...dto,
    });
    return record.save();
  }

  async findByPatient(
    clinicId: string,
    patientId: string,
  ): Promise<MedicalRecord> {
    const record = await this.medicalRecordModel.findOne({
      clinicId,
      patientId,
    });
    if (!record) {
      throw new NotFoundException('Medical record not found');
    }
    return record;
  }

  async update(
    clinicId: string,
    patientId: string,
    dto: UpdateMedicalRecordDto,
  ): Promise<MedicalRecord> {
    const record = await this.medicalRecordModel.findOneAndUpdate(
      { clinicId, patientId },
      { $set: dto },
      { new: true },
    );
    if (!record) {
      throw new NotFoundException('Medical record not found');
    }
    return record;
  }

  async remove(clinicId: string, patientId: string) {
    const record = await this.medicalRecordModel.findOneAndUpdate(
      { clinicId, patientId },
      { $set: { isActive: false } },
      { new: true },
    );
    if (!record) throw new NotFoundException('Medical record not found');
    return record;
  }
}
